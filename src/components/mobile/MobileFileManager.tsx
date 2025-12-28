import React from "react";
import { Image, FileText, Music, Video, Folder, Search } from "lucide-react";

interface FileItem {
  name: string;
  size: string;
  type: string;
  date: string;
}

interface MobileFileManagerProps {
  files: FileItem[];
  usingRealFiles: boolean;
}

const MobileFileManager: React.FC<MobileFileManagerProps> = ({
  files,
  usingRealFiles,
}) => {
  const FileIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
      case "IMG":
      case "JPG":
      case "PNG":
        return <Image size={14} />;
      case "DOC":
      case "PDF":
        return <FileText size={14} />;
      case "AUDIO":
      case "WAV":
      case "MP3":
        return <Music size={14} />;
      case "VIDEO":
      case "MP4":
        return <Video size={14} />;
      case "DIR":
        return <Folder size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={14}
          />
          <input
            type="text"
            placeholder="Search storage..."
            className="w-full bg-slate-900 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs font-mono text-white focus:border-rq-blue focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length > 0 ? (
          <table className="w-full text-left text-xs font-mono text-slate-400">
            <thead className="text-[10px] text-slate-600 bg-slate-900/50 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Size</th>
                <th className="p-3 text-right">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {files.map((file, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-800/30 hover:text-rq-blue cursor-pointer transition-colors group"
                >
                  <td className="p-3 flex items-center gap-3 truncate max-w-[200px]">
                    <FileIcon type={file.type} />
                    <span className="text-white group-hover:text-rq-blue truncate">
                      {file.name}
                    </span>
                  </td>
                  <td className="p-3">{file.type}</td>
                  <td className="p-3">{file.size}</td>
                  <td className="p-3 text-right">{file.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 py-20">
            <Folder size={48} className="opacity-20" />
            <div className="text-center">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                {usingRealFiles
                  ? "No Files Found"
                  : "Secondary Storage Offline"}
              </p>
              <p className="text-[10px] font-mono mt-1 opacity-60">
                {usingRealFiles
                  ? "Real host data connected but directory is empty."
                  : "Bridge to device file system not established."}
              </p>
            </div>
          </div>
        )}
      </div>

      {!usingRealFiles && (
        <div className="p-4 text-center text-[10px] text-slate-600 italic border-t border-slate-900 mt-auto">
          Note: Local Core connection is required for live file synchronization.
        </div>
      )}
    </div>
  );
};

export default MobileFileManager;
