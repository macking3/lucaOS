import { handler as spotifyHandler } from "../services/integrations/spotify_controller/index.ts";
import { handler as klavisHandler } from "../services/integrations/klavis_connector/index.ts";
import { handler as braveHandler } from "../services/integrations/brave_search/index.ts";
import { handler as calendlyHandler } from "../services/integrations/calendly/index.ts";
import { handler as navigatorHandler } from "../services/integrations/navigator/index.ts";

async function verify() {
  console.log("=== VERIFYING NEW CONNECTIONS (SYNTAX CHECK) ===\n");

  // 1. TEST SPOTIFY
  console.log("[TEST 1] Spotify Controller");
  try {
    const searchRes = await spotifyHandler("spotify_search", {
      query: "Daft Punk",
      type: "artist",
    });
    console.log("✅ Spotify: PASS (Mock)");
  } catch (e) {
    console.error("❌ Spotify: FAIL", e);
  }

  // 2. TEST KLAVIS
  console.log("[TEST 2] Klavis Platform");
  try {
    // Expect failure without key, but check if code runs
    await klavisHandler("klavis_discover_tools", {});
  } catch (e: any) {
    if (e.message.includes("KLAVIS_API_KEY")) {
      console.log("✅ Klavis: PASS (Correctly caught missing Key)");
    } else {
      console.error("❌ Klavis: FAIL", e);
    }
  }

  // 3. TEST BRAVE
  console.log("[TEST 3] Brave Search");
  try {
    await braveHandler("brave_web_search", { query: "test" });
  } catch (e: any) {
    if (e.message.includes("BRAVE_API_KEY")) {
      console.log("✅ Brave: PASS (Correctly caught missing Key)");
    } else {
      console.error("❌ Brave: FAIL", e);
    }
  }

  // 4. TEST CALENDLY
  console.log("[TEST 4] Calendly");
  try {
    await calendlyHandler("calendly_get_user_info", {});
  } catch (e: any) {
    if (e.message.includes("CALENDLY_API_KEY")) {
      console.log("✅ Calendly: PASS (Correctly caught missing Key)");
    } else {
      console.error("❌ Calendly: FAIL", e);
    }
  }

  // 5. TEST NAVIGATOR (Login Tool Check)
  console.log("[TEST 5] Navigator (Login Tool)");
  try {
    // Just check if tool definitions load, we won't launch browser in test
    const tools = (await import("../services/integrations/navigator/index.ts"))
      .tools;
    const loginTool = tools.find((t) => t.name === "navigator_login");
    if (loginTool) {
      console.log("✅ Navigator: PASS (Login Tool Defined)");
    } else {
      console.error("❌ Navigator: FAIL (Login Tool Missing)");
    }
  } catch (e) {
    console.error("❌ Navigator: FAIL", e);
  }

  console.log("\n=== VERIFICATION COMPLETE ===");
}

verify();
