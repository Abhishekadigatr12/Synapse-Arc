from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

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
