/**
 * Model Manager Component
 * Unified UI for managing all local AI models on Desktop.
 *
 * Shows: Download status, storage usage, download/delete buttons
 */

import React, { useState, useEffect } from "react";
import {
  modelManager,
  LocalModel,
  ModelManagerService,
} from "../services/ModelManagerService";

interface ModelManagerProps {
  onClose?: () => void;
}

const getCategoryIcon = (category: LocalModel["category"]) => {
  switch (category) {
    case "brain":
      return "🧠";
    case "vision":
      return "👁️";
    case "tts":
      return "🔊";
    case "agent":
      return "🤖";
    default:
      return "📦";
  }
};

const getCategoryLabel = (category: LocalModel["category"]) => {
  switch (category) {
    case "brain":
      return "Chat Brain";
    case "vision":
      return "Vision";
    case "tts":
      return "Voice";
    case "agent":
      return "Automation";
    default:
      return "Other";
  }
};

export const ModelManager: React.FC<ModelManagerProps> = ({ onClose }) => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [platform] = useState<"desktop" | "mobile">(
    ModelManagerService.getCurrentPlatform()
  );

  // Load models on mount (filtered by platform)
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      const data = await modelManager.getModelsForPlatform(platform);
      setModels(data);
      setIsLoading(false);
    };

    loadModels();

    // Subscribe to updates (and filter by platform)
    const unsubscribe = modelManager.subscribe((allModels) => {
      setModels(allModels.filter((m) => m.platforms.includes(platform)));
    });
    return () => unsubscribe();
  }, [platform]);

  const handleDownload = async (modelId: string) => {
    setDownloadingId(modelId);
    await modelManager.downloadModel(modelId);
    setDownloadingId(null);
  };

  const handleDelete = async (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;

    const confirmed = window.confirm(
      `Delete ${model.name}? You'll need to re-download it to use offline features.`
    );
    if (!confirmed) return;

    await modelManager.deleteModel(modelId);
  };

  const totalStorage = modelManager.getTotalStorageUsed();

  return (
    <div className="model-manager">
      <div className="manager-header">
        <h2>🧠 Local Models</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <p className="manager-description">
        Download AI models to use Luca offline. Models are stored locally and
        never leave your device.
      </p>

      {/* Storage Summary */}
      <div className="storage-summary">
        <span className="storage-label">Storage Used:</span>
        <span className="storage-value">{totalStorage.formatted}</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <span>Checking model status...</span>
        </div>
      )}

      {/* Model List */}
      <div className="model-list">
        {models.map((model) => (
          <div key={model.id} className={`model-card status-${model.status}`}>
            <div className="model-icon">{getCategoryIcon(model.category)}</div>

            <div className="model-info">
              <div className="model-header-row">
                <span className="model-name">{model.name}</span>
                <span className="model-category">
                  {getCategoryLabel(model.category)}
                </span>
              </div>
              <p className="model-description">{model.description}</p>
              <span className="model-size">{model.sizeFormatted}</span>
            </div>

            <div className="model-actions">
              {model.status === "ready" && (
                <>
                  <span className="status-badge ready">✓ Ready</span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(model.id)}
                  >
                    Delete
                  </button>
                </>
              )}

              {model.status === "not_downloaded" && (
                <button
                  className="btn-download"
                  onClick={() => handleDownload(model.id)}
                  disabled={downloadingId !== null}
                >
                  Download
                </button>
              )}

              {model.status === "downloading" && (
                <div className="download-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${model.downloadProgress || 0}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {model.downloadProgress || 0}%
                  </span>
                </div>
              )}

              {model.status === "error" && (
                <>
                  <span className="status-badge error">⚠️ Error</span>
                  <button
                    className="btn-retry"
                    onClick={() => handleDownload(model.id)}
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .model-manager {
          background: var(--bg-primary, #0a0a14);
          border-radius: 16px;
          padding: 24px;
          max-width: 600px;
          margin: 0 auto;
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .manager-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 18px;
          cursor: pointer;
        }

        .manager-description {
          opacity: 0.7;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .storage-summary {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .storage-label {
          opacity: 0.7;
        }

        .storage-value {
          font-weight: 600;
          color: #4ade80;
        }

        .loading-state {
          text-align: center;
          padding: 20px;
          opacity: 0.5;
        }

        .model-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .model-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s;
        }

        .model-card:hover {
          background: rgba(255,255,255,0.05);
        }

        .model-card.status-ready {
          border-color: rgba(74, 222, 128, 0.3);
        }

        .model-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }

        .model-info {
          flex: 1;
          min-width: 0;
        }

        .model-header-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .model-name {
          font-weight: 600;
          font-size: 15px;
        }

        .model-category {
          font-size: 11px;
          padding: 2px 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          opacity: 0.7;
        }

        .model-info .model-description {
          font-size: 12px;
          opacity: 0.6;
          margin: 4px 0;
          line-height: 1.4;
        }

        .model-size {
          font-size: 12px;
          opacity: 0.5;
        }

        .model-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          min-width: 100px;
        }

        .status-badge {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 12px;
        }

        .status-badge.ready {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
        }

        .status-badge.error {
          background: rgba(248, 113, 113, 0.15);
          color: #f87171;
        }

        .btn-download, .btn-delete, .btn-retry {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-download {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
        }

        .btn-download:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .btn-download:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-delete {
          background: rgba(248, 113, 113, 0.15);
          color: #f87171;
        }

        .btn-delete:hover {
          background: rgba(248, 113, 113, 0.25);
        }

        .btn-retry {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .download-progress {
          width: 100%;
        }

        .progress-bar {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 11px;
          opacity: 0.7;
          display: block;
          text-align: right;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default ModelManager;
