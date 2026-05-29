from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


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
    node = Column(String, index=True)
    type = Column(String)
    details = Column(JSON)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class PredictionRecord(Base):
    __tablename__ = 'predictions'
    id = Column(Integer, primary_key=True)
    risk = Column(Float)
    affected = Column(JSON)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class ActionRecord(Base):
    __tablename__ = 'actions'
    id = Column(Integer, primary_key=True)
    action = Column(String)
    target = Column(JSON)
    result = Column(String)
    ts = Column(DateTime(timezone=True), server_default=func.now())
