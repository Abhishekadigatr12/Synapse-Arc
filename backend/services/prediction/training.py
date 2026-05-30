from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = ['cpu', 'memory', 'disk', 'network', 'process_load']


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _model_path() -> Path:
    return _repo_root() / 'ml' / 'models' / 'anomaly_model.pkl'


def _system_dataset() -> Path:
    return _repo_root() / 'datasets' / 'generated' / 'system_metrics.csv'


def _process_dataset() -> Path:
    return _repo_root() / 'datasets' / 'generated' / 'process_metrics.csv'


def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists() or path.stat().st_size == 0:
        return pd.DataFrame()
    return pd.read_csv(path)


def _process_loads(process_rows: pd.DataFrame) -> pd.DataFrame:
    if process_rows.empty or not {'timestamp', 'node_id', 'cpu'}.issubset(process_rows.columns):
        return pd.DataFrame(columns=['timestamp', 'node_id', 'process_load'])

    rows = process_rows.copy()
    rows['cpu'] = pd.to_numeric(rows['cpu'], errors='coerce').fillna(0.0)
    grouped = rows.groupby(['timestamp', 'node_id'], as_index=False)['cpu'].sum()
    grouped['process_load'] = grouped['cpu'].clip(lower=0, upper=100)
    return grouped[['timestamp', 'node_id', 'process_load']]


def _normal_training_frame() -> pd.DataFrame:
    system_rows = _read_csv(_system_dataset())
    if system_rows.empty:
        return pd.DataFrame(columns=FEATURES)

    rows = system_rows.copy()
    for column in ['cpu', 'memory', 'disk', 'network']:
        rows[column] = pd.to_numeric(rows.get(column, 0), errors='coerce').fillna(0.0)

    process_loads = _process_loads(_read_csv(_process_dataset()))
    if not process_loads.empty and {'timestamp', 'node_id'}.issubset(rows.columns):
        rows = rows.merge(process_loads, how='left', on=['timestamp', 'node_id'])
    else:
        rows['process_load'] = 0.0

    rows['process_load'] = pd.to_numeric(rows.get('process_load', 0), errors='coerce').fillna(0.0)

    normal_rows = rows[
        (rows['cpu'] < 85)
        & (rows['memory'] < 90)
        & (rows['disk'] < 95)
        & (rows['process_load'] < 95)
    ][FEATURES]

    return normal_rows.dropna()


def _pad_training_rows(rows: pd.DataFrame, minimum: int = 12) -> pd.DataFrame:
    if len(rows) >= minimum:
        return rows
    if rows.empty:
        rows = pd.DataFrame([[25.0, 45.0, 45.0, 1000.0, 10.0]], columns=FEATURES)

    rng = np.random.default_rng(42)
    base = rows[FEATURES].median().to_numpy(dtype=float)
    synthetic: list[np.ndarray[Any, Any]] = []
    while len(rows) + len(synthetic) < minimum:
        noise = rng.normal(loc=0.0, scale=[4.0, 3.0, 2.0, max(10.0, base[3] * 0.03), 3.0])
        synthetic.append(np.maximum(base + noise, 0.0))

    padded = pd.concat([rows, pd.DataFrame(synthetic, columns=FEATURES)], ignore_index=True)
    return padded[FEATURES]


def train_baseline_model() -> dict[str, Any]:
    training_rows = _pad_training_rows(_normal_training_frame())
    model = Pipeline(
        steps=[
            ('scaler', StandardScaler()),
            ('isolation_forest', IsolationForest(contamination=0.08, random_state=42)),
        ]
    )
    model.fit(training_rows[FEATURES])

    target = _model_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, target)

    return {
        'status': 'trained',
        'model_path': str(target),
        'rows': int(len(training_rows)),
        'features': FEATURES,
        'baseline': {
            key: round(float(value), 2)
            for key, value in training_rows[FEATURES].median().to_dict().items()
        },
    }
