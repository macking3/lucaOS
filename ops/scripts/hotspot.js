
// hotspots.js - Luca Native System Interface (JXA)
// Purpose: Automates the "Internet Sharing" UI in System Settings to create a True Wi-Fi Hotspot.

function run(argv) {
    var app = Application.currentApplication();
    app.includeStandardAdditions = true;

    var systemSettings = Application('System Settings');
    var action = argv[0] || "toggle"; // "on", "off", or "toggle"

    // Helper: Check if running
    function isSharingOn() {
        // This is tricky without UI inspection, assuming state management in backend
        // For now, we rely on the visual toggle logic
        return false; 
    }

    try {
        systemSettings.activate();
        delay(1);

        var sysEvents = Application('System Events');
        var process = sysEvents.processes.byName('System Settings');

        // Navigation (macOS Ventura/Sonoma layout)
        // 1. Go to General -> Sharing
        // Note: UI Scripting varies heavily by OS version. This targets macOS 13+
        
        // Shortcut: Use URL scheme to jump directly
        app.openLocation('x-apple.systempreferences:com.apple.Sharing-Settings.extension');
        delay(1.0);

        // Find "Internet Sharing" toggle
        // In Sonoma, it's a list. We need to find the row "Internet Sharing"
        // This part requires precise UI tree traversal which is fragile.
        // A more robust way for the "Hacker" persona is to prompt the user or guiding them.
        // But we will try to click.
        
        var window = process.windows[0];
        
        // Wait for load
        delay(0.5);

        var groups = window.groups;
        if (groups.length > 0) {
            var splitter = groups[0].splitGroups[0];
            var rightGroup = splitter.groups[1];
            var scrollArea = rightGroup.scrollAreas[0];
            
            // Iterate rows to find Internet Sharing
            var uiElements = scrollArea.uiElements;
            for (var i = 0; i < uiElements.length; i++) {
                var el = uiElements[i];
                if (el.name().includes("Internet Sharing")) {
                    // Found the row. Now find the switch.
                    // Usually the switch is a checkbox or toggle button inside the group
                    var toggle = el.checkboxes[0] || el.buttons[0]; 
                    
                    if (toggle) {
                        var status = toggle.value(); // 0 or 1
                        
                        if (action === "on" && status === 0) {
                            toggle.click();
                            confirmStart(process); // Handle "Are you sure?" dialog
                        } else if (action === "off" && status === 1) {
                            toggle.click();
                        } else if (action === "toggle") {
                            toggle.click();
                            if (status === 0) confirmStart(process);
                        }
                        
                        return "SUCCESS: Hotspot State Changed";
                    }
                }
            }
        }
        
        return "ERROR: Could not locate 'Internet Sharing' toggle in System Settings.";

    } catch (e) {
        return "ERROR: " + e.message;
    }
}

function confirmStart(process) {
    delay(0.5);
    // Check for "Are you sure?" sheet
    if (process.sheets.length > 0) {
        var sheet = process.sheets[0];
        // Usually "Start" button is the last one
        var startButton = sheet.buttons.byName("Start"); // Or "Turn On"
        if (startButton.exists()) {
            startButton.click();
        }
    }
}
