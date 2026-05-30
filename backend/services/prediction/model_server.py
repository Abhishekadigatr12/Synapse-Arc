from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

_MODEL = None
_MODEL_PATH = None
_MODEL_MTIME = None


def _repo_root() -> Path:
    # backend/services/prediction -> parents[3] == repo root
    return Path(__file__).resolve().parents[3]


def default_model_path() -> Path:
    return _repo_root() / 'ml' / 'models' / 'anomaly_model.pkl'


def legacy_model_path() -> Path:
    return _repo_root() / 'ml_models' / 'isolation_forest_v1.joblib'


def load_model(path: str | Path | None = None):
    global _MODEL, _MODEL_PATH, _MODEL_MTIME
    target = Path(path) if path is not None else default_model_path()
    if not target.exists() and path is None:
        target = legacy_model_path()

    current_mtime = target.stat().st_mtime if target.exists() else None
    if _MODEL is None or _MODEL_PATH != str(target) or _MODEL_MTIME != current_mtime:
        _MODEL = joblib.load(str(target))
        _MODEL_PATH = str(target)
        _MODEL_MTIME = current_mtime
    return _MODEL


def train_model_from_csv() -> bool:
    """Read system_metrics.csv and train / retrain the IsolationForest model.

    Uses features: cpu, memory, disk, network, process_load.
    temp is intentionally excluded because Windows psutil does not report it.
    Returns True on success, False on any failure.
    """
    from ..monitoring.collector import SYSTEM_DATASET

    if not SYSTEM_DATASET.exists():
        print('[model_server] CSV not found — skipping training')
        return False

    try:
        df = pd.read_csv(SYSTEM_DATASET)

        # Derive process_load if column missing (old CSV schema)
        if 'process_load' not in df.columns:
            df['process_load'] = (df['cpu'] * 0.88).round(1) if 'cpu' in df.columns else 0.0

        features = ['cpu', 'memory', 'disk', 'network', 'process_load']
        missing = [f for f in features if f not in df.columns]
        if missing:
            print(f'[model_server] Missing columns {missing} — skipping training')
            return False

        X = df[features].apply(pd.to_numeric, errors='coerce').fillna(0)
        print(f'[model_server] Training on {len(X)} rows, features={features}')

        # Ensure at least 20 samples so IsolationForest fits properly
        if len(X) < 20:
            repeats = max(1, 20 // len(X)) + 1
            X = pd.concat([X] * repeats, ignore_index=True)

        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('clf', IsolationForest(n_estimators=100, contamination=0.08, random_state=42)),
        ])
        pipeline.fit(X)

        target = default_model_path()
        target.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipeline, str(target))
        print(f'[model_server] Model saved to {target}')

        # Bust the in-memory model cache
        global _MODEL, _MODEL_PATH, _MODEL_MTIME
        _MODEL = None
        _MODEL_PATH = None
        _MODEL_MTIME = None
        load_model()
        return True

    except Exception as exc:
        print(f'[model_server] Training failed: {exc}')
        return False



def predict(payload: Any):
    """Accept a dict (single row) or list of dicts with keys: cpu,memory,disk,network,process_load.
    Returns predictions as list of 0 (inlier) or 1 (anomaly).
    """
    model = load_model()
    if isinstance(payload, dict):
        df = pd.DataFrame([payload])
    else:
        df = pd.DataFrame(payload)

    # ensure feature order
    features = ['cpu', 'memory', 'disk', 'network', 'process_load']
    missing = [f for f in features if f not in df.columns]
    if missing:
        raise ValueError(f'Missing features: {missing}')

    X = df[features]
    # Pipeline contains scaler + IsolationForest; use pipeline.predict
    raw = model.predict(X)
    # map 1 -> 0 (normal), -1 -> 1 (anomaly)
    mapped = [0 if int(x) == 1 else 1 for x in raw]
    if len(mapped) == 1:
        return mapped[0]
    return mapped
