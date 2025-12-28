/**
 * @deprecated
 * This file is deprecated. Please use `services/toolRegistry.ts` instead.
 *
 * The logic has been consolidated into the unified service-based ToolRegistry.
 */

import { ToolRegistry as NewRegistry } from "../services/toolRegistry";

export class ToolRegistry {
  static registerTool(tool: any) {
    console.warn(
      "DEPRECATED: ToolRegistry.registerTool called. Use services/toolRegistry.register instead."
    );
    NewRegistry.register(tool, "CORE");
  }

  static getToolNames(): string[] {
    return NewRegistry.getAll()
      .map((t) => t.name)
      .filter((n): n is string => !!n);
  }

  static async execute(name: string, args: any, context: any): Promise<string> {
    console.warn(
      `DEPRECATED: ToolRegistry.execute called for ${name}. Forwarding to services/toolRegistry.`
    );
    return await NewRegistry.execute(name, args, context);
  }
}
