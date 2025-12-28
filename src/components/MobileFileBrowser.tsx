import React, { useState, useEffect } from "react";
import { X, Folder, File, ArrowLeft, Download, Eye } from "lucide-react";
import { API_BASE_URL } from "../config/api";

interface FileItem {
  name: string;
  type: "file" | "directory";
  path: string;
  size?: number | null;
}

interface Props {
  onClose: () => void;
  serverUrl?: string;
}

const MobileFileBrowser: React.FC<Props> = ({
  onClose,
  serverUrl = API_BASE_URL,
}) => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const loadDirectory = async (path: string = "") => {
    setLoading(true);
    setError("");
    try {
      const url = `${serverUrl}/api/files/list?path=${encodeURIComponent(
        path
      )}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setFiles(data.items || []);
        setCurrentPath(data.currentPath || path);
      } else {
        setError(data.error || "Failed to load directory");
      }
    } catch (err: any) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (filePath: string) => {
    setLoading(true);
    setError("");
    try {
      const url = `${serverUrl}/api/files/read?filePath=${encodeURIComponent(
        filePath
      )}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setFileContent(data.content || "");
        setViewingFile(filePath);
      } else {
        setError(data.error || "Failed to read file");
      }
    } catch (err: any) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === "directory") {
      setPathHistory((prev) => [...prev, currentPath]);
      loadDirectory(item.path);
    } else {
      loadFile(item.path);
    }
  };

  const handleBack = () => {
    if (pathHistory.length > 0) {
      const newPath = pathHistory[pathHistory.length - 1];
      setPathHistory((prev) => prev.slice(0, -1));
      loadDirectory(newPath);
    } else if (currentPath) {
      // Go to parent directory
      const parentPath = currentPath.split(/[/\\]/).slice(0, -1).join("/");
      loadDirectory(parentPath || "");
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  const formatSize = (bytes: number | null | undefined): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (viewingFile && fileContent !== null) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
        <div className="bg-slate-900 border-b border-cyan-500/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewingFile(null);
                setFileContent(null);
              }}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="text-white font-mono text-sm">
                {viewingFile.split(/[/\\]/).pop()}
              </div>
              <div className="text-xs text-slate-400">{viewingFile}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words">
            {fileContent}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="bg-slate-900 border-b border-cyan-500/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(currentPath || pathHistory.length > 0) && (
            <button
              onClick={handleBack}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <div className="text-white font-mono text-sm">Desktop Files</div>
            <div className="text-xs text-slate-400 truncate max-w-[200px]">
              {currentPath || "Root"}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No files or directories
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded border border-slate-700/50 hover:border-cyan-500/30 transition-colors text-left"
              >
                <div className="text-cyan-400">
                  {item.type === "directory" ? (
                    <Folder size={20} />
                  ) : (
                    <File size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-mono truncate">
                    {item.name}
                  </div>
                  {item.type === "file" && item.size !== null && (
                    <div className="text-xs text-slate-400">
                      {formatSize(item.size)}
                    </div>
                  )}
                </div>
                {item.type === "file" && (
                  <Eye size={16} className="text-slate-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileFileBrowser;
