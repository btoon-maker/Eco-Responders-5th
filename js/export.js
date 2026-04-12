/**
 * export.js
 * Stories in Science (SINS) Lesson Export
 * GitHub Pages compatible
 *
 * Responsibilities:
 * - Export completed journal responses only
 * - Include decision choices when available
 * - Include interactive evidence when available
 * - Download as a plain text file
 * - Attach to existing export buttons
 *
 * This file works with:
 * - journal.js (window.SINSJournal)
 * - navigation.js (window.SINSNavigation)
 * - resume.js (optional)
 * - interactives.js (indirectly through journal evidence)
 */

(function () {
  "use strict";

  const DEFAULT_FILENAME = "Eco-Responders_Field_Journal.txt";

  /**
   * Show export status to the user.
   * @param {string} message
   */
  function setExportStatus(message) {
    const status =
      document.getElementById("export-status") ||
      document.getElementById("autosave-status") ||
      document.getElementById("progression-reveal-status");

    if (status) {
      status.textContent = message;
    }
  }

  /**
   * Get export-ready journal data.
   * @returns {{entries:Array, evidence:Array, metadata:Object}}
   */
  function getJournalExportData() {
    if (window.SINSJournal && typeof window.SINSJournal.getExportData === "function") {
      return window.SINSJournal.getExportData();
    }

    return {
      entries: [],
      evidence: [],
      metadata: {
        lessonTitle: document.title || "Stories in Science Lesson",
        exportedAt: Date.now()
      }
    };
  }

  /**
   * Get navigation decisions if available.
   * @returns {Array}
   */
  function getDecisionData() {
    if (
      window.SINSNavigation &&
      typeof window.SINSNavigation.getState === "function"
    ) {
      const navigationState = window.SINSNavigation.getState();
      const decisions = navigationState?.decisions || {};

      return Object.values(decisions)
        .filter(Boolean)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    return [];
  }

  /**
   * Build readable lesson header.
   * @param {Object} metadata
   * @returns {string[]}
   */
  function buildHeader(metadata) {
    const lessonTitle =
      metadata?.lessonTitle ||
      document.querySelector(".lesson-title")?.textContent?.trim() ||
      "Stories in Science Lesson";

    const exportedDate = metadata?.exportedAt
      ? new Date(metadata.exportedAt).toLocaleString()
      : new Date().toLocaleString();

    return [
      lessonTitle,
      "=".repeat(lessonTitle.length),
      `Exported: ${exportedDate}`,
      ""
    ];
  }

  /**
   * Build decisions section.
   * @param {Array} decisions
   * @returns {string[]}
   */
  function buildDecisionsSection(decisions) {
    if (!decisions.length) return [];

    const lines = [
      "Decision Choices",
      "----------------"
    ];

    decisions.forEach((decision, index) => {
      const title = decision.decisionId || `Decision ${index + 1}`;
      const choice = decision.decisionValue || "No choice recorded";
      const branchLabel = decision.branchLabel ? ` (${decision.branchLabel})` : "";

      lines.push(`${index + 1}. ${title}: ${choice}${branchLabel}`);
    });

    lines.push("");
    return lines;
  }

  /**
   * Build journal entries section.
   * Only includes completed entries.
   * @param {Array} entries
   * @returns {string[]}
   */
  function buildEntriesSection(entries) {
    if (!entries.length) return [];

    const lines = [
      "Field Journal Responses",
      "-----------------------"
    ];

    entries.forEach((entry, index) => {
      const sectionTitle = entry.sectionTitle || "Lesson Section";
      const promptTitle = entry.promptTitle || "Journal Entry";
      const promptTextLines = Array.isArray(entry.promptText)
        ? entry.promptText.filter(Boolean)
        : [];

      lines.push(`${index + 1}. ${sectionTitle}`);
      lines.push(`Prompt Title: ${promptTitle}`);

      if (promptTextLines.length) {
        lines.push("Prompt:");
        promptTextLines.forEach((line) => {
          lines.push(`- ${line}`);
        });
      }

      lines.push("Response:");
      lines.push(entry.value || "");
      lines.push("");
    });

    return lines;
  }

  /**
   * Build interactive evidence section.
   * @param {Array} evidence
   * @returns {string[]}
   */
  function buildEvidenceSection(evidence) {
    if (!evidence.length) return [];

    const lines = [
      "Interactive Evidence",
      "--------------------"
    ];

    evidence.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.source || "Interactive Tool"}`);

      if (item.formattedText) {
        lines.push(item.formattedText);
      } else {
        Object.entries(item).forEach(([key, value]) => {
          if (key === "updatedAt" || key === "type") return;
          if (typeof value === "object") {
            lines.push(`${key}: ${JSON.stringify(value)}`);
          } else {
            lines.push(`${key}: ${String(value)}`);
          }
        });
      }

      lines.push("");
    });

    return lines;
  }

  /**
   * Build final export text.
   * @returns {string}
   */
  function buildExportText() {
    const exportData = getJournalExportData();
    const decisions = getDecisionData();

    const completedEntries = Array.isArray(exportData.entries)
      ? exportData.entries.filter((entry) => entry && entry.completed)
      : [];

    const evidence = Array.isArray(exportData.evidence)
      ? exportData.evidence.filter(Boolean)
      : [];

    const lines = [
      ...buildHeader(exportData.metadata),
      ...buildDecisionsSection(decisions),
      ...buildEntriesSection(completedEntries),
      ...buildEvidenceSection(evidence)
    ];

    if (!completedEntries.length && !evidence.length && !decisions.length) {
      lines.push("No completed responses were available to export.");
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Download text as a file.
   * @param {string} filename
   * @param {string} text
   */
  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Handle export button click.
   * @param {MouseEvent} event
   */
  function handleExportClick(event) {
    const button = event.target.closest("#export-journal-btn, [data-action='export-journal']");
    if (!button) return;

    event.preventDefault();

    // Save journal first if available.
    if (window.SINSJournal && typeof window.SINSJournal.saveAll === "function") {
      window.SINSJournal.saveAll();
    }

    // Save resume snapshot too if available.
    if (window.SINSResume && typeof window.SINSResume.saveNow === "function") {
      try {
        window.SINSResume.saveNow();
      } catch (error) {
        console.warn("Resume snapshot could not be saved before export.", error);
      }
    }

    const exportText = buildExportText();
    downloadTextFile(DEFAULT_FILENAME, exportText);
    setExportStatus("Field Journal exported.");
  }

  /**
   * Public API
   */
  window.SINSExport = {
    buildExportText,
    exportNow() {
      const text = buildExportText();
      downloadTextFile(DEFAULT_FILENAME, text);
      setExportStatus("Field Journal exported.");
    }
  };

  /**
   * Init
   */
  function init() {
    document.addEventListener("click", handleExportClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
