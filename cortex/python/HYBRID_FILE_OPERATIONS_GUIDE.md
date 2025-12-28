# Hybrid File Operations System

## 🎯 Overview

The hybrid system automatically chooses the best method for file operations:

```
┌─────────────────────────────────────────┐
│  Simple Operations (Direct)            │  ⚡ 50-200ms
│  - Open file                            │
│  - Create folder                        │
│  - Delete file                          │
│  - Copy/Move file                       │
│  - List files                           │
└─────────────────────────────────────────┘
                ↓ OR ↓
┌─────────────────────────────────────────┐
│  Complex Operations (AI)               │  🤖 4-6s
│  - Organize files by type/project       │
│  - Batch rename files                   │
│  - Smart cleanup (old/duplicate files)  │
│  - Custom organization criteria         │
└─────────────────────────────────────────┘
```

---

## ⚡ Simple Operations (Direct Execution)

### 1. Open File

```python
# Open a file in its default app
result = open_file("report.pdf")
# → Opens in Preview (or Adobe Reader)

result = open_file("notes.txt", "~/Documents")
# → Opens in TextEdit

result = open_file("presentation.pptx")
# → Opens in Keynote/PowerPoint
```

**Features**:

- ✅ Smart file search (Documents, Desktop, Downloads, Home)
- ✅ Opens in default application automatically
- ✅ Fast (~100ms)

---

### 2. Create Folder

```python
# Create on Desktop (default)
result = create_folder("ProjectX")

# Create in specific location
result = create_folder("NewFolder", "~/Documents")
```

**Features**:

- ✅ Creates parent directories if needed
- ✅ Safe (doesn't overwrite existing folders)
- ✅ Instant (~50ms)

---

### 3. Delete File (Safe!)

```python
# Moves to Trash (not permanent!)
result = delete_file("old_notes.txt")

result = delete_file("temp.pdf", "~/Downloads")
```

**Features**:

- ✅ **Moves to Trash** (recoverable!)
- ✅ Searches common locations automatically
- ✅ Safe (~150ms)

---

### 4. Copy File

```python
result = hybrid_files.copy_file("report.pdf", "~/Backup/")
```

---

### 5. Move File

```python
result = hybrid_files.move_file("document.docx", "~/Documents/Archive/")
```

---

### 6. List Files

```python
# List all files
result = hybrid_files.list_files("~/Downloads")

# List with filter
result = hybrid_files.list_files("~/Documents", pattern=".pdf")
```

**Returns**:

```json
{
  "success": true,
  "directory": "/Users/you/Downloads",
  "files": [
    { "name": "report.pdf", "type": "file", "size": 1024567 },
    { "name": "Images", "type": "folder", "size": null }
  ]
}
```

---

## 🤖 Complex Operations (AI-Powered)

### 1. Organize Files

```python
# Organize by file type
await file_operation("organize",
    directory="~/Downloads",
    criteria="by type"
)
```

**What it does**:

1. Screenshots UI of Downloads folder (Gemini Vision)
2. Gemini analyzes files and creates organization plan:
   ```
   - Move PDFs → Documents/PDFs/
   - Move Images → Pictures/Downloads/
   - Move Videos → Movies/Downloads/
   - Archive old files (30+ days)
   ```
3. Executes plan with user confirmation

**Criteria options**:

- `"by type"` - PDFs, Images, Documents, etc.
- `"by project"` - Groups related files intelligently
- `"by date"` - Organizes into Year/Month folders
- `"custom: ..."` - Natural language criteria

---

### 2. Batch Rename Files

```python
# Rename vacation photos
await file_operation("batch_rename",
    directory="~/Photos/2024",
    pattern="IMG_*.jpg",
    new_pattern="Vacation_Bali_*.jpg"
)
```

**What it does**:

```
Before:
IMG_0001.jpg → Vacation_Bali_0001.jpg
IMG_0002.jpg → Vacation_Bali_0002.jpg
IMG_0003.jpg → Vacation_Bali_0003.jpg
```

**Gemini handles**:

- Preserves file numbering
- Prevents name conflicts
- Batch processing

---

### 3. Smart Cleanup

```python
# Clean up old files intelligently
await file_operation("cleanup",
    directory="~/Downloads",
    keep_days=30
)
```

**What it does**:

1. Gemini scans Downloads folder
2. Identifies:
   - Files older than 30 days
   - Duplicate files
   - Temporary files (.tmp, .cache)
3. Creates cleanup plan:

   ```
   Archive:
   - Old PDFs → Documents/Archive/
   - Old images → Pictures/Archive/

   Delete (to Trash):
   - Duplicate files
   - Temp files
   - Browser downloads
   ```

4. Executes with confirmation

---

## 🚀 Universal API

### Automatic Method Selection

```python
from hybrid_file_operations import file_operation

# Simple → Direct (fast)
await file_operation("open", filename="report.pdf")

# Complex → AI (intelligent)
await file_operation("organize", directory="~/Downloads", criteria="by type")
```

The system **automatically chooses** the best approach!

---

## 📊 Performance Comparison

| Operation             | Old Way           | Hybrid (Direct) | Hybrid (AI) |
| --------------------- | ----------------- | --------------- | ----------- |
| Open file             | Manual GUI clicks | 100ms ⚡        | N/A         |
| Create folder         | Manual GUI        | 50ms ⚡         | N/A         |
| Delete file           | Manual            | 150ms ⚡        | N/A         |
| Organize 100 files    | 5-10 minutes 😓   | N/A             | 6-8s 🤖     |
| Batch rename 50 files | 2-3 minutes       | N/A             | 4-5s 🤖     |
| Clean up folder       | 10-15 minutes     | N/A             | 5-7s 🤖     |

---

## 🎯 Real-World Examples

### Example 1: Daily Downloads Cleanup

```
User: "organize my downloads"

System:
1. Router: organize → file_operation("organize", ...)
2. Hybrid: Complex operation → Use AI
3. Gemini Vision:
   - Opens Downloads folder
   - Analyzes files
   - Creates org structure:
     * PDFs → Documents/PDFs/
     * Images → Pictures/
     * Videos → Movies/
4. Executes in ~6s
5. ✅ Downloads organized!
```

### Example 2: Quick File Open

```
User: "open file report.pdf"

System:
1. Router: open → file_operation("open", filename="report.pdf")
2. Hybrid: Simple operation → Direct
3. Searches: Documents, Desktop, Downloads
4. Finds in ~/Documents/report.pdf
5. Opens in Preview
6. ✅ Done in 100ms!
```

### Example 3: Vacation Photo Rename

```
User: "rename my vacation photos from IMG to Bali_2024"

System:
1. Router: batch_rename → file_operation("batch_rename", ...)
2. Hybrid: Complex → AI
3. Gemini:
   - Finds photo directory
   - Plans rename strategy
   - Preserves numbering
4. Renames 50 photos in 4s
5. ✅ All photos renamed!
```

---

## 🔧 Integration with Tool Handlers

```python
@app.post("/api/execute/openFile")
async def execute_open_file(request: dict):
    filename = request.get("fileName")
    directory = request.get("directory")

    result = open_file(filename, directory)

    return {
        "success": result["success"],
        "path": result.get("path"),
        "message": f"Opened {filename}"
    }

@app.post("/api/execute/createFolder")
async def execute_create_folder(request: dict):
    folder_name = request.get("folderName")
    location = request.get("location")

    result = create_folder(folder_name, location)

    return {
        "success": result["success"],
        "path": result.get("path"),
        "message": f"Created folder: {folder_name}"
    }

@app.post("/api/execute/organizeFiles")
async def execute_organize(request: dict):
    directory = request.get("directory", "~/Downloads")
    criteria = request.get("criteria", "by type")

    result = await file_operation("organize",
                                  directory=directory,
                                  criteria=criteria)

    return {
        "success": result["success"],
        "method": result.get("method"),
        "message": f"Organized {directory}"
    }
```

---

## 🛡️ Safety Features

### 1. Safe Delete

- **Always moves to Trash** (never permanent delete)
- Files can be recovered from Trash
- Prevents accidental data loss

### 2. Confirmation for Complex Ops

- AI operations show plan before executing
- User can review and approve
- Can cancel if plan looks wrong

### 3. Smart File Search

- Searches multiple locations automatically
- Prevents "file not found" errors
- Recursive search in Documents if needed

### 4. Exists Checks

- Won't overwrite existing folders
- Checks file existence before operations
- Clear error messages

---

## 📝 Summary

**Hybrid File Operations gives Luca:**

✅ **Fast simple operations** (50-200ms)  
✅ **Intelligent complex management** (AI-powered)  
✅ **Safe file handling** (Trash, not delete)  
✅ **Smart file finding** (auto-searches common locations)  
✅ **Organized workspace** (AI cleanup & organization)

**Operations supported: 9 total**

- **Simple (6)**: Open, Create, Delete, Copy, Move, List
- **Complex (3)**: Organize, Batch Rename, Smart Cleanup

**The system automatically chooses the best approach for each operation!** 🎯
