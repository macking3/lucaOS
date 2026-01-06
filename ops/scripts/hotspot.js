/* eslint-disable */
// hotspot.js - Luca Native System Interface (JXA) - Release Candidate
// Purpose: Automates the "Internet Sharing" UI in System Settings to create a True Wi-Fi Hotspot.
// Supports macOS Ventura, Sonoma, and Sequoia.

function run(argv) {
    var app = Application.currentApplication();
    app.includeStandardAdditions = true;

    var systemSettings = Application('System Settings');
    var action = argv[0] || "toggle"; // "on", "off", "toggle", or "status"
    
    // --- HELPERS ---
    function log(msg) {
        console.log("[JXA] " + msg);
    }

    function waitForElement(elementGetter, timeout) {
        var start = Date.now();
        var el = null;
        while (Date.now() - start < (timeout || 5000)) {
            try {
                el = elementGetter();
                if (el && el.exists()) return el;
            } catch (e) {}
            delay(0.2);
        }
        return null;
    }

    // --- MAIN ---
    try {
        // 1. Activate System Settings
        // We use 'open' to ensure it jumps to the right pane directly
        app.doShellScript("open 'x-apple.systempreferences:com.apple.Sharing-Settings.extension'");
        delay(1.5); // Allow window to spawn

        var sysEvents = Application('System Events');
        var process = sysEvents.processes.byName('System Settings');
        
        if (!process.exists()) {
            return "ERROR: System Settings failed to launch.";
        }

        var window = waitForElement(function() { return process.windows[0]; }, 3000);
        if (!window) return "ERROR: System Settings window not found.";

        // 2. Locate "Internet Sharing" Row
        // In modern macOS Settings, this is usually in a list/table in the detail pane (Group 1 > SplitGroup 0 > Group 1 > ScrollArea 0)
        // We iterate specifically looking for the text "Internet Sharing"
        
        var targetRow = null;
        var toggleSwitch = null;

        // Exhaustive search through UI hierarchy
        // This is necessary because of differerences in macOS versions
        var potentialGroups = window.groups;
        
        // Strategy: Navigate specifically to the known structure of "General > Sharing"
        if (potentialGroups.length > 0) {
            // Usually the right side panel
            var splitter = potentialGroups[0].splitGroups[0];
            if (splitter && splitter.exists()) {
               var rightGroup = splitter.groups[1];
               if (rightGroup && rightGroup.exists()) {
                   var scrollArea = rightGroup.scrollAreas[0];
                   if (scrollArea && scrollArea.exists()) {
                       var uiElements = scrollArea.uiElements;
                       
                       for (var i = 0; i < uiElements.length; i++) {
                           var el = uiElements[i];
                           // Check Name or Help/Description
                           if ((el.name() && el.name().includes("Internet Sharing")) || 
                               (el.help() && el.help().includes("Internet Sharing"))) {
                               
                               targetRow = el;
                               // Find the switch: Checkbox or Button
                               if (el.checkboxes.length > 0) toggleSwitch = el.checkboxes[0];
                               else if (el.buttons.length > 0) toggleSwitch = el.buttons[0];
                               // Sometimes the switch is nested or is the element itself (if it's a checkbox row)
                               if (!toggleSwitch && el.class() === 'checkbox') toggleSwitch = el;
                               
                               break;
                           }
                       }
                   }
               }
            }
        }

        if (!targetRow || !toggleSwitch) {
            return "ERROR: 'Internet Sharing' row not found. Ensure you are on macOS 13+.";
        }

        // 3. Perform Action
        var currentStatus = toggleSwitch.value(); // 1 (on) or 0 (off)
        var statusStr = (currentStatus === 1 || currentStatus === true) ? "active" : "inactive";

        if (action === "status") {
            return "STATUS: " + statusStr;
        }

        if ((action === "on" && currentStatus === 1) || (action === "off" && currentStatus === 0)) {
            return "SUCCESS: Already " + action;
        }

        // Click it!
        toggleSwitch.click();
        delay(0.5);

        // 4. Handle Confirmations (Turning ON usually asks "Are you sure?")
        if (action === "on" || action === "toggle") {
            // Look for sheet
            var sheet = window.sheets[0];
            if (sheet && sheet.exists()) {
                // "Start" or "Turn On" button
                var confirmBtn = sheet.buttons.byName("Start");
                if (!confirmBtn.exists()) confirmBtn = sheet.buttons.byName("Turn On");
                
                if (confirmBtn.exists()) {
                    confirmBtn.click();
                    delay(1.0); // Wait for startup
                    return "SUCCESS: Hotspot Started (Confirmed)";
                } else {
                    return "WARNING: customized confirmation dialog found but 'Start' button missing.";
                }
            }
        }
        
        return "SUCCESS: Hotspot State Toggled to " + (currentStatus === 0 ? "ON" : "OFF");

    } catch (e) {
        return "ERROR: " + e.message;
    }
}
