import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  Search,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Eye,
  FileJson,
  FileCode,
} from "lucide-react";
import { Subsystem } from "../types";
import { apiUrl } from "../config/api";

interface InvestigationReport {
  file: string;
  target: string;
  timestamp: number;
  riskScore: number;
  resultCount: number;
  summary?: string;
  enginesUsed?: string[];
  severity?: string;
}

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const InvestigationReports: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-cyan-400";
  const themeBorder = theme?.border || "border-cyan-500";
  const themeBg = theme?.bg || "bg-cyan-950/10";
  const themeHex = theme?.hex || "#06b6d4";
  const [reports, setReports] = useState<InvestigationReport[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<InvestigationReport | null>(null);
  const [reportDetails, setReportDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportFormat, setExportFormat] = useState<"json" | "markdown">(
    "markdown"
  );

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      fetchReportDetails(selectedReport.file);
    }
  }, [selectedReport]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/osint/investigations/list"));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setReports(data);
        } else if (
          data &&
          typeof data.reports === "object" &&
          data.reports !== null
        ) {
          if (Array.isArray(data.reports)) {
            setReports(data.reports);
          } else {
            setReports(Object.values(data.reports));
          }
        } else {
          setReports([]);
        }
      } else {
        setReports([]);
      }
    } catch (e) {
      console.error("Failed to fetch reports", e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (filename: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/osint/investigations/${encodeURIComponent(filename)}`)
      );
      if (res.ok) {
        const data = await res.json();
        setReportDetails(data);
      }
    } catch (e) {
      console.error("Failed to fetch report details");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (
    report: InvestigationReport,
    format: "json" | "markdown"
  ) => {
    if (!reportDetails) return;

    let content = "";
    let filename = "";
    let mimeType = "";

    if (format === "json") {
      content = JSON.stringify(reportDetails, null, 2);
      filename = `${report.target.replace(/[^a-zA-Z0-9]/g, "_")}_${
        report.timestamp
      }.json`;
      mimeType = "application/json";
    } else {
      // Generate Markdown report
      content = `# Investigation Report: ${report.target}\n\n`;
      content += `**Date:** ${new Date(report.timestamp).toLocaleString()}\n`;
      content += `**Risk Score:** ${report.riskScore}/100\n`;
      content += `**Severity:** ${reportDetails.meta?.SEVERITY || "UNKNOWN"}\n`;
      content += `**Results Found:** ${report.resultCount}\n`;
      content += `**Engines Used:** ${
        reportDetails.enginesUsed?.join(", ") || "N/A"
      }\n`;
      if (reportDetails.torIp) {
        content += `**Tor IP:** ${reportDetails.torIp}\n`;
      }
      content += `\n---\n\n`;

      if (reportDetails.summary) {
        content += `## Executive Summary\n\n${reportDetails.summary}\n\n---\n\n`;
      }

      content += `## Findings\n\n`;
      if (reportDetails.hits && reportDetails.hits.length > 0) {
        reportDetails.hits.forEach((hit: any, index: number) => {
          content += `### Finding ${index + 1}\n\n`;
          content += `- **Title:** ${hit.title || "N/A"}\n`;
          content += `- **URL:** \`${hit.url}\`\n`;
          content += `- **Engine:** ${hit.engine || "Unknown"}\n`;
          if (hit.snippet) {
            content += `- **Snippet:** ${hit.snippet.substring(0, 200)}...\n`;
          }
          content += `\n`;
        });
      } else {
        content += `No findings reported.\n\n`;
      }

      content += `---\n\n`;
      content += `## Metadata\n\n`;
      content += `\`\`\`json\n${JSON.stringify(
        reportDetails.meta || {},
        null,
        2
      )}\n\`\`\`\n`;

      filename = `${report.target.replace(/[^a-zA-Z0-9]/g, "_")}_${
        report.timestamp
      }.md`;
      mimeType = "text/markdown";
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSummary = async (report: InvestigationReport) => {
    if (!reportDetails) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/osint/investigations/summarize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: report.file }),
      });

      if (res.ok) {
        const data = await res.json();
        setReportDetails({ ...reportDetails, summary: data.summary });
        // Update report in list
        setReports(
          reports.map((r) =>
            r.file === report.file ? { ...r, summary: data.summary } : r
          )
        );
      }
    } catch (e) {
      console.error("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.file.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "HIGH":
        return "text-red-400";
      case "MEDIUM":
        return "text-yellow-400";
      case "LOW":
        return "text-green-400";
      default:
        return "text-slate-400";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-400";
    if (score >= 40) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 font-mono p-0 sm:p-4 overflow-hidden">
      <div
        className={`relative w-full h-full sm:h-[90vh] sm:w-[95%] max-w-sm sm:max-w-2xl lg:max-w-7xl bg-black/60 backdrop-blur-xl border-none sm:border ${themeBorder}/30 rounded-none sm:rounded-lg flex flex-col overflow-hidden`}
        style={{
          boxShadow: `0 0 50px ${themeHex}1a`,
        }}
      >
        {/* Header */}
        <div
          className={`h-16 flex-shrink-0 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-4 sm:px-6 relative z-30`}
        >
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div
              className={`p-1.5 sm:p-2 ${themeBg} rounded border ${themeBorder}/50 ${themePrimary} flex-shrink-0`}
            >
              <FileText size={20} className="sm:size-6" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-display text-base sm:text-xl font-bold text-white tracking-widest truncate">
                INVESTIGATION REPORTS
              </h2>
              <div
                className={`text-[9px] sm:text-[10px] font-mono ${themePrimary} flex gap-2 sm:gap-4 truncate`}
              >
                <span>TOTAL: {reports.length}</span>
                <span>ENGINE: OSINT_ARCHIVE</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 p-2 text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <X size={20} className="sm:size-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left: Report List */}
          {/* Sidebar: Report List */}
          <div
            className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r ${themeBorder}/30 bg-black/40 flex flex-col overflow-hidden h-48 lg:h-auto`}
          >
            <div
              className={`p-3 sm:p-4 border-b ${themeBorder}/30 flex-shrink-0`}
            >
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-2 top-2.5 text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 bg-black/40 border ${themeBorder}/30 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:${themeBorder}`}
                />
              </div>
              <div
                className={`text-[10px] sm:text-xs ${themePrimary} font-bold tracking-widest`}
              >
                INVESTIGATIONS ({filteredReports.length})
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading && reports.length === 0 ? (
                <div className="text-slate-600 text-xs italic p-4">
                  Loading reports...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-slate-600 text-xs italic p-4">
                  No reports found.
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.file}
                    onClick={() => setSelectedReport(report)}
                    className={`p-3 border rounded cursor-pointer transition-all mb-2 ${
                      selectedReport?.file === report.file
                        ? `${themeBorder} ${themeBg}`
                        : `${themeBorder}/30 hover:${themeBorder}/50`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <AlertTriangle
                          size={12}
                          className={`${getRiskColor(
                            report.riskScore
                          )} flex-shrink-0`}
                        />
                        <span className="text-white font-bold text-xs sm:text-sm truncate">
                          {report.target}
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 space-y-0.5 sm:space-y-1">
                      <div className="flex justify-between">
                        <span>RISK:</span>
                        <span
                          className={`${getRiskColor(
                            report.riskScore
                          )} font-bold`}
                        >
                          {report.riskScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>RESULTS:</span>
                        <span className={themePrimary}>
                          {report.resultCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>DATE:</span>
                        <span className="text-slate-500">
                          {formatDate(report.timestamp).split(",")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Center: Report Details */}
          <div className="flex-1 bg-black flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
            {selectedReport && reportDetails ? (
              <>
                <div
                  className={`h-auto sm:h-16 flex-shrink-0 border-b ${themeBorder}/30 bg-[#080808] flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:px-6 gap-3`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <FileText
                      size={18}
                      className={`${themePrimary} flex-shrink-0`}
                    />
                    <div className="overflow-hidden">
                      <h3 className="text-white font-bold text-sm sm:text-base truncate">
                        {selectedReport.target}
                      </h3>
                      <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                        {formatDate(selectedReport.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {!reportDetails.summary && (
                      <button
                        onClick={() => generateSummary(selectedReport)}
                        disabled={loading}
                        className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 ${themeBg} border ${themeBorder} ${themePrimary} text-[10px] sm:text-xs font-bold hover:opacity-80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5`}
                      >
                        <TrendingUp size={12} />{" "}
                        <span className="sm:inline">SUMMARY</span>
                      </button>
                    )}
                    <select
                      value={exportFormat}
                      onChange={(e) =>
                        setExportFormat(e.target.value as "json" | "markdown")
                      }
                      className="px-1.5 sm:px-2 py-1.5 bg-slate-900/20 border border-slate-700 text-slate-400 text-[10px] sm:text-xs font-bold focus:outline-none"
                    >
                      <option value="markdown">MD</option>
                      <option value="json">JSON</option>
                    </select>
                    <button
                      onClick={() => exportReport(selectedReport, exportFormat)}
                      className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 ${themeBg} border ${themeBorder} ${themePrimary} text-[10px] sm:text-xs font-bold transition-colors flex items-center justify-center gap-1.5`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${themeHex}66`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "";
                      }}
                    >
                      {exportFormat === "json" ? (
                        <FileJson size={12} />
                      ) : (
                        <FileCode size={12} />
                      )}
                      EXPORT
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0a0a]">
                  {/* Summary Section */}
                  {reportDetails.summary && (
                    <div
                      className={`mb-6 p-4 ${themeBg} border ${themeBorder}/30 rounded`}
                    >
                      <h4
                        className={`${themePrimary} font-bold mb-2 flex items-center gap-2`}
                      >
                        <TrendingUp size={14} /> EXECUTIVE SUMMARY
                      </h4>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">
                        {reportDetails.summary}
                      </p>
                    </div>
                  )}

                  {/* Risk Score */}
                  <div className="mb-6 p-4 bg-slate-950/10 border border-slate-900/30 rounded">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-bold">RISK ASSESSMENT</h4>
                      <span
                        className={`text-2xl font-bold ${getRiskColor(
                          selectedReport.riskScore
                        )}`}
                      >
                        {selectedReport.riskScore}/100
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          selectedReport.riskScore >= 70
                            ? "bg-red-500"
                            : selectedReport.riskScore >= 40
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${selectedReport.riskScore}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Severity:{" "}
                      <span
                        className={getSeverityColor(
                          reportDetails.meta?.SEVERITY
                        )}
                      >
                        {reportDetails.meta?.SEVERITY || "UNKNOWN"}
                      </span>
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="mb-6">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Eye size={16} /> FINDINGS (
                      {reportDetails.hits?.length || 0})
                    </h4>
                    <div className="space-y-3">
                      {reportDetails.hits && reportDetails.hits.length > 0 ? (
                        reportDetails.hits.map((hit: any, index: number) => (
                          <div
                            key={index}
                            className="p-3 bg-slate-950/10 border border-slate-900/30 rounded"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h5
                                className={`${themePrimary} font-bold text-sm`}
                              >
                                {hit.title || `Finding ${index + 1}`}
                              </h5>
                              <span className="text-xs text-slate-500">
                                {hit.engine || "Unknown"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mb-2 font-mono break-all">
                              {hit.url}
                            </div>
                            {hit.snippet && (
                              <p className="text-xs text-slate-300 mt-2">
                                {hit.snippet}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-600 text-sm italic">
                          No findings reported.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-4 bg-slate-950/10 border border-slate-900/30 rounded">
                    <h4 className="text-white font-bold mb-3">METADATA</h4>
                    <div className="text-xs text-slate-400 space-y-1 font-mono">
                      <div>
                        Engines:{" "}
                        {reportDetails.enginesUsed?.join(", ") || "N/A"}
                      </div>
                      {reportDetails.torIp && (
                        <div>Tor IP: {reportDetails.torIp}</div>
                      )}
                      <div>
                        Timestamp: {formatDate(reportDetails.timestamp)}
                      </div>
                      {reportDetails.meta && (
                        <div className="mt-2">
                          <pre className="text-xs">
                            {JSON.stringify(reportDetails.meta, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a report to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestigationReports;
