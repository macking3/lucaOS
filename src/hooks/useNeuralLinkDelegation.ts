import { useEffect } from "react";
import { neuralLinkManager } from "../services/neuralLink/manager";
import { ToolRegistry } from "../services/toolRegistry";

/**
 * useNeuralLinkDelegation
 *
 * Shared hook that enables a device to:
 * 1. Listen for delegated commands from other devices
 * 2. Execute them using the local ToolRegistry
 * 3. Report the result back to the originator
 *
 * This enables the "One OS" vision where multiple devices act as one.
 */
export function useNeuralLinkDelegation(
  currentDeviceId: string | null,
  executeToolFn?: (name: string, args: any) => Promise<string>,
  context?: any,
  callbacks?: {
    onCommandReceived?: (command: string, args: any) => void;
    onCommandComplete?: (
      command: string,
      args: any,
      result?: any,
      error?: any
    ) => void;
  }
) {
  useEffect(() => {
    if (!neuralLinkManager) return;

    const handleCommand = async (event: any) => {
      const { message } = event.data;

      // Only process command messages
      if (message.type === "command" && message.payload) {
        const { command, args } = message.payload;
        const cmdId = message.commandId;
        const source = message.source;

        callbacks?.onCommandReceived?.(command, args);

        console.log(
          `[ONE OS] Received delegated command from ${
            source || "unknown"
          }: ${command}`
        );

        try {
          let result: any;

          // Use provided execute function or fall back to ToolRegistry
          if (executeToolFn) {
            result = await executeToolFn(command, args);
          } else {
            result = await ToolRegistry.execute(command, args, context || {});
          }

          // Send result back to origin
          // If we have a source, we target it specifically
          if (source) {
            neuralLinkManager.sendSystemEvent("command:result", {
              id: cmdId,
              result: result,
              deviceId:
                currentDeviceId || (neuralLinkManager as any).myDeviceId,
              target: source,
            });
          } else {
            // Broadcast result if source is unknown
            neuralLinkManager.sendSystemEvent("command:result", {
              id: cmdId,
              result: result,
              deviceId:
                currentDeviceId || (neuralLinkManager as any).myDeviceId,
            });
          }

          console.log(
            `[ONE OS] Command "${command}" executed and result sent back.`
          );

          callbacks?.onCommandComplete?.(command, args, result);
        } catch (error: any) {
          console.error(
            `[ONE OS] Delegated command "${command}" failed:`,
            error
          );

          neuralLinkManager.sendSystemEvent("command:result", {
            id: cmdId,
            error: error.message || "Execution failed",
            deviceId: currentDeviceId || (neuralLinkManager as any).myDeviceId,
            target: source,
          });

          callbacks?.onCommandComplete?.(command, args, undefined, error);
        }
      }
    };

    // Listen for incoming commands
    neuralLinkManager.on("command:received", handleCommand);

    return () => {
      neuralLinkManager.off("command:received", handleCommand);
    };
  }, [currentDeviceId, executeToolFn, context]);
}
