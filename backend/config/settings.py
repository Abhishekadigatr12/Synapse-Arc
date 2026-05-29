import os


class Settings:
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./synapse_arc.db')
    MODEL_VERSION = os.getenv('MODEL_VERSION', 'v2.4')
    CLUSTER_NODES = int(os.getenv('CLUSTER_NODES', '12'))
    ENCLAVES_ACTIVE = int(os.getenv('ENCLAVES_ACTIVE', '12'))
    HEARTBEAT_INTERVAL = int(os.getenv('HEARTBEAT_INTERVAL', '5'))
    APP_NAME = os.getenv('APP_NAME', 'SYNAPSE-ARC')
    AI_COMMANDER = os.getenv('AI_COMMANDER', 'AI Commander')


settings = Settings()
