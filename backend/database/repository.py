from __future__ import annotations

from typing import Iterable, Sequence

from sqlalchemy.orm import Session

from .schema import ActionRecord, AlertRecord, AnomalyRecord, PredictionRecord, ProcessMetric, SystemMetric


def add_system_metric(session: Session, metric: dict) -> SystemMetric:
    row = SystemMetric(**metric)
    session.add(row)
    session.flush()
    return row


def add_process_metrics(session: Session, system_id: int, processes: Sequence[dict]) -> None:
    for process in processes:
        session.add(
            ProcessMetric(
                system_id=system_id,
                pid=int(process.get('pid', 0) or 0),
                name=str(process.get('name', 'unknown')),
                cpu=float(process.get('cpu', 0) or 0),
                memory=float(process.get('memory', 0) or 0),
                threads=int(process.get('threads', 0) or 0),
                open_files=int(process.get('open_files', 0) or 0),
            )
        )


def add_anomaly(session: Session, payload: dict) -> AnomalyRecord:
    row = AnomalyRecord(**payload)
    session.add(row)
    session.flush()
    return row


def add_prediction(session: Session, payload: dict) -> PredictionRecord:
    row = PredictionRecord(**payload)
    session.add(row)
    session.flush()
    return row


def add_action(session: Session, payload: dict) -> ActionRecord:
    row = ActionRecord(**payload)
    session.add(row)
    session.flush()
    return row


def add_alert(session: Session, payload: dict) -> AlertRecord:
    row = AlertRecord(**payload)
    session.add(row)
    session.flush()
    return row


def recent_system_metrics(session: Session, limit: int = 24, host: str | None = None) -> list[SystemMetric]:
    query = session.query(SystemMetric)
    if host:
        query = query.filter(SystemMetric.host == host)
    return query.order_by(SystemMetric.id.desc()).limit(limit).all()[::-1]


def recent_process_metrics(session: Session, system_id: int | None = None, limit: int = 10) -> list[ProcessMetric]:
    query = session.query(ProcessMetric)
    if system_id is not None:
        query = query.filter(ProcessMetric.system_id == system_id)
    return query.order_by(ProcessMetric.id.desc()).limit(limit).all()[::-1]


def recent_alerts(session: Session, limit: int = 10) -> list[AlertRecord]:
    return session.query(AlertRecord).order_by(AlertRecord.id.desc()).limit(limit).all()[::-1]


def recent_predictions(session: Session, limit: int = 10) -> list[PredictionRecord]:
    return session.query(PredictionRecord).order_by(PredictionRecord.id.desc()).limit(limit).all()[::-1]


def recent_actions(session: Session, limit: int = 10) -> list[ActionRecord]:
    return session.query(ActionRecord).order_by(ActionRecord.id.desc()).limit(limit).all()[::-1]


def recent_anomalies(session: Session, limit: int = 10) -> list[AnomalyRecord]:
    return session.query(AnomalyRecord).order_by(AnomalyRecord.id.desc()).limit(limit).all()[::-1]
