import os


class Settings:
    REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./synapse_arc.db')


settings = Settings()
