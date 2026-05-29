from __future__ import annotations

from typing import Sequence

import numpy as np
from sklearn.ensemble import IsolationForest


class IsolationForestDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.is_trained = False

    def train(self, history: Sequence[dict]) -> None:
        if len(history) < 8:
            self.is_trained = False
            return

        features = np.array(
            [
                [
                    float(row.get('cpu', 0) or 0),
                    float(row.get('memory', 0) or 0),
                    float(row.get('disk', 0) or 0),
                    float(row.get('network', 0) or 0),
                    float(row.get('temp', 0) or 0),
                ]
                for row in history
            ]
        )
        self.model.fit(features)
        self.is_trained = True

    def score(self, current_metric: dict) -> float:
        if not self.is_trained:
            return 0.0

        sample = np.array(
            [[
                float(current_metric.get('cpu', 0) or 0),
                float(current_metric.get('memory', 0) or 0),
                float(current_metric.get('disk', 0) or 0),
                float(current_metric.get('network', 0) or 0),
                float(current_metric.get('temp', 0) or 0),
            ]]
        )
        return 0.25 if self.model.predict(sample)[0] == -1 else 0.0
