/**
 * Mobile Model Manager Component
 * UI for downloading/deleting the Mobile Offline Brain model.
 *
 * Features:
 * - Download progress bar
 * - Storage usage display
 * - Delete model option
 */

import React, { useState, useEffect } from "react";
import { mobileOfflineBrain } from "../../services/mobile/MobileOfflineBrain";

interface MobileModelManagerProps {
  onStatusChange?: (status: "ready" | "downloading" | "not_downloaded") => void;
}

export const MobileModelManager: React.FC<MobileModelManagerProps> = ({
  onStatusChange,
}) => {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const modelSize = mobileOfflineBrain.getModelSize();

  // Check initial state
  useEffect(() => {
    checkModelStatus();
  }, []);

  const checkModelStatus = async () => {
    const available = await mobileOfflineBrain.isModelAvailable();
    setIsDownloaded(available);
    onStatusChange?.(available ? "ready" : "not_downloaded");
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setDownloadProgress(0);
    onStatusChange?.("downloading");

    const success = await mobileOfflineBrain.downloadModel(
      (downloaded, total) => {
        const percent = Math.round((downloaded / total) * 100);
        setDownloadProgress(percent);
      }
    );

    setIsDownloading(false);

    if (success) {
      setIsDownloaded(true);
      onStatusChange?.("ready");
      // Initialize after download
      await mobileOfflineBrain.initialize();
    } else {
      setError("Download failed. Please check your connection and try again.");
      onStatusChange?.("not_downloaded");
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete Offline Brain? You'll need to re-download it to use offline features."
    );
    if (!confirmed) return;

    const success = await mobileOfflineBrain.deleteModel();
    if (success) {
      setIsDownloaded(false);
      onStatusChange?.("not_downloaded");
    }
  };

  return (
    <div className="mobile-model-manager">
      <div className="model-header">
        <h3>📱 Offline Brain</h3>
        <span className="model-name">Gemma 2B</span>
      </div>

      <p className="model-description">
        Download a local AI model to use Luca without internet. Works in
        airplane mode!
      </p>

      {/* Status Display */}
      <div className="model-status">
        {isDownloaded ? (
          <div className="status-ready">
            <span className="status-icon">✅</span>
            <span>Ready to use offline</span>
          </div>
        ) : (
          <div className="status-not-downloaded">
            <span className="status-icon">⬇️</span>
            <span>Not downloaded ({modelSize.formatted})</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isDownloading && (
        <div className="download-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <span className="progress-text">{downloadProgress}%</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="download-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="model-actions">
        {!isDownloaded && !isDownloading && (
          <button className="btn-download" onClick={handleDownload}>
            Download Offline Brain
          </button>
        )}

        {isDownloading && (
          <button className="btn-downloading" disabled>
            Downloading...
          </button>
        )}

        {isDownloaded && (
          <button className="btn-delete" onClick={handleDelete}>
            Delete Model
          </button>
        )}
      </div>

      {/* Storage Info */}
      <div className="storage-info">
        <small>
          Storage required: {modelSize.formatted}
          <br />
          Model: Gemma 2B Instruct (Int4 Quantized)
        </small>
      </div>

      <style>{`
        .mobile-model-manager {
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          padding: 16px;
          margin: 12px 0;
        }

        .model-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .model-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .model-name {
          font-size: 12px;
          opacity: 0.7;
          background: rgba(255,255,255,0.1);
          padding: 2px 8px;
          border-radius: 12px;
        }

        .model-description {
          font-size: 13px;
          opacity: 0.8;
          margin: 8px 0;
        }

        .model-status {
          margin: 12px 0;
        }

        .status-ready, .status-not-downloaded {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
        }

        .status-ready {
          color: #4ade80;
        }

        .status-not-downloaded {
          color: #fbbf24;
        }

        .download-progress {
          margin: 12px 0;
        }

        .progress-bar {
          height: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          opacity: 0.7;
          display: block;
          text-align: center;
          margin-top: 4px;
        }

        .download-error {
          color: #f87171;
          font-size: 13px;
          margin: 8px 0;
        }

        .model-actions {
          margin: 12px 0;
        }

        .btn-download, .btn-delete, .btn-downloading {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-download {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
        }

        .btn-download:hover {
          transform: scale(1.02);
        }

        .btn-delete {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .btn-delete:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .btn-downloading {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          cursor: not-allowed;
        }

        .storage-info {
          margin-top: 12px;
          opacity: 0.5;
          font-size: 11px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default MobileModelManager;
