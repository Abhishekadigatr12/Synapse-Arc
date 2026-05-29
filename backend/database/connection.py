from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..config.settings import settings
from .schema import Base
import os


def get_engine(url: str = None):
    url = url or settings.DATABASE_URL
    connect_args = {}
    if url.startswith('sqlite'):
        connect_args = {"check_same_thread": False}
    engine = create_engine(url, connect_args=connect_args)
    return engine


def init_db(url: str = None):
    engine = get_engine(url)
    Base.metadata.create_all(engine)
    return engine


def get_session(engine):
    return sessionmaker(bind=engine)()
