import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger("eiip-nats")
logging.basicConfig(level=logging.INFO)

# Try to import nats client; provide a mock fallback if not installed
try:
    import nats
    from nats.js import JetStreamContext
    NATS_AVAILABLE = True
except ImportError:
    NATS_AVAILABLE = False
    logger.warning("NATS python client ('nats-py') not installed. Operating in LOGGING-FALLBACK mode.")

class NatsManager:
    def __init__(self, servers: str = "nats://localhost:4222"):
        self.servers = servers
        self.nc = None
        self.js = None
        self.connected = False

    async def connect(self):
        if not NATS_AVAILABLE:
            return
        
        try:
            logger.info(f"Connecting to NATS cluster at {self.servers}...")
            self.nc = await nats.connect(
                servers=[self.servers],
                reconnect_time_wait=2,
                max_reconnect_attempts=5
            )
            self.js = self.nc.jetstream()
            self.connected = True
            logger.info("Successfully connected to NATS and initialized JetStream Context.")
        except Exception as e:
            self.connected = False
            logger.error(f"Failed to connect to NATS server: {e}. Event publishing will fall back to local log streams.")

    async def close(self):
        if self.nc and self.connected:
            await self.nc.close()
            self.connected = False
            logger.info("NATS client connection closed.")

    async def publish_cloudevent(self, event_type: str, subject: str, source: str, data: Dict[str, Any]):
        """
        Publishes a CloudEvents 1.0 compliant JSON payload to a NATS JetStream topic.
        """
        event_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Enforce CloudEvents 1.0 Envelope structure
        envelope = {
            "specversion": "1.0",
            "id": event_id,
            "source": source,
            "type": event_type,
            "subject": subject,
            "time": timestamp,
            "data": data
        }

        # Map event type to JetStream subject: eiip.<context>.<action>
        # e.g., 'DiscoveryCompleted' -> 'eiip.discovery.completed'
        topic_suffix = event_type.lower().replace("completed", ".completed").replace("created", ".created")
        topic = f"eiip.{topic_suffix}"

        payload_bytes = json.dumps(envelope).encode('utf-8')

        if self.connected and self.js:
            try:
                # Publish to NATS JetStream
                ack = await self.js.publish(topic, payload_bytes)
                logger.info(f"Published CloudEvent '{event_type}' [{event_id}] on '{topic}'. Stream ack: {ack}")
            except Exception as e:
                logger.error(f"NATS JetStream publish failed: {e}. Logging event data: {envelope}")
        else:
            # Fallback local logger
            logger.info(f"[TELEMETRY LOG STREAM] [MOCK NATS PUBLISH on '{topic}']: {json.dumps(envelope, indent=2)}")

        return envelope
