import os
import logging
import asyncpg
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

logger = logging.getLogger("eiip-db")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:48c2eb0044739942911b123eb476e6fb@ba47g6qs.ap-southeast.database.insforge.app:5432/insforge?sslmode=require"
)

class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        if self.pool is not None:
            return
        try:
            logger.info("Initializing PostgreSQL database connection pool...")
            self.pool = await asyncpg.create_pool(DATABASE_URL)
            logger.info("PostgreSQL database connection pool initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to create database connection pool: {e}")
            raise e

    async def close(self):
        if self.pool:
            logger.info("Closing PostgreSQL database connection pool...")
            await self.pool.close()
            self.pool = None
            logger.info("PostgreSQL database connection pool closed.")

    async def fetch(self, query: str, *args):
        if not self.pool:
            raise RuntimeError("Database pool is not connected. Call connect() first.")
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        if not self.pool:
            raise RuntimeError("Database pool is not connected. Call connect() first.")
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def execute(self, query: str, *args):
        if not self.pool:
            raise RuntimeError("Database pool is not connected. Call connect() first.")
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetchval(self, query: str, *args):
        if not self.pool:
            raise RuntimeError("Database pool is not connected. Call connect() first.")
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)

db = Database()

