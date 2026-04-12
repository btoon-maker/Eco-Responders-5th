 /**
 * resume.js
 * Stories in Science (SINS) Lesson Resume Code System
 * GitHub Pages compatible
 *
 * Responsibilities:
 * - Generate a unique resume code for the current learner/session
 * - Store and retrieve that code from localStorage
 * - Save the current lesson state under the resume code
 * - Load lesson state from an entered resume code
 * - Restore:
 *    - navigation state
 *    - journal state
 * - Keep UI updated for:
 *    - resume code display
 *    - load/generate buttons
 *
 * This file expects these optional HTML elements:
 * - #resume-code-input
 * - #resume-code-load-btn
 * - #resume-code-generate-btn
 * - #resume-code-display
 *
 * This file works with:
 * - navigation.js (window.SINSNavigation)
 * - journal.js (window.SINSJournal)
 */

(function () {
  "use strict";

  const ACTIVE_RESUME_KEY = "sinsEcoRespondersActiveResumeCode";
  const REGISTRY_KEY = "sinsEcoRespondersResumeRegistry";

  const NAV_STORAGE_KEY = "sinsEcoRespondersNavigation";
  const JOURNAL_STORAGE_KEY = "sinsEcoRespondersJournal";

  /**
   * Safely read JSON from localStorage.
   * @param {string} key
   * @returns {any|null}
   */
  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Could not read storage key "${key}".`, error);
      return null;
    }
  }

  /**
   * Safely write JSON to localStorage.
   * @param {string} key
   * @param {any} value
   */
  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not write storage key "${key}".`, error);
    }
  }

  /**
   * Read plain string from localStorage.
   * @param {string} key
   * @returns {string}
   */
  function readString(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (error) {
      console.warn(`Could not read string storage key "${key}".`, error);
      return "";
    }
  }

  /**
   * Write plain string to localStorage.
   * @param {string} key
   * @param {string} value
   */
  function writeString(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Could not write string storage key "${key}".`, error);
    }
  }

  /**
   * Get status region used elsewhere in the lesson.
   * @returns {HTMLElement|null}
   */
  function getStatusElement() {
    return (
      document.getElementById("resume-code-display") ||
      document.getElementById("autosave-status") ||
      document.getElementById("progression-reveal-status")
    );
  }

  /**
   * Set a visible status/help message.
   * @param {string} message
   */
  function setStatus(message) {
    const status = getStatusElement();
    if (!status) return;
    status.textContent = message;
  }

  /**
   * Get the registry object.
   * Registry shape:
   * {
   *   ABC123: {
   *     createdAt: 0,
   *     updatedAt: 0,
   *     lessonTitle: "...",
   *     navigation: {...},
   *     journal: {...}
   *   }
   * }
   *
   * @returns {Record<string, any>}
   */
  function getRegistry() {
    const registry = readStorage(REGISTRY_KEY);
    return registry && typeof registry === "object" ? registry : {};
  }

  /**
   * Save registry.
   * @param {Record<string, any>} registry
   */
  function saveRegistry(registry) {
    writeStorage(REGISTRY_KEY, registry);
  }

  /**
   * Create a friendly resume code.
   * Example: FIRE-4821 or ECO-7318
   * @returns {string}
   */
  function generateResumeCodeValue() {
    const prefixes = ["ECO", "FIRE", "MAPLE", "GLEN", "SPARK"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${digits}`;
  }

  /**
   * Ensure generated code is unique within the registry.
   * @returns {string}
   */
  function createUniqueResumeCode() {
    const registry = getRegistry();
    let code = generateResumeCodeValue();

    while (registry[code]) {
      code = generateResumeCodeValue();
    }

    return code;
  }

  /**
   * Get active resume code from localStorage.
   * @returns {string}
   */
  function getActiveResumeCode() {
    return readString(ACTIVE_RESUME_KEY).trim();
  }

  /**
   * Set active resume code and update display.
   * @param {string} code
   */
  function setActiveResumeCode(code) {
    writeString(ACTIVE_RESUME_KEY, code);
    updateResumeDisplay(code);
  }

  /**
   * Update input/display UI.
   * @param {string} code
   */
  function updateResumeDisplay(code) {
    const input = document.getElementById("resume-code-input");
    const display = document.getElementById("resume-code-display");

    if (input && code && !input.value.trim()) {
      input.value = code;
    }

    if (display) {
      display.textContent = code
        ? `Your resume code: ${code}`
        : "Generate a resume code to save your progress.";
    }
  }

  /**
   * Collect current lesson snapshot.
   * @returns {{navigation:any, journal:any, lessonTitle:string, updatedAt:number}}
   */
  function buildLessonSnapshot() {
    const navigation =
      readStorage(NAV_STORAGE_KEY) ||
      (window.SINSNavigation?.getState ? window.SINSNavigation.getState() : null) ||
      {};

    const journal =
      readStorage(JOURNAL_STORAGE_KEY) ||
      (window.SINSJournal?.getState ? window.SINSJournal.getState() : null) ||
      {};

    const lessonTitle =
      document.querySelector(".lesson-title")?.textContent?.trim() ||
      document.title ||
      "Stories in Science Lesson";

    return {
      lessonTitle,
      updatedAt: Date.now(),
      navigation,
      journal
    };
  }

  /**
   * Save the current lesson state under a specific resume code.
   * @param {string} code
   */
  function saveSnapshotForCode(code) {
    if (!code) return;

    const registry = getRegistry();
    const existing = registry[code] || {};
    const snapshot = buildLessonSnapshot();

    registry[code] = {
      createdAt: existing.createdAt || Date.now(),
      updatedAt: snapshot.updatedAt,
      lessonTitle: snapshot.lessonTitle,
      navigation: snapshot.navigation,
      journal: snapshot.journal
    };

    saveRegistry(registry);
  }

  /**
   * Generate a new resume code and save the current lesson under it.
   */
  function handleGenerateResumeCode() {
    const existingActive = getActiveResumeCode();

    // Reuse existing active code if present.
    if (existingActive) {
      saveSnapshotForCode(existingActive);
      updateResumeDisplay(existingActive);
      setStatus(`Resume code ready: ${existingActive}`);
      return;
    }

    const newCode = createUniqueResumeCode();
    setActiveResumeCode(newCode);
    saveSnapshotForCode(newCode);

    const input = document.getElementById("resume-code-input");
    if (input) input.value = newCode;

    setStatus(`Resume code created: ${newCode}`);
  }

  /**
   * Save current progress to the active resume code automatically.
   */
  function autoSyncActiveResumeCode() {
    const activeCode = getActiveResumeCode();
    if (!activeCode) return;
    saveSnapshotForCode(activeCode);
  }

  /**
   * Apply navigation snapshot directly to storage.
   * navigation.js will restore from storage on reload.
   * @param {any} navigationSnapshot
   */
  function applyNavigationSnapshot(navigationSnapshot) {
    if (!navigationSnapshot || typeof navigationSnapshot !== "object") return;
    writeStorage(NAV_STORAGE_KEY, navigationSnapshot);
  }

  /**
   * Apply journal snapshot directly to storage.
   * journal.js will restore from storage on reload.
   * @param {any} journalSnapshot
   */
  function applyJournalSnapshot(journalSnapshot) {
    if (!journalSnapshot || typeof journalSnapshot !== "object") return;
    writeStorage(JOURNAL_STORAGE_KEY, journalSnapshot);
  }

  /**
   * Load lesson data from a resume code.
   */
  function handleLoadResumeCode() {
    const input = document.getElementById("resume-code-input");
    const code = input ? input.value.trim().toUpperCase() : "";

    if (!code) {
      setStatus("Enter a resume code first.");
      return;
    }

    const registry = getRegistry();
    const savedRecord = registry[code];

    if (!savedRecord) {
      setStatus("Resume code not found.");
      return;
    }

    applyNavigationSnapshot(savedRecord.navigation);
    applyJournalSnapshot(savedRecord.journal);
    setActiveResumeCode(code);

    setStatus(`Resume code loaded: ${code}`);

    // Reload so other modules restore cleanly from storage.
    window.location.reload();
  }

  /**
   * Attach click listeners to resume buttons.
   */
  function attachResumeButtonListeners() {
    const generateBtn = document.getElementById("resume-code-generate-btn");
    const loadBtn = document.getElementById("resume-code-load-btn");
    const input = document.getElementById("resume-code-input");

    if (generateBtn) {
      generateBtn.addEventListener("click", handleGenerateResumeCode);
    }

    if (loadBtn) {
      loadBtn.addEventListener("click", handleLoadResumeCode);
    }

    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleLoadResumeCode();
        }
      });

      input.addEventListener("input", () => {
        input.value = input.value.toUpperCase();
      });
    }
  }

  /**
   * Initialize active resume code display on load.
   */
  function initializeResumeUI() {
    const activeCode = getActiveResumeCode();
    updateResumeDisplay(activeCode);

    const input = document.getElementById("resume-code-input");
    if (input && activeCode && !input.value.trim()) {
      input.value = activeCode;
    }
  }

  /**
   * Listen for changes from other lesson modules and sync to active resume code.
   * We use click/input/change as lightweight sync triggers.
   */
  function attachAutoSyncListeners() {
    const throttledSync = throttle(() => {
      autoSyncActiveResumeCode();
    }, 400);

    document.addEventListener("click", throttledSync, true);
    document.addEventListener("input", throttledSync, true);
    document.addEventListener("change", throttledSync, true);

    window.addEventListener("beforeunload", () => {
      autoSyncActiveResumeCode();
    });
  }

  /**
   * Simple throttle helper.
   * @param {Function} callback
   * @param {number} delay
   * @returns {Function}
   */
  function throttle(callback, delay) {
    let timeoutId = null;
    let lastRun = 0;

    return function throttledFunction(...args) {
      const now = Date.now();
      const elapsed = now - lastRun;

      if (elapsed >= delay) {
        lastRun = now;
        callback.apply(this, args);
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastRun = Date.now();
        callback.apply(this, args);
      }, delay - elapsed);
    };
  }

  /**
   * Public API
   */
  window.SINSResume = {
    getActiveCode() {
      return getActiveResumeCode();
    },

    generateCode() {
      handleGenerateResumeCode();
    },

    loadCode(code) {
      const input = document.getElementById("resume-code-input");
      if (input) {
        input.value = (code || "").toUpperCase();
      }
      handleLoadResumeCode();
    },

    saveNow() {
      const activeCode = getActiveResumeCode();
      if (!activeCode) {
        setStatus("Generate a resume code before saving.");
        return;
      }

      if (window.SINSJournal?.saveAll) {
        window.SINSJournal.saveAll();
      }

      saveSnapshotForCode(activeCode);
      setStatus(`Progress saved to ${activeCode}`);
    },

    clearActiveCode() {
      writeString(ACTIVE_RESUME_KEY, "");
      updateResumeDisplay("");
      setStatus("Active resume code cleared.");
    }
  };

  /**
   * Init
   */
  function init() {
    initializeResumeUI();
    attachResumeButtonListeners();
    attachAutoSyncListeners();

    // If an active code already exists, refresh the saved snapshot.
    const activeCode = getActiveResumeCode();
    if (activeCode) {
      saveSnapshotForCode(activeCode);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

