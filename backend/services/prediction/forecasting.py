from __future__ import annotations

from typing import Sequence

import numpy as np
from sklearn.linear_model import LinearRegression


def forecast_series(values: Sequence[float], steps: Sequence[int] = (5, 10)) -> list[float]:
    if len(values) < 2:
        return [float(values[-1]) if values else 0.0 for _ in steps]

    x = np.arange(len(values)).reshape(-1, 1)
    y = np.array(values, dtype=float)
    model = LinearRegression()
    model.fit(x, y)
    future = np.array([[len(values) + step] for step in steps])
    prediction = model.predict(future)
    return [float(max(0.0, min(100.0, item))) for item in prediction]
