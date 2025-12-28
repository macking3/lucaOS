import { tradingService } from "../../services/tradingService";

export const TradingTools = {
  execute: async (name: string, args: any, context: any): Promise<string> => {
    try {
      if (name === "startDebate") {
        const { symbol } = args;

        // NEURAL LINK ROUTING: If on mobile, delegate to desktop
        const isMobile =
          context.currentDeviceType === "mobile" ||
          context.currentDeviceType === "tablet";

        if (isMobile && context.neuralLinkManager) {
          try {
            console.log(
              "[startDebate] Mobile device detected, routing to desktop via Neural Link..."
            );

            const availableDevices = Array.from(
              (context.neuralLinkManager as any).devices?.values() || []
            ).map((d: any) => ({
              type: d.type,
              deviceId: d.deviceId,
              name: d.name,
            }));

            const desktopDevice = availableDevices.find(
              (d: any) => d.type === "desktop"
            );

            if (desktopDevice) {
              const result = await (
                context.neuralLinkManager as any
              ).delegateTool(desktopDevice.deviceId, "startDebate", args);

              return (
                result?.result ||
                `DEBATE STARTED (via ${desktopDevice.name}): ${symbol}. Check the Debate Arena for live updates.`
              );
            } else {
              console.warn(
                "[startDebate] No desktop device found, using degraded mode"
              );
            }
          } catch (neuralLinkError) {
            console.warn(
              "[startDebate] Neural Link delegation failed, using degraded mode:",
              neuralLinkError
            );
          }
        }

        // DEGRADED MODE: If mobile and desktop unavailable, use lightweight single-agent analysis
        if (isMobile) {
          console.log(
            "[startDebate] Running in DEGRADED MODE (single-agent analysis)"
          );

          // Use lucaService for a single lightweight analysis instead of full debate
          if (context.lucaService) {
            const quickAnalysis = await context.lucaService.sendMessage(
              `Provide a brief market analysis for ${symbol}. Include: current sentiment (bullish/bearish), key support/resistance levels, and a risk assessment. Keep it concise.`,
              null,
              null,
              null
            );

            return `QUICK ANALYSIS (Mobile Mode): ${symbol}\n\n${quickAnalysis.text}\n\n💡 Tip: Connect to desktop for full multi-agent debate analysis.`;
          }
        }

        // FULL MODE: Desktop or fallback
        const result = await tradingService.startDebate({
          topic: `Analysis of ${symbol}`,
          participants: ["BULL", "BEAR", "ANALYST"], // Default set
          symbol: symbol,
        });

        if (result.success) {
          return `DEBATE STARTED: ${symbol}. Check the Debate Arena for live updates.`;
        } else {
          return `FAILED to start debate: ${result.error}`;
        }
      }

      if (name === "executeTrade") {
        const { symbol, side, amount, type } = args;

        // Basic confirmation could be handled by the agent before calling this tool
        const result = await tradingService.executeOrder("binance", {
          // Defaulting to binance for now or inferred
          symbol: symbol,
          side: side.toUpperCase(),
          type: type?.toUpperCase() || "MARKET",
          quantity: amount,
        });

        if (result.success || result.orderId) {
          return `TRADE EXECUTED: ${side} ${amount} ${symbol}. ID: ${result.orderId}`;
        } else {
          return `TRADE FAILED: ${result.message || "Unknown error"}`;
        }
      }

      if (name === "getPositions") {
        const positions = await tradingService.getPositions("binance"); // Default exchange or iterate all?
        if (!positions || positions.length === 0)
          return "No active positions found.";

        return (
          "ACTIVE POSITIONS:\n" +
          positions
            .map(
              (p: any) =>
                `- ${p.symbol}: ${p.side} ${p.amount} @ ${p.entryPrice} (PnL: ${p.unrealizedPnl})`
            )
            .join("\n")
        );
      }

      if (name === "closeAllPositions") {
        // Emergency implementation
        // This might need a specific endpoint or iterating positions
        // tradingService doesn't have closeAll explicitly shown in the view,
        // let's assume we implement it or iterate.
        // For safety, let's return a message if not implemented, or iterate getPositions.
        const positions = await tradingService.getPositions("binance");
        const results = [];
        for (const p of positions) {
          const res = await tradingService.executeOrder("binance", {
            symbol: p.symbol,
            side: p.side === "BUY" ? "SELL" : "BUY",
            type: "MARKET",
            quantity: p.amount,
            reduceOnly: true,
          });
          results.push(`${p.symbol}: ${res.success ? "CLOSED" : "FAILED"}`);
        }
        return `EMERGENCY CLOSE RESULT:\n${results.join("\n")}`;
      }

      return `Trading Tool ${name} not implemented in handler.`;
    } catch (e: any) {
      console.error(`[TradingTools] Error executing ${name}:`, e);
      return `Trading Error: ${e.message}`;
    }
  },
};
