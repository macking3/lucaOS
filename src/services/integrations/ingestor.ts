import { Type, FunctionDeclaration } from "@google/genai";
import { GoogleGenerativeAI as GoogleGenAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- TOOL DEFINITION ---
export const ingestMCPServerTool: FunctionDeclaration = {
  name: "ingestMCPServer",
  description:
    "SELF-REPLICATION / INGESTION TOOL. Use this to 'learn' a new tool from a GitHub repository. It downloads the source code, analyzes the logic, and GENERATES a new Native Plugin (TypeScript) in 'services/integrations/'. This permanently gives you the capabilities of that MCP server.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      repoUrl: {
        type: Type.STRING,
        description:
          "The full GitHub URL (e.g. https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search).",
      },
      toolName: {
        type: Type.STRING,
        description:
          "The name of the tool/service to create (e.g. 'brave_search', 'filesystem', 'slack'). MUST be snake_case.",
      },
      instruction: {
        type: Type.STRING,
        description:
          "Optional specific instructions or focus (e.g., 'Only ingest the search tool, ignore local file serving').",
      },
    },
    required: ["repoUrl", "toolName"],
  },
};

// --- HANDLER (THE ALCHEMIST) ---
export async function ingestMCPServerHandler(
  args: any,
  ai: GoogleGenAI
): Promise<string> {
  const { repoUrl, toolName, instruction } = args;
  console.log(
    `[INGESTOR] Starting ingestion of ${toolName} from ${repoUrl}...`
  );

  try {
    // 1. THE SCOUT: Visual Scrape (Using Navigator Agent)
    // We bypass the API rate limits by using the "Hacker Way" (Visual Scraping via Playwright)
    // We dynamically import the navigator tool to keep it decoupled but accessible.

    // Check if Navigator exists
    const navigatorPath = path.join(__dirname, "./navigator/index.js"); // Compiled path
    // OR source path if running in ts-node context (likely .ts)
    // We will try to locate the handler. Since we are in the same process, we can even just require it if we knew the path.
    // However, let's assume the plugin structure: ../navigator/index.ts

    // For this context, we'll try to import the TS file or JS file based on environment
    let navigatorHandler;
    try {
      // @ts-ignore
      const { handler } = await import("./navigator/index.js");
      navigatorHandler = handler;
    } catch (e) {
      // Fallback for dev environment
      // @ts-ignore
      const { handler } = await import("./navigator/index.ts");
      navigatorHandler = handler;
    }

    if (!navigatorHandler)
      throw new Error("Navigator Agent (Scout) not found.");

    console.log(`[INGESTOR] Deploying Navigator Scout to: ${repoUrl}`);
    const scoutResult = await navigatorHandler("visual_scrape_github", {
      repoUrl,
      maxDepth: 3,
    });

    if (!scoutResult.success) {
      return `Scout Failed: ${scoutResult.error}`;
    }

    const codebaseContext = scoutResult.result; // Concatenated code from visual scrape

    // 2. THE ALCHEMIST: Transmute Code to Plugin
    console.log(
      `[INGESTOR] Transmuting Reference Code (${codebaseContext.length} chars) into Plugin...`
    );

    const prompt = `
    **SYSTEM REPLICATION PROTOCOL (LEVEL 10)**
    
    **OBJECTIVE**: You are the "Alchemist". Your goal is to read the provided SOURCE CODE (from an external MCP server) and TRANSMUTE it into a valid "Luca Native Plugin" (TypeScript).
    
    **INPUT**:
    - Tool Name: "${toolName}"
    - Source Logic: Attached below.
    - User Instruction: "${instruction || "Ingest the core capabilities."}"
    
    **OUTPUT REQUIREMENT**:
    - Produce a SINGLE, SELF-CONTAINED TypeScript file.
    - It MUST export a 'tools' array (FunctionDeclaration[]).
    - It MUST export a 'handler' function (async).
    - It MUST use 'import' syntax (ESM).
    - It must NOT use external MCP SDKs. Re-implement the logic using standard libraries (fetch, fs) or well-known npm packages.
    - **CRITICAL**: If the code uses a library like 'brave-search' or 'slack-web-api', try to use raw 'fetch' calls if possible to minimize dependencies, OR assume standard 'node-fetch' / 'axios' are available.
    
    **TEMPLATE TO FOLLOW**:
    \`\`\`typescript
    import { Type, FunctionDeclaration } from "@google/genai";
    // imports...
    
    export const tools: FunctionDeclaration[] = [
      {
        name: "${toolName}_action",
        description: "...",
        parameters: { ... }
      }
    ];
    
    export async function handler(name: string, args: any): Promise<any> {
      if (name === "${toolName}_action") {
         // Implementation
         return { result: "..." };
      }
      throw new Error(\`Unknown tool: \${name}\`);
    }
    \`\`\`
    
    **SOURCE CODE**:
    ${codebaseContext.substring(
      0,
      100000
    )} // Truncate if too huge to likely fit context
    `;

    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Use smartest model available
    const result = await model.generateContent(prompt);
    let generatedCode = result.response.text();

    // Clean Markdown
    generatedCode = generatedCode
      .replace(/```typescript/g, "")
      .replace(/```/g, "")
      .trim();

    // 3. THE BUILDER: Write to Disk
    const targetDir = path.join(__dirname, toolName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, "index.ts");
    fs.writeFileSync(targetFile, generatedCode);

    console.log(`[INGESTOR] Plugin written to: ${targetFile}`);

    return `SUCCESS. I have ingested the '${toolName}' capability from ${repoUrl}.\nThe plugin is saved at: services/integrations/${toolName}/index.ts.\n\nPLEASE RESTART THE SERVER to load this new brain module.`;
  } catch (error: any) {
    console.error("[INGESTOR] Failed:", error);
    return `Ingestion Failed: ${error.message}`;
  }
}
