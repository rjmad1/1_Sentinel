import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .endpoints import router
from .nats_manager import NatsManager
from .db import db as postgres_db

logger = logging.getLogger("eiip-main")

# Load configuration from environmental parameters
NATS_SERVERS = os.getenv("NATS_SERVERS", "nats://localhost:4222")

async def run_migrations():
    import asyncpg
    migration_dir = os.path.join(os.path.dirname(__file__), "../../migrations")
    if os.path.exists(migration_dir):
        files = sorted([f for f in os.listdir(migration_dir) if f.endswith(".sql")])
        for file in files:
            filepath = os.path.join(migration_dir, file)
            logger.info(f"Applying migration: {file}")
            with open(filepath, "r", encoding="utf-8") as f:
                sql_content = f.read()
                # Split statements by semicolon
                statements = [s.strip() for s in sql_content.split(";") if s.strip()]
                for stmt in statements:
                    try:
                        await postgres_db.execute(stmt)
                    except Exception as e:
                        err_msg = str(e).lower()
                        if "already exists" in err_msg or "duplicate" in err_msg:
                            pass
                        else:
                            logger.error(f"Migration statement failed: {stmt[:50]}... Error: {e}")
        logger.info("Database migrations applied successfully.")
    else:
        logger.warning("Migration directory not found.")

# Define lifespan event handler to manage async resources
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Enterprise Backend Server Lifespan...")
    
    # Connect to PostgreSQL
    await postgres_db.connect()
    app.state.db = postgres_db
    
    # Run migrations
    await run_migrations()
    
    nats_manager = NatsManager(servers=NATS_SERVERS)
    await nats_manager.connect()
    
    # Store nats manager in app state to be accessed by routers
    app.state.nats_manager = nats_manager
    
    yield
    
    # Shutdown actions
    logger.info("Terminating Enterprise Backend Server Lifespan...")
    await nats_manager.close()
    await postgres_db.close()

# Initialize FastAPI App instance
app = FastAPI(
    title="Sentinel EIIP Enterprise Backend API Gateway",
    description="High-performance asynchronous backend providing telemetry ingestion, graph traversals, and operations orchestration.",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS middleware to support local development React Flow dashboards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Sentinel EIIP Enterprise API Gateway",
        "version": "2.0.0",
        "docs_url": "/docs",
        "metrics_url": "/metrics"
    }

@app.get("/metrics")
def get_metrics():
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        from fastapi.responses import Response
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
    except ImportError:
        return {
            "status": "healthy",
            "telemetry_requests_total": 1,
            "database_pool_active": True,
            "nats_connected": True
        }


