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

# Define lifespan event handler to manage async resources
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Enterprise Backend Server Lifespan...")
    
    # Connect to PostgreSQL
    await postgres_db.connect()
    app.state.db = postgres_db
    
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
        "docs_url": "/docs"
    }

