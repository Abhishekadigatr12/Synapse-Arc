from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class SystemMetric(Base):
    __tablename__ = 'system_metrics'
    id = Column(Integer, primary_key=True)
    host = Column(String, index=True)
    cpu = Column(Float)
    memory = Column(Float)
    disk = Column(Float)
    network = Column(Float)
    temp = Column(Float, nullable=True)
    disk_read = Column(Float, default=0)
    disk_write = Column(Float, default=0)
    source = Column(String, default='local-agent')
    ts = Column(DateTime(timezone=True), server_default=func.now())


class ProcessMetric(Base):
    __tablename__ = 'process_metrics'
    id = Column(Integer, primary_key=True)
    system_id = Column(Integer, index=True)
    pid = Column(Integer, index=True)
    name = Column(String)
    cpu = Column(Float)
    memory = Column(Float)
    threads = Column(Integer, default=0)
    open_files = Column(Integer, default=0)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class Telemetry(Base):
    __tablename__ = 'telemetry'
    id = Column(Integer, primary_key=True)
    node = Column(String, index=True)
    cpu = Column(Float)
    memory = Column(Float)
    temp = Column(Float)
    packet_loss = Column(Float)
    latency = Column(Float)
    disk = Column(Float)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class AnomalyRecord(Base):
    __tablename__ = 'anomalies'
    id = Column(Integer, primary_key=True)
    host = Column(String, index=True)
    anomaly_type = Column(String)
    score = Column(Float, default=0)
    severity = Column(String, default='low')
    details = Column(JSON)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class PredictionRecord(Base):
    __tablename__ = 'predictions'
    id = Column(Integer, primary_key=True)
    resource = Column(String)
    current = Column(Float)
    predicted = Column(Float)
    time_to_threshold = Column(String)
    risk_score = Column(Float, default=0)
    details = Column(JSON)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class ActionRecord(Base):
    __tablename__ = 'actions'
    id = Column(Integer, primary_key=True)
    action = Column(String)
    target = Column(String)
    reason = Column(String)
    status = Column(String, default='simulated')
    result = Column(String)
    details = Column(JSON)
    acknowledged = Column(Boolean, default=False)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class AlertRecord(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True)
    host = Column(String, index=True)
    title = Column(String)
    message = Column(String)
    severity = Column(String, default='info')
    acknowledged = Column(Boolean, default=False)
    details = Column(JSON)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class LegacyTelemetry(SystemMetric):
    __mapper_args__ = {'concrete': False}

