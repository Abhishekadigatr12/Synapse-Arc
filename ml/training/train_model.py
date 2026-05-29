from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_system_metrics(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f'Missing training dataset: {path}')

    frame = pd.read_csv(path)
    expected = ['timestamp', 'node_id', 'cpu', 'memory', 'disk', 'network']
    missing = [column for column in expected if column not in frame.columns]
    if missing:
        raise ValueError(f'System dataset missing columns: {missing}')
    return frame


def _load_process_load(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame(columns=['timestamp', 'node_id', 'process_load'])

    frame = pd.read_csv(path)
    if frame.empty or not {'timestamp', 'node_id', 'cpu'}.issubset(frame.columns):
        return pd.DataFrame(columns=['timestamp', 'node_id', 'process_load'])

    grouped = (
        frame.groupby(['timestamp', 'node_id'], as_index=False)['cpu']
        .sum()
        .rename(columns={'cpu': 'process_load'})
    )
    return grouped


def build_training_frame() -> pd.DataFrame:
    datasets_root = repo_root() / 'datasets' / 'generated'
    system_path = datasets_root / 'system_metrics.csv'
    process_path = datasets_root / 'process_metrics.csv'

    system_frame = _load_system_metrics(system_path)
    process_load_frame = _load_process_load(process_path)

    merged = system_frame.merge(process_load_frame, on=['timestamp', 'node_id'], how='left')
    merged['process_load'] = merged['process_load'].fillna(0.0)

    for column in ['cpu', 'memory', 'disk', 'network', 'process_load']:
        merged[column] = pd.to_numeric(merged[column], errors='coerce').fillna(0.0)

    return merged[['cpu', 'memory', 'disk', 'network', 'process_load']]


def train_model(output_path: Path | None = None) -> Path:
    features = build_training_frame()
    if len(features) < 10:
        raise ValueError('Not enough generated telemetry rows to train a baseline model')

    contamination = min(0.15, max(0.02, round(1.0 / max(len(features), 50), 3)))
    model = Pipeline(
        [
            ('scaler', StandardScaler()),
            ('isolation_forest', IsolationForest(n_estimators=200, contamination=contamination, random_state=42)),
        ]
    )
    model.fit(features)

    output_path = output_path or (repo_root() / 'ml' / 'models' / 'anomaly_model.pkl')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    return output_path


if __name__ == '__main__':
    saved_path = train_model()
    print(f'Model saved to {saved_path}')
