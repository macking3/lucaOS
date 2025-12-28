"""
Smart App Automation Library for Luca
Handles app launching with intelligent timing and UI verification
"""

APPLESCRIPT_TEMPLATES = {
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MUSIC APPS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    "spotify_play": """
on playSpotifyTrack(songName)
    -- Smart launch/activate
    tell application "Spotify"
        if not running then
            launch
            delay 2
        else
            activate
            delay 0.3
        end if
    end tell
    
    -- UI automation with polling
    tell application "System Events"
        tell process "Spotify"
            -- Wait for search field (max 10 seconds)
            repeat 20 times
                try
                    if exists text field 1 of window 1 then
                        set focused of text field 1 of window 1 to true
                        set value of text field 1 of window 1 to songName
                        delay 0.2
                        keystroke return
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end playSpotifyTrack

playSpotifyTrack("{song}")
""",

    "apple_music_play": """
on playAppleMusicTrack(songName)
    tell application "Music"
        if not running then
            launch
            delay 2
        else
            activate
            delay 0.3
        end if
    end tell
    
    tell application "System Events"
        tell process "Music"
            repeat 20 times
                try
                    if exists text field 1 of window 1 then
                        set focused of text field 1 of window 1 to true
                        set value of text field 1 of window 1 to songName
                        keystroke return
                        delay 0.3
                        keystroke return
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end playAppleMusicTrack

playAppleMusicTrack("{song}")
""",

    "spotify_pause": """
tell application "Spotify"
    if running then
        playpause
    end if
end tell
""",

    "spotify_next": """
tell application "Spotify"
    if running then
        next track
    end if
end tell
""",

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MESSAGING APPS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    "whatsapp_message": """
on sendWhatsAppMessage(contactName, messageText)
    tell application "WhatsApp"
        if not running then
            launch
            delay 3
        else
            activate
            delay 0.3
        end if
    end tell
    
    tell application "System Events"
        tell process "WhatsApp"
            -- Wait for app to be ready
            repeat 20 times
                try
                    if exists window 1 then
                        -- Open search (Cmd+F)
                        keystroke "f" using command down
                        delay 0.3
                        
                        -- Type contact name
                        keystroke contactName
                        delay 0.5
                        
                        -- Press Enter to select contact
                        keystroke return
                        delay 0.5
                        
                        -- Type message
                        keystroke messageText
                        delay 0.2
                        
                        -- Send (Enter)
                        keystroke return
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end sendWhatsAppMessage

sendWhatsAppMessage("{contact}", "{message}")
""",

    "telegram_message": """
on sendTelegramMessage(contactName, messageText)
    tell application "Telegram"
        if not running then
            launch
            delay 3
        else
            activate
            delay 0.3
        end if
    end tell
    
    tell application "System Events"
        tell process "Telegram"
            repeat 20 times
                try
                    if exists window 1 then
                        -- Search (Cmd+F)
                        keystroke "f" using command down
                        delay 0.3
                        keystroke contactName
                        delay 0.5
                        keystroke return
                        delay 0.5
                        keystroke messageText
                        keystroke return
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end sendTelegramMessage

sendTelegramMessage("{contact}", "{message}")
""",

    "discord_message": """
on sendDiscordMessage(channelName, messageText)
    tell application "Discord"
        if not running then
            launch
            delay 4
        else
            activate
            delay 0.3
        end if
    end tell
    
    tell application "System Events"
        tell process "Discord"
            repeat 20 times
                try
                    if exists window 1 then
                        -- Search (Cmd+K)
                        keystroke "k" using command down
                        delay 0.3
                        keystroke channelName
                        delay 0.5
                        keystroke return
                        delay 0.5
                        keystroke messageText
                        keystroke return
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end sendDiscordMessage

sendDiscordMessage("{channel}", "{message}")
""",

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # BROWSERS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    "chrome_open_url": """
on openChromeURL(targetURL)
    tell application "Google Chrome"
        if not running then
            launch
            delay 2
            make new window
            delay 0.5
        else
            activate
            delay 0.3
        end if
        
        -- Open URL in new tab
        tell window 1
            make new tab with properties {URL:targetURL}
        end tell
    end tell
end openChromeURL

openChromeURL("{url}")
""",

    "safari_open_url": """
on openSafariURL(targetURL)
    tell application "Safari"
        if not running then
            launch
            delay 2
        else
            activate
            delay 0.3
        end if
        
        tell window 1
            set current tab to (make new tab with properties {URL:targetURL})
        end tell
    end tell
end openSafariURL

openSafariURL("{url}")
""",

    "firefox_open_url": """
on openFirefoxURL(targetURL)
    tell application "Firefox"
        if not running then
            launch
            delay 3
        else
            activate
            delay 0.3
        end if
    end tell
    
    tell application "System Events"
        tell process "Firefox"
            repeat 20 times
                try
                    if exists window 1 then
                        -- New tab (Cmd+T)
                        keystroke "t" using command down
                        delay 0.3
                        keystroke targetURL
                        keystroke return
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end openFirefoxURL

openFirefoxURL("{url}")
""",

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # PRODUCTIVITY APPS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    "vscode_open": """
on openVSCode(projectPath)
    tell application "Visual Studio Code"
        if not running then
            launch
            delay 3
        else
            activate
            delay 0.3
        end if
    end tell
    
    tell application "System Events"
        tell process "Code"
            repeat 20 times
                try
                    if exists window 1 then
                        -- Open folder (Cmd+O)
                        keystroke "o" using command down
                        delay 0.5
                        
                        -- Type path (Cmd+Shift+G for Go to Folder)
                        keystroke "g" using {command down, shift down}
                        delay 0.3
                        keystroke projectPath
                        keystroke return
                        delay 0.3
                        keystroke return
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end openVSCode

openVSCode("{path}")
""",

    "notes_create": """
on createNote(noteTitle, noteContent)
    tell application "Notes"
        if not running then
            launch
            delay 2
        else
            activate
            delay 0.3
        end if
        
        -- Wait for app to be ready
        repeat 15 times
            try
                if (count of notes) >= 0 then
                    exit repeat
                end if
            end try
            delay 0.3
        end repeat
        
        -- Create new note
        tell account "iCloud"
            make new note with properties {name:noteTitle, body:noteContent}
        end tell
    end tell
end createNote

createNote("{title}", "{content}")
""",

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SYSTEM APPS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    "calculator_open": """
tell application "Calculator"
    if not running then
        launch
        delay 1
    else
        activate
    end if
end tell
""",

    "finder_open_folder": """
on openFinderFolder(folderPath)
    tell application "Finder"
        if not running then
            launch
            delay 1
        else
            activate
            delay 0.2
        end if
        
        open folder folderPath
        activate
    end tell
end openFinderFolder

openFinderFolder("{path}")
""",

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # GENERIC APP LAUNCHER (Fallback)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    "generic_launch": """
on launchApp(appName)
    tell application appName
        if not running then
            launch
            delay 2
        else
            activate
            delay 0.3
        end if
    end tell
    
    -- Wait until app is frontmost
    tell application "System Events"
        repeat 20 times
            try
                if frontmost of process appName then
                    exit repeat
                end if
            end try
            delay 0.5
        end repeat
    end tell
end launchApp

launchApp("{app}")
"""
}

# Helper function to get the right script
def get_automation_script(action, app, **params):
    """
    Get the appropriate automation script for an action
    
    Args:
        action: The action to perform (e.g., "play", "message", "open_url")
        app: The app name (e.g., "spotify", "whatsapp", "chrome")
        **params: Parameters to substitute in the script
    
    Returns:
        str: The filled AppleScript ready to execute
    """
    
    # Map action+app to script template
    script_map = {
        ("play", "spotify"): "spotify_play",
        ("play", "apple_music"): "apple_music_play",
        ("pause", "spotify"): "spotify_pause",
        ("next", "spotify"): "spotify_next",
        ("message", "whatsapp"): "whatsapp_message",
        ("message", "telegram"): "telegram_message",
        ("message", "discord"): "discord_message",
        ("open_url", "chrome"): "chrome_open_url",
        ("open_url", "safari"): "safari_open_url",
        ("open_url", "firefox"): "firefox_open_url",
        ("open", "vscode"): "vscode_open",
        ("create_note", "notes"): "notes_create",
        ("open", "calculator"): "calculator_open",
        ("open_folder", "finder"): "finder_open_folder",
    }
    
    # Get template key
    key = (action, app.lower().replace(" ", "_"))
    template_name = script_map.get(key, "generic_launch")
    
    # Get template
    script_template = APPLESCRIPT_TEMPLATES[template_name]
    
    # Substitute parameters
    for param_name, param_value in params.items():
        placeholder = "{" + param_name + "}"
        script_template = script_template.replace(placeholder, str(param_value))
    
    return script_template

# Example usage:
if __name__ == "__main__":
    # Test script generation
    script = get_automation_script("play", "spotify", song="Shape of You")
    print(script)
