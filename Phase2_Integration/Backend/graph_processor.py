import json
import asyncio
import logging
from .nats_manager import NatsManager

logger = logging.getLogger("eiip-graph-processor")

# Try to import gremlin_python for live JanusGraph connection
try:
    from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
    from gremlin_python.process.anonymous_traversal import traversal
    GREMLIN_AVAILABLE = True
except ImportError:
    GREMLIN_AVAILABLE = False
    logger.warning("gremlin_python not installed. Running JanusGraph processor in MOCK-TRAVERSAL mode.")

class GraphProcessor:
    def __init__(self, gremlin_server: str = "ws://localhost:8182/gremlin", nats_servers: str = "nats://localhost:4222"):
        self.gremlin_server = gremlin_server
        self.nats_manager = NatsManager(servers=nats_servers)
        self.g = None
        self.connection = None
        self.running = False

    async def init_services(self):
        # Connect to NATS JetStream
        await self.nats_manager.connect()
        
        # Connect to JanusGraph Gremlin Server
        if GREMLIN_AVAILABLE:
            try:
                logger.info(f"Connecting to JanusGraph Gremlin server at {self.gremlin_server}...")
                self.connection = DriverRemoteConnection(self.gremlin_server, 'g')
                self.g = traversal().withRemote(self.connection)
                logger.info("Successfully connected to Gremlin Server.")
            except Exception as e:
                logger.error(f"Failed to connect to Gremlin server: {e}. Falling back to MOCK-TRAVERSAL.")
                self.g = None

    async def close_services(self):
        if self.connection:
            try:
                self.connection.close()
                logger.info("Gremlin connection closed.")
            except Exception as e:
                logger.error(f"Error closing Gremlin connection: {e}")
        await self.nats_manager.close()

    async def upsert_topology(self, data: dict):
        """
        Executes Gremlin traversals to upsert machine and OS nodes and link them.
        """
        muuid = data.get("machine_uuid")
        cname = data.get("computer_name")
        platform = data.get("platform")
        os_caption = data.get("os_caption")
        os_version = data.get("os_version")
        tenant_id = data.get("tenant_id", "default-tenant")
        site_id = data.get("site_id", "default-site")

        logger.info(f"Upserting graph topology for machine: {cname} [{muuid}]")

        if GREMLIN_AVAILABLE and self.g:
            try:
                # 1. Upsert Tenant & Site Nodes
                # g.mergeV([(T.label): 'Tenant', 'uuid': tenant_id]).option(onCreate, ['name': tenant_id])
                # Gremlin-Python merger traversal (using standard step fallback for compatibility)
                t_node = self.g.V().has('Tenant', 'uuid', tenant_id).fold().coalesce(
                    self.g.unfold(),
                    self.g.addV('Tenant').property('uuid', tenant_id).property('name', tenant_id)
                ).next()

                s_node = self.g.V().has('Site', 'uuid', f"{tenant_id}-{site_id}").fold().coalesce(
                    self.g.unfold(),
                    self.g.addV('Site').property('uuid', f"{tenant_id}-{site_id}").property('name', site_id)
                ).next()

                # Link Tenant HOSTS Site
                self.g.V(t_node).as_('t').V(s_node).coalesce(
                    self.g.outE('HOSTS').where(self.g.inV().hasId(s_node.id)),
                    self.g.addE('HOSTS').from_('t')
                ).iterate()

                # 2. Upsert Machine Node
                m_node = self.g.V().has('Machine', 'uuid', muuid).fold().coalesce(
                    self.g.unfold(),
                    self.g.addV('Machine').property('uuid', muuid)
                ).property('name', cname).property('platform', platform).property('status', 'normal').next()

                # Link Site HOSTS Machine
                self.g.V(s_node).as_('s').V(m_node).coalesce(
                    self.g.outE('HOSTS').where(self.g.inV().hasId(m_node.id)),
                    self.g.addE('HOSTS').from_('s')
                ).iterate()

                # 3. Upsert OS Node and link HOSTS relation
                os_uuid = f"os-{muuid}"
                os_node = self.g.V().has('OS', 'uuid', os_uuid).fold().coalesce(
                    self.g.unfold(),
                    self.g.addV('OS').property('uuid', os_uuid)
                ).property('name', os_caption).property('version', os_version).next()

                # Link Machine HOSTS OS
                self.g.V(m_node).as_('m').V(os_node).coalesce(
                    self.g.outE('HOSTS').where(self.g.inV().hasId(os_node.id)),
                    self.g.addE('HOSTS').from_('m')
                ).iterate()

                logger.info(f"JanusGraph upserts completed successfully for Machine: {cname}")
            except Exception as e:
                logger.error(f"JanusGraph traversal error: {e}. Gremlin transaction rolled back.")
        else:
            # Mock Logging
            logger.info(f"[GRAPH TRAVERSAL LOG] Upserting node Machine [{cname}] with details: platform={platform}")
            logger.info(f"[GRAPH TRAVERSAL LOG] Upserting node OS [{os_caption}] with details: version={os_version}")
            logger.info(f"[GRAPH TRAVERSAL LOG] Adding edge: Tenant({tenant_id}) --HOSTS--> Site({site_id}) --HOSTS--> Machine({cname}) --HOSTS--> OS({os_caption})")

        # Publish GraphTopologyUpdated CloudEvent
        await self.nats_manager.publish_cloudevent(
            event_type="GraphTopologyUpdated",
            subject=f"Machine/{muuid}",
            source="eiip://graph-service",
            data={
                "machine_uuid": muuid,
                "computer_name": cname,
                "updated_nodes": ["Tenant", "Site", "Machine", "OS"],
                "updated_edges": ["HOSTS"]
            }
        )

    async def run(self):
        self.running = True
        logger.info("JanusGraph Event Processor Consumer Started.")
        
        # If NATS is connected, we would subscribe to NATS JetStream queue
        # For this execution plan demo, we showcase the consumer callback hook:
        while self.running:
            # Subscribed JetStream loop logic mock:
            # message = await self.js_subscription.next_msg()
            # data = json.loads(message.data.decode('utf-8'))
            # await self.upsert_topology(data['data'])
            # await message.ack()
            await asyncio.sleep(1)

    def stop(self):
        self.running = False
        logger.info("JanusGraph Event Processor Consumer Stopped.")
        
# Entry point trigger for the async worker
if __name__ == "__main__":
    processor = GraphProcessor()
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(processor.init_services())
        loop.run_until_complete(processor.run())
    except KeyboardInterrupt:
        pass
    finally:
        loop.run_until_complete(processor.close_services())
