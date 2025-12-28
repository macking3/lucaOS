import { ToolExecutionContext } from "../types";
import { apiUrl } from "../../config/api";

export class MessagingTools {
  static async sendInstantMessage(
    args: any,
    context: ToolExecutionContext
  ): Promise<string> {
    const { isLocalCoreConnected, hostPlatform, setToolLogs, soundService } =
      context;

    if (!isLocalCoreConnected) {
      const failRes = `ERROR: Cannot send message. Local Core disconnected. Please ensure server.js is running.`;
      setToolLogs((prev) => {
        const newLogs = [...prev];
        newLogs[newLogs.length - 1].result = failRes;
        return newLogs;
      });
      return failRes;
    }

    const { app, recipient, message } = args;
    let script = "";
    const language = hostPlatform === "win32" ? "powershell" : "applescript";
    const isMac = hostPlatform === "darwin";
    const normalizedApp = app.toLowerCase();

    if (isMac) {
      if (normalizedApp.includes("whatsapp")) {
        script = `
                    tell application "${app}" to activate
                    delay 0.5
                    tell application "System Events"
                        keystroke "n" using {command down}
                        delay 0.8
                        keystroke "${recipient}"
                        delay 1.0
                        key code 36
                        delay 0.5
                        keystroke "${message}"
                        delay 0.2
                        key code 36
                    end tell
                `;
      } else {
        script = `
                    tell application "${app}" to activate
                    delay 0.5
                    tell application "System Events"
                        keystroke "f" using {command down}
                        delay 0.5
                        keystroke "${recipient}"
                        delay 0.8
                        key code 36
                        delay 0.5
                        keystroke "${message}"
                        delay 0.1
                        key code 36
                    end tell
                `;
      }
    } else {
      const searchKey =
        normalizedApp.includes("discord") || normalizedApp.includes("slack")
          ? "^k"
          : "^n";
      script = `
                $wshell = New-Object -ComObject WScript.Shell
                $wshell.AppActivate("${app}")
                Start-Sleep -Milliseconds 500
                $wshell.SendKeys("${searchKey}")
                Start-Sleep -Milliseconds 500
                $wshell.SendKeys("${recipient}")
                Start-Sleep -Milliseconds 800
                $wshell.SendKeys("{ENTER}")
                Start-Sleep -Milliseconds 500
                $wshell.SendKeys("${message}")
                Start-Sleep -Milliseconds 200
                $wshell.SendKeys("{ENTER}")
            `;
    }

    try {
      const res = await fetch(apiUrl("/api/system/script"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, language }),
      });
      const data = await res.json();

      let output = data.error
        ? `ERROR: ${data.error}`
        : `SUCCESS: Message sent to ${recipient} on ${app}.`;

      setToolLogs((prev) => {
        const newLogs = [...prev];
        newLogs[newLogs.length - 1].result = output;
        return newLogs;
      });
      soundService.play("SUCCESS");
      return output;
    } catch (e: any) {
      return `ERROR: Failed to execute automation script.`;
    }
  }
}
