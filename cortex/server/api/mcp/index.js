
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { memoryStore } from "../../../../src/services/memoryStore.js"; 

/**
 * TRUSTGRAPH: LEVERAGING CONTEXT FOR TRUST
 * This server exposes Luca's internal Memory & Graph state to authenticated peers.
 */

const server = new Server(
  {
    name: "luca-context-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * RESOURCE: Expose System State
 * URI: luca://state/system
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            {
                uri: "luca://state/system",
                name: "System State",
                mimeType: "application/json",
                description: "Current snapshot of Luca's memory statistics and graph health"
            },
            {
                uri: "luca://graph/edges/recent",
                name: "Recent Graph Edges",
                mimeType: "application/json",
                description: "The last 50 temporal connections made in the graph"
            }
        ]
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "luca://state/system") {
        const stats = memoryStore.getStats ? memoryStore.getStats() : { error: "Stats not implemented" };
        const graph = memoryStore.getGraph();
        return {
            contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify({
                    nodeCount: graph.nodes.length,
                    edgeCount: graph.edges.length,
                    stats: stats,
                    timestamp: Date.now(),
                    status: "ONLINE"
                }, null, 2)
            }]
        };
    }
    
    if (request.params.uri === "luca://graph/edges/recent") {
        const graph = memoryStore.getGraph();
        // Assuming edges have created_at, sort by it
        const edges = graph.edges
            .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
            .slice(0, 50);

        return {
            contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(edges, null, 2)
            }]
        };
    }

    throw new Error("Resource not found");
});

/**
 * TOOL: Query Memory
 * Allows external agents to ask semantic questions about Luca's knowledge.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_memory",
        description: "Search Luca's internal knowledge graph and semantic memory",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The question or topic to search for",
            },
            limit: {
                type: "number",
                description: "Max results to return (default 5)"
            }
          },
          required: ["query"],
        },
      },
      {
        name: "get_execution_trace",
        description: "Retrieve the recent chain of thought/tools executed by Luca",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Number of events"}
            }
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query_memory") {
    const { query, limit = 5 } = request.params.arguments;
    // Use memoryStore vector search (simulated or real)
    // Since memoryStore.searchByVector needs an embedding, and we don't have an embedder here easily (it's in frontend service),
    // we will fall back to exact keyword match or full graph scan for now, 
    // OR we expose a text-based search in memoryStore if available. 
    // memoryStore has getGraph() and getAllMemories().
    
    // Fix: memoryStore API uses getAll(), not getAllMemories()
    const all = memoryStore.getAll();
    const results = all.filter(m => 
        m.value.toLowerCase().includes(query.toLowerCase()) || 
        m.key.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "get_execution_trace") {
      const { limit = 10 } = request.params.arguments || {};
      const graph = memoryStore.getGraph();
      
      // Filter for nodes of type 'EVENT' and edges relating to them
      const events = graph.nodes.filter(n => n.type === 'EVENT');
      // Sort if we can parse the timestamp from the ID or body 
      // (Event ID format: evt_TIMESTAMP_RANDOM)
      const sortedEvents = events.sort((a,b) => {
          const tA = parseInt(a.name.split('_')[1] || '0');
          const tB = parseInt(b.name.split('_')[1] || '0');
          return tB - tA;
      }).slice(0, limit);

      return {
          content: [{
              type: "text",
              text: JSON.stringify(sortedEvents, null, 2)
          }]
      }
  }

  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
