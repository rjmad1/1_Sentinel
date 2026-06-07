// JanusGraph Groovy schema provisioning script
// Runs inside the Gremlin Console / Server container to initialize database constraints.

def configureSchema(graph) {
    mgmt = graph.openManagement()
    
    // 1. Define Property Keys
    logger.info("Defining property keys...")
    if (!mgmt.containsPropertyKey("uuid")) {
        mgmt.makePropertyKey("uuid").dataType(String.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("name")) {
        mgmt.makePropertyKey("name").dataType(String.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("status")) {
        mgmt.makePropertyKey("status").dataType(String.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("type")) {
        mgmt.makePropertyKey("type").dataType(String.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("version")) {
        mgmt.makePropertyKey("version").dataType(String.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("port_number")) {
        mgmt.makePropertyKey("port_number").dataType(Integer.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("severity")) {
        mgmt.makePropertyKey("severity").dataType(String.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("health_score")) {
        mgmt.makePropertyKey("health_score").dataType(Double.class).cardinality(Cardinality.SINGLE).make()
    }
    if (!mgmt.containsPropertyKey("timestamp")) {
        mgmt.makePropertyKey("timestamp").dataType(String.class).cardinality(Cardinality.SINGLE).make()
    }

    // 2. Define Vertex Labels
    logger.info("Defining vertex labels...")
    def vertexLabels = [
        "Tenant", "Site", "Machine", "Hardware", "OS", 
        "Application", "Service", "Process", "Container", 
        "Port", "Database", "Storage", "Network", "User", 
        "Finding", "Risk", "Forecast", "Remediation"
    ]
    for (label in vertexLabels) {
        if (!mgmt.containsVertexLabel(label)) {
            mgmt.makeVertexLabel(label).make()
        }
    }

    // 3. Define Edge Labels
    logger.info("Defining edge labels...")
    def edgeLabels = [
        "HOSTS", "RUNS", "DEPENDS_ON", "USES", "CONNECTS_TO", 
        "LISTENS_ON", "EXPOSES", "PRODUCES", "CONSUMES", 
        "AFFECTS", "MITIGATES"
    ]
    for (label in edgeLabels) {
        if (!mgmt.containsEdgeLabel(label)) {
            mgmt.makeEdgeLabel(label).directed().make()
        }
    }

    // 4. Define Indexes
    logger.info("Creating composite and mixed indexes...")
    uuidKey = mgmt.getPropertyKey("uuid")
    nameKey = mgmt.getPropertyKey("name")
    statusKey = mgmt.getPropertyKey("status")

    // Composite index on unique UUID for O(1) direct lookups
    if (!mgmt.containsGraphIndex("byUuidUnique")) {
        mgmt.buildIndex("byUuidUnique", Vertex.class).addKey(uuidKey).unique().buildCompositeIndex()
    }

    // Mixed index on name and status using Elasticsearch backend for text searches
    if (!mgmt.containsGraphIndex("mixedSearch")) {
        mgmt.buildIndex("mixedSearch", Vertex.class)
            .addKey(nameKey, Mapping.TEXTSTRING.asParameter())
            .addKey(statusKey, Mapping.STRING.asParameter())
            .buildMixedIndex("search")
    }

    mgmt.commit()
    logger.info("JanusGraph schema configuration committed successfully.")
}

// Execute the schema setup using the bounded graph instance
configureSchema(graph)
