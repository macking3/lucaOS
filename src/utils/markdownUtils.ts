import { PersonaType } from "../services/lucaService";

/**
 * Get theme colors for bold text box based on persona
 */
export function getBoldBoxColors(persona: PersonaType): {
  bg: string;
  border: string;
  text: string;
} {
  const colorMap: Record<
    PersonaType,
    { bg: string; border: string; text: string }
  > = {
    DEFAULT: {
      bg: "rgba(59, 130, 246, 0.15)",
      border: "rgba(59, 130, 246, 0.4)",
      text: "#93c5fd",
    },
    RUTHLESS: {
      bg: "rgba(59, 130, 246, 0.15)",
      border: "rgba(59, 130, 246, 0.4)",
      text: "#93c5fd",
    },
    ENGINEER: {
      bg: "rgba(201, 118, 61, 0.15)",
      border: "rgba(201, 118, 61, 0.4)",
      text: "#D2691E",
    },
    ASSISTANT: {
      bg: "rgba(224, 224, 224, 0.15)",
      border: "rgba(224, 224, 224, 0.4)",
      text: "#E0E0E0",
    },
    HACKER: {
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.4)",
      text: "#86efac",
    },
    DICTATION: {
      bg: "rgba(168, 85, 247, 0.15)",
      border: "rgba(168, 85, 247, 0.4)",
      text: "#d8b4fe",
    },
  };

  return colorMap[persona] || colorMap.RUTHLESS;
}

/**
 * Comprehensive markdown renderer for chat messages
 * Converts markdown syntax to styled HTML like Cursor/Antigravity
 */
export function renderMarkdown(
  text: string,
  persona: PersonaType = "RUTHLESS"
): string {
  if (!text) return "";

  // 1. Initial Cleanup: Standardize newlines
  let html = text.trim().replace(/\r\n/g, "\n");

  // 2. Escape HTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // --- BLOCK ELEMENTS (process these first to avoid paragraph wrapping later) ---

  // CODE BLOCKS
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : "";
    return `\n<div class="code-block-container"><pre><code>${code.trim()}</code></pre>${langLabel}</div>\n`;
  });

  // TABLES
  html = html.replace(
    /(\|.+\|\n)((?:\|[-:| ]+\|\n))((?:\|.+\|\n?)*)/g,
    (match, headerRow, separator, bodyRows) => {
      const headers = headerRow.split("|").filter((c: string) => c.trim());
      const rows = bodyRows
        .trim()
        .split("\n")
        .filter((r: string) => r.trim());
      let table = '\n<div class="table-wrapper"><table><thead><tr>';
      headers.forEach((h: string) => (table += `<th>${h.trim()}</th>`));
      table += "</tr></thead><tbody>";
      rows.forEach((row: string) => {
        const cells = row.split("|").filter((c: string) => c.trim());
        table += "<tr>";
        cells.forEach((cell: string) => (table += `<td>${cell.trim()}</td>`));
        table += "</tr>";
      });
      table += "</tbody></table></div>\n";
      return table;
    }
  );

  // HEADERS
  html = html.replace(/^#{4}\s+(.+)$/gm, "\n<h4>$1</h4>\n");
  html = html.replace(/^#{3}\s+(.+)$/gm, "\n<h3>$1</h3>\n");
  html = html.replace(/^#{2}\s+(.+)$/gm, "\n<h2>$1</h2>\n");
  html = html.replace(/^#{1}\s+(.+)$/gm, "\n<h1>$1</h1>\n");

  // LISTS (Standard UL/OL)
  // First, convert the items to <li> tags
  html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, "<li>$2</li>");
  html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, "<li>$2</li>");

  // Wrap contiguous <li> blocks in <ul> or <ol>
  // This version is careful about not catching random <li> if we had them elsewhere
  html = html.replace(/(?:<li>[\s\S]*?<\/li>[\n\s]*)+/g, (match) => {
    const isOrdered = /^\d+\./.test(
      text
        .split("\n")
        .find((l) => match.includes(l.replace(/^\d+\.\s+/, ""))) || ""
    );
    const listTag = isOrdered ? "ol" : "ul";
    // Clean up internal newlines that would cause <br> tags later
    const cleanMatch = match.replace(/<\/li>[\n\s]*<li>/g, "</li><li>").trim();
    return `\n<${listTag}>${cleanMatch}</${listTag}>\n`;
  });

  // BLOCKQUOTES
  html = html.replace(/^&gt;\s*(.+)$/gm, "\n<blockquote>$1</blockquote>\n");

  // --- INLINE ELEMENTS ---
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );

  // --- PARAGRAPHS & CLEANUP ---
  // 1. Split by block-level marks (\n markers we added)
  // 2. Wrap non-block lines in <p>
  const parts = html.split(/\n+/);
  html = parts
    .map((p) => {
      p = p.trim();
      if (!p) return "";
      if (/^<(h\d|ul|ol|table|blockquote|div|p|pre)/.test(p)) return p;
      return `<p>${p}</p>`;
    })
    .join("\n");

  // Finally, any remaining single newlines inside blocks (like p) should be <br />
  // But we want to avoid extra <br /> at tag boundaries
  html = html.replace(/>\n+</g, "><"); // Remove newlines between tags
  html = html.replace(/\n/g, "<br />");

  return html.trim();
}
