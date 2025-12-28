# Music App Selection in Local Router

## How Luca Chooses Which Music App to Use

When you say **"play Shape of You"**, Luca needs to know which music app to use. Here's how it works:

---

## Detection Logic

### 1. **Explicit App Mention** (Highest Priority)

If you mention the app name, Luca will use that app:

| Command                        | Detected App | Song Info      |
| ------------------------------ | ------------ | -------------- |
| "play Shape of You on Spotify" | Spotify      | "Shape of You" |
| "play this in Apple Music"     | Apple Music  | "this"         |
| "play despacito on YouTube"    | YouTube      | "despacito"    |

### 2. **Default App** (Fallback)

If you don't mention an app, Luca defaults to **Spotify**:

| Command             | Detected App | Reason                          |
| ------------------- | ------------ | ------------------------------- |
| "play Shape of You" | Spotify      | No app mentioned, using default |
| "play some jazz"    | Spotify      | No app mentioned, using default |

---

## Supported Apps

The router can detect these music apps:

- ✅ **Spotify** - Keywords: "spotify", "on spotify", "in spotify"
- ✅ **Apple Music** - Keywords: "apple music", "on apple music"
- ✅ **YouTube** / **YouTube Music** - Keywords: "youtube", "on youtube", "youtube music"
- ✅ **SoundCloud** - Keywords: "soundcloud", "on soundcloud"

---

## Example Responses

### With App Specified:

```json
{
  "tool": "playMusic",
  "parameters": {
    "songInfo": "Shape of You",
    "app": "spotify"
  },
  "confidence": 0.85
}
```

### Without App Specified (Default):

```json
{
  "tool": "playMusic",
  "parameters": {
    "songInfo": "Shape of You",
    "app": "spotify" // Default
  },
  "confidence": 0.85
}
```

---

## Test Commands

Try these:

```
✅ "play Shape of You"                    → Spotify (default)
✅ "play despacito on YouTube"            → YouTube
✅ "play some jazz on Apple Music"        → Apple Music
✅ "play Bohemian Rhapsody on Spotify"    → Spotify
```

---

## Changing the Default App

To change the default from Spotify to another app, edit `cortex.py` line ~788:

```python
# Current default
params["app"] = "spotify"

# Change to Apple Music
params["app"] = "apple music"

# Change to YouTube
params["app"] = "youtube"
```

---

## How the Frontend Uses This

When the frontend receives:

```json
{
  "tool": "playMusic",
  "parameters": {
    "songInfo": "Shape of You",
    "app": "spotify"
  }
}
```

It will:

1. Check if Spotify is running → If yes, use it
2. If not, launch Spotify
3. Send the play command to Spotify with "Shape of You"

If the specified app isn't available, Luca will use the system default or ask which app to use.
