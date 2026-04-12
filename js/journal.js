/**
 * journal.js
 * Stories in Science (SINS) Lesson Journal
 * GitHub Pages compatible
 *
 * Responsibilities:
 * - Auto-save all journal textareas to localStorage
 * - Restore saved journal entries on page load
 * - Show save status messages
 * - Support required journal prompts before moving forward
 * - Store completed responses in a clean structure for export
 * - Listen for evidence sent from embedded interactives (for example NOAA)
 *
 * This file does not handle:
 * - Section navigation logic
 * - Resume code generation/loading
 * - Export download generation
 */

(function () {
  "use strict";

  const STORAGE_KEY = "sinsEcoRespondersJournal";
  const STATUS_ELEMENT_ID = "autosave-status";
  const JOURNAL_SELECTOR = "textarea[data-autosave='true'], textarea[data-autosave-journal='true']";

  const journalState = {
    entries: {},
    evidence: {},
    metadata: {
      updatedAt: Date.now()
    }
  };

  /**
   * Safely load journal data from localStorage.
   * @returns {object|null}
   */
  function loadStoredJournal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.warn("Could not load journal data.", error);
      return null;
    }
  }

  /**
   * Safely save journal data to localStorage.
   */
  function saveJournalState() {
    journalState.metadata.updatedAt = Date.now();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(journalState));
    } catch (error) {
      console.warn("Could not save journal data.", error);
    }
  }

  /**
   * Show save/help status to the user.
   * @param {string} message
   */
  function setStatus(message) {
    const statusElement = document.getElementById(STATUS_ELEMENT_ID);
    if (!statusElement) return;
    statusElement.textContent = message;
  }

  /**
   * Build a stable journal key for a textarea.
   * Priority:
   * - data-journal-section
   * - id
   * @param {HTMLTextAreaElement} textarea
   * @returns {string|null}
   */
  function getEntryKey(textarea) {
    if (!textarea) return null;
    return textarea.dataset.journalSection || textarea.id || null;
  }

  /**
   * Store a textarea's value in memory.
   * @param {HTMLTextAreaElement} textarea
   */
  function storeTextareaValue(textarea) {
    const key = getEntryKey(textarea);
    if (!key) return;

    const value = textarea.value || "";
    const promptTitle = findPromptTitle(textarea);
    const promptText = findPromptText(textarea);
    const sectionTitle = findSectionTitle(textarea);

    journalState.entries[key] = {
      key,
      elementId: textarea.id || "",
      sectionTitle,
      promptTitle,
      promptText,
      value,
      completed: value.trim().length > 0,
      updatedAt: Date.now()
    };

    saveJournalState();
    setStatus("Field Journal saved.");
  }

  /**
   * Find a human-readable section title for export.
   * @param {HTMLElement} element
   * @returns {string}
   */
  function findSectionTitle(element) {
    const section = element.closest("section");
    if (!section) return "Lesson Section";

    const heading = section.querySelector("h1, h2, h3");
    if (heading && heading.textContent.trim()) {
      return heading.textContent.trim();
    }

    return section.id || "Lesson Section";
  }

  /**
   * Find the journal prompt title.
   * Usually "Field Journal" or similar heading inside the journal block.
   * @param {HTMLElement} element
   * @returns {string}
   */
  function findPromptTitle(element) {
    const journalBlock = element.closest(".journal-block");
    if (!journalBlock) return "Journal Entry";

    const title = journalBlock.querySelector("h1, h2, h3, h4");
    if (title && title.textContent.trim()) {
      return title.textContent.trim();
    }

    return "Journal Entry";
  }

  /**
   * Collect prompt paragraph text nearest the textarea.
   * @param {HTMLElement} element
   * @returns {string[]}
   */
  function findPromptText(element) {
    const journalBlock = element.closest(".journal-block");
    if (!journalBlock) return [];

    const paragraphs = Array.from(journalBlock.querySelectorAll("p"))
      .map((paragraph) => paragraph.textContent.trim())
      .filter(Boolean);

    return paragraphs;
  }

  /**
   * Restore textarea values from saved journal state.
   */
  function restoreJournalEntries() {
    const textareas = Array.from(document.querySelectorAll(JOURNAL_SELECTOR));

    textareas.forEach((textarea) => {
      const key = getEntryKey(textarea);
      if (!key) return;

      const savedEntry = journalState.entries[key];
      if (!savedEntry) return;

      textarea.value = savedEntry.value || "";
    });
  }

  /**
   * Attach autosave listeners to all journal textareas.
   */
  function attachJournalListeners() {
    const textareas = Array.from(document.querySelectorAll(JOURNAL_SELECTOR));

    textareas.forEach((textarea) => {
      textarea.addEventListener("input", () => {
        storeTextareaValue(textarea);
      });

      textarea.addEventListener("change", () => {
        storeTextareaValue(textarea);
      });

      textarea.addEventListener("blur", () => {
        storeTextareaValue(textarea);
      });
    });
  }

  /**
   * Listen for interactive evidence sent via postMessage.
   * Supported payload example:
   * {
   *   type: "SINS_NOAA_EVIDENCE",
   *   source: "NOAA Data Review Simulator",
   *   indicator: "...",
   *   formattedText: "..."
   * }
   *
   * @param {MessageEvent} event
   */
  function handleInteractiveMessage(event) {
    const payload = event.data;

    if (!payload || typeof payload !== "object") return;
    if (!payload.type) return;

    if (payload.type === "SINS_NOAA_EVIDENCE") {
      storeEvidence("NOAA_Data_Review_Simulator", payload);
      injectEvidenceIntoLikelyJournal(payload);
      setStatus("NOAA evidence saved to Field Journal.");
    }

    if (payload.type === "SINS_FEEDBACK_LOOP_MODEL") {
      storeEvidence("Feedback_Loop_Model", payload);
      setStatus("Feedback loop model saved to Field Journal.");
    }
  }

  /**
   * Store interactive evidence in journal state.
   * @param {string} key
   * @param {object} payload
   */
  function storeEvidence(key, payload) {
    journalState.evidence[key] = {
      ...payload,
      updatedAt: Date.now()
    };

    saveJournalState();
  }

  /**
   * Optionally inject NOAA evidence into the most likely journal textarea
   * if it is currently empty.
   * This makes the journal feel connected without overwriting student writing.
   *
   * @param {object} payload
   */
  function injectEvidenceIntoLikelyJournal(payload) {
    const likelyTargets = [
      document.getElementById("journal-3A-reflection"),
      document.getElementById("journal-3A-inference"),
      document.querySelector("textarea[data-journal-section='3A']"),
      document.querySelector("textarea[data-journal-section='3A_NOAA_Inference']")
    ].filter(Boolean);

    if (!likelyTargets.length) return;

    const target = likelyTargets[0];
    if (!target.value.trim() && payload.formattedText) {
      target.value = payload.formattedText;
      storeTextareaValue(target);
    }
  }

  /**
   * Check whether required journal prompts are filled before moving forward.
   * Required logic:
   * - If the current visible section contains at least one journal textarea,
   *   those entries must be completed before clicking a forward navigation button.
   * - Back buttons are always allowed.
   *
   * @param {MouseEvent} event
   */
  function validateBeforeNavigation(event) {
    const button = event.target.closest("[data-nav-target]");
    if (!button) return;

    const navTarget = button.dataset.navTarget;
    if (!navTarget) return;

    // Allow back navigation
    const buttonText = button.textContent.trim().toLowerCase();
    const isBackButton =
      navTarget === "previous" ||
      buttonText.includes("back") ||
      button.classList.contains("secondary-button");

    if (isBackButton) return;

    const currentVisibleSection = getCurrentVisibleSection();
    if (!currentVisibleSection) return;

    const journalTextareas = Array.from(
      currentVisibleSection.querySelectorAll("textarea[data-autosave='true']")
    );

    if (!journalTextareas.length) return;

    const incompleteRequired = journalTextareas.filter((textarea) => {
      // Optional challenge textareas should not block navigation
      if (textarea.closest(".optional-challenge")) {
        return false;
      }

      return !textarea.value.trim();
    });

    if (incompleteRequired.length > 0) {
      event.preventDefault();
      event.stopPropagation();

      setStatus("Please complete the Field Journal before continuing.");
      incompleteRequired[0].focus();
    }
  }

  /**
   * Find the current visible lesson section.
   * @returns {HTMLElement|null}
   */
  function getCurrentVisibleSection() {
    const allSections = Array.from(document.querySelectorAll("section[id^='section-']"));

    const visible = allSections.filter((section) => {
      return !section.hidden && section.classList.contains("is-visible");
    });

    if (!visible.length) return null;

    return visible[visible.length - 1];
  }

  /**
   * Build a clean export-ready snapshot for other modules.
   * Available globally as window.SINSJournal.getExportData()
   * @returns {object}
   */
  function getExportData() {
    const completedEntries = Object.values(journalState.entries)
      .filter((entry) => entry && entry.completed)
      .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));

    const evidenceEntries = Object.values(journalState.evidence);

    return {
      entries: completedEntries,
      evidence: evidenceEntries,
      metadata: {
        lessonTitle: document.querySelector(".lesson-title")?.textContent?.trim() || "Stories in Science Lesson",
        exportedAt: Date.now()
      }
    };
  }

  /**
   * Reset journal data.
   */
  function resetJournal() {
    journalState.entries = {};
    journalState.evidence = {};
    journalState.metadata.updatedAt = Date.now();

    const textareas = Array.from(document.querySelectorAll(JOURNAL_SELECTOR));
    textareas.forEach((textarea) => {
      textarea.value = "";
    });

    saveJournalState();
    setStatus("Field Journal cleared.");
  }

  /**
   * Initialize journal state from localStorage.
   */
  function initializeJournalState() {
    const saved = loadStoredJournal();
    if (!saved) {
      saveJournalState();
      return;
    }

    journalState.entries = saved.entries && typeof saved.entries === "object" ? saved.entries : {};
    journalState.evidence = saved.evidence && typeof saved.evidence === "object" ? saved.evidence : {};
    journalState.metadata = saved.metadata && typeof saved.metadata === "object"
      ? saved.metadata
      : { updatedAt: Date.now() };
  }

  /**
   * Public API
   */
  window.SINSJournal = {
    getState() {
      return JSON.parse(JSON.stringify(journalState));
    },
    getExportData,
    saveAll() {
      const textareas = Array.from(document.querySelectorAll(JOURNAL_SELECTOR));
      textareas.forEach(storeTextareaValue);
      setStatus("All journal entries saved.");
    },
    reset: resetJournal
  };

  /**
   * Init
   */
  function init() {
    initializeJournalState();
    restoreJournalEntries();
    attachJournalListeners();

    window.addEventListener("message", handleInteractiveMessage);
    document.addEventListener("click", validateBeforeNavigation, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

