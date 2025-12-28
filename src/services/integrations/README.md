# Luca Native Integrations ("Vampire Tools")

This directory contains "ingested" MCP tools converted into native Luca plugins.

## Structure

Each integration should be a folder containing:

- `index.ts`: The main entry point.
- `definition.ts`: The Tool Definition (JSON Schema) for the LLM.

## Format

A valid plugin MUST export:

1. `tools`: An array of `FunctionDeclaration` objects.
2. `handler`: A function `async (toolName, args) => result`.

## Example (Postgres)

```typescript
// definition.ts
export const queryTool = {
  name: "postgres_query",
  description: "Run a SQL query",
  parameters: { ... }
};

// index.ts
import { queryTool } from './definition';
import { CredentialVault } from '../../CredentialVault';

export const tools = [queryTool];

export async function handler(toolName, args) {
  if (toolName === 'postgres_query') {
    // Native logic here
    return { result: ... };
  }
}
```
