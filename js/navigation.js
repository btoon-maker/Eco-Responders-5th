/**
 * navigation.js
 * Stories in Science (SINS) Lesson Navigation
 * GitHub Pages compatible
 *
 * Responsibilities:
 * - Reveal lesson sections only when navigation buttons are clicked
 * - Support branching paths and convergence points
 * - Support back navigation, including branch-aware "previous" behavior
 * - Update visible progress state
 * - Persist navigation state in localStorage
 * - Smooth scroll to newly revealed content
 *
 * Expected HTML patterns:
 * - Sections use ids like #section-1, #section-2, #section-3a, etc.
 * - Hidden sections use the `hidden` attribute and/or `.is-hidden`
 * - Visible sections use `.is-visible`
 * - Navigation buttons use:
 *      data-nav-target="section-2"
 *      data-nav-target="previous"
 * - Branch buttons may also use:
 *      data-decision-id
 *      data-decision-value
 *      data-branch-label
 *      data-branch-target
 * - Optional progress items use ids like:
 *      progress-section-1
 *
 * This file does not handle:
 * - Journal autosave
 * - Resume code creation/loading
 * - Exporting
 * - Interactive widgets
 */

(function () {
  "use strict";

  const STORAGE_KEY = "sinsEcoRespondersNavigation";
  const LESSON_ROOT_SELECTOR = "main, .lesson-shell__main, body";
  const SECTION_SELECTOR = "[id^='section-']";
  const PROGRESS_ITEM_SELECTOR = "[id^='progress-section-']";

  const state = {
    currentSectionId: "section-0",
    visitedSections: ["section-0"],
    history: [],
    branchHistory: [],
    decisions: {},
    lastUpdated: Date.now()
  };

  /**
   * Utility: safe localStorage read
   * @returns {object|null}
   */
  function loadStoredState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.warn("Could not load navigation state.", error);
      return null;
    }
  }

  /**
   * Utility: safe localStorage write
   */
  function saveState() {
    state.lastUpdated = Date.now();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save navigation state.", error);
    }
  }

  /**
   * Get all sections in DOM order.
   * @returns {HTMLElement[]}
   */
  function getAllSections() {
    return Array.from(document.querySelectorAll(SECTION_SELECTOR));
  }

  /**
   * Find section by id.
   * @param {string} sectionId
   * @returns {HTMLElement|null}
   */
  function getSection(sectionId) {
    if (!sectionId) return null;
    return document.getElementById(sectionId);
  }

  /**
   * Show a section.
   * @param {HTMLElement} section
   */
  function showSection(section) {
    if (!section) return;

    section.hidden = false;
    section.classList.remove("is-hidden");
    section.classList.add("is-visible");
    section.setAttribute("aria-hidden", "false");
  }

  /**
   * Hide a section.
   * We only hide sections after the current one to preserve progression reveal
   * without exposing future content too early.
   * @param {HTMLElement} section
   */
  function hideSection(section) {
    if (!section) return;

    section.hidden = true;
    section.classList.remove("is-visible");
    section.classList.add("is-hidden");
    section.setAttribute("aria-hidden", "true");
  }

  /**
   * Reveal all visited sections plus the current section.
   * Hide unvisited future sections.
   */
  function syncSectionVisibility() {
    const allSections = getAllSections();
    const visibleIds = new Set([...state.visitedSections, state.currentSectionId]);

    allSections.forEach((section) => {
      if (visibleIds.has(section.id)) {
        showSection(section);
      } else {
        hideSection(section);
      }
    });
  }

  /**
   * Scroll to a section smoothly.
   * @param {HTMLElement|null} section
   */
  function scrollToSection(section) {
    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  /**
   * Focus the section for accessibility.
   * @param {HTMLElement|null} section
   */
  function focusSection(section) {
    if (!section) return;

    if (!section.hasAttribute("tabindex")) {
      section.setAttribute("tabindex", "-1");
    }

    // Prevent scroll jump because we already handled smooth scrolling.
    section.focus({ preventScroll: true });
  }

  /**
   * Update progress pills/items if present.
   * Marks the current one as active.
   */
  function updateProgressUI() {
    const progressItems = Array.from(document.querySelectorAll(PROGRESS_ITEM_SELECTOR));

    progressItems.forEach((item) => {
      item.classList.remove("is-active");
      item.removeAttribute("aria-current");
    });

    const candidateIds = buildProgressCandidates(state.currentSectionId);

    for (const progressId of candidateIds) {
      const item = document.getElementById(progressId);
      if (item) {
        item.classList.add("is-active");
        item.setAttribute("aria-current", "step");
        break;
      }
    }
  }

  /**
   * Convert a section id into likely progress ids.
   * Handles section-3a, section-3a-2, section-5b, etc.
   * @param {string} sectionId
   * @returns {string[]}
   */
  function buildProgressCandidates(sectionId) {
    if (!sectionId) return [];

    const normalized = sectionId.replace(/^section-/, "");
    const compact = normalized.split("-")[0];

    const candidates = [
      `progress-section-${normalized}`,
      `progress-section-${compact}`
    ];

    // Also support numeric-only fallback, e.g. 3a -> 3
    const numericMatch = compact.match(/^(\d+)/);
    if (numericMatch) {
      candidates.push(`progress-section-${numericMatch[1]}`);
    }

    return [...new Set(candidates)];
  }

  /**
   * Returns true if a section id is already recorded as visited.
   * @param {string} sectionId
   * @returns {boolean}
   */
  function hasVisited(sectionId) {
    return state.visitedSections.includes(sectionId);
  }

  /**
   * Record that a section has been visited.
   * @param {string} sectionId
   */
  function markVisited(sectionId) {
    if (!sectionId || hasVisited(sectionId)) return;
    state.visitedSections.push(sectionId);
  }

  /**
   * Clean duplicate history entries.
   * @param {string[]} entries
   * @returns {string[]}
   */
  function dedupeHistory(entries) {
    const cleaned = [];

    entries.forEach((entry) => {
      if (!entry) return;
      if (cleaned[cleaned.length - 1] !== entry) {
        cleaned.push(entry);
      }
    });

    return cleaned;
  }

  /**
   * Navigate to a specific section id.
   * @param {string} targetSectionId
   * @param {object} options
   */
  function navigateTo(targetSectionId, options = {}) {
    const {
      pushHistory = true,
      fromButton = null,
      recordDecision = false
    } = options;

    const targetSection = getSection(targetSectionId);
    if (!targetSection) {
      console.warn(`Navigation target "${targetSectionId}" was not found.`);
      return;
    }

    const previousSectionId = state.currentSectionId;

    if (pushHistory && previousSectionId && previousSectionId !== targetSectionId) {
      state.history.push(previousSectionId);
      state.history = dedupeHistory(state.history);
    }

    state.currentSectionId = targetSectionId;
    markVisited(targetSectionId);

    if (recordDecision && fromButton) {
      recordDecisionFromButton(fromButton, previousSectionId, targetSectionId);
    }

    syncSectionVisibility();
    updateProgressUI();
    saveState();

    requestAnimationFrame(() => {
      scrollToSection(targetSection);
      setTimeout(() => focusSection(targetSection), 250);
    });

    announceProgress(targetSectionId);
  }

  /**
   * Record decision/branch info from clicked button.
   * @param {HTMLElement} button
   * @param {string} fromSectionId
   * @param {string} toSectionId
   */
  function recordDecisionFromButton(button, fromSectionId, toSectionId) {
    if (!button) return;

    const decisionId = button.dataset.decisionId || fromSectionId || "decision";
    const decisionValue = button.dataset.decisionValue || button.dataset.decision || button.textContent.trim();
    const branchLabel = button.dataset.branchLabel || "";
    const branchTarget = button.dataset.branchTarget || toSectionId;

    state.decisions[decisionId] = {
      fromSectionId,
      toSectionId,
      decisionValue,
      branchLabel,
      branchTarget,
      timestamp: Date.now()
    };

    state.branchHistory.push({
      decisionId,
      fromSectionId,
      toSectionId,
      decisionValue,
      branchLabel,
      branchTarget,
      timestamp: Date.now()
    });
  }

  /**
   * Branch-aware previous section logic.
   * If a button uses data-nav-target="previous", this determines where to go.
   * @returns {string|null}
   */
  function getPreviousSectionId() {
    if (!state.history.length) return null;

    // Walk backward until we find a real section still in DOM.
    for (let i = state.history.length - 1; i >= 0; i -= 1) {
      const candidate = state.history[i];
      if (getSection(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Handle all navigation button clicks.
   * @param {MouseEvent} event
   */
  function handleDocumentClick(event) {
    const button = event.target.closest("[data-nav-target]");
    if (!button) return;

    event.preventDefault();

    const rawTarget = button.dataset.navTarget;
    if (!rawTarget) return;

    if (rawTarget === "previous") {
      const previousSectionId = getPreviousSectionId();
      if (!previousSectionId) return;

      // Remove the top history item so repeated "back" works as expected.
      state.history.pop();
      navigateTo(previousSectionId, {
        pushHistory: false,
        fromButton: button
      });
      return;
    }

    const targetSectionId = rawTarget;
    const shouldRecordDecision =
      Boolean(button.dataset.decisionId) ||
      Boolean(button.dataset.decisionValue) ||
      Boolean(button.dataset.decision) ||
      Boolean(button.dataset.branchTarget) ||
      button.classList.contains("decision-button");

    navigateTo(targetSectionId, {
      pushHistory: true,
      fromButton: button,
      recordDecision: shouldRecordDecision
    });
  }

  /**
   * Announce section change in optional status region.
   * @param {string} sectionId
   */
  function announceProgress(sectionId) {
    const status = document.getElementById("progression-reveal-status");
    if (!status) return;

    const section = getSection(sectionId);
    const heading =
      section?.querySelector("h1, h2, h3")?.textContent?.trim() || sectionId;

    status.textContent = `Now viewing: ${heading}`;
  }

  /**
   * Restore saved navigation state if available.
   */
  function restoreNavigationState() {
    const saved = loadStoredState();
    if (!saved) {
      initializeDefaultView();
      return;
    }

    state.currentSectionId = saved.currentSectionId || "section-0";
    state.visitedSections = Array.isArray(saved.visitedSections)
      ? saved.visitedSections
      : ["section-0"];
    state.history = Array.isArray(saved.history) ? saved.history : [];
    state.branchHistory = Array.isArray(saved.branchHistory) ? saved.branchHistory : [];
    state.decisions = saved.decisions && typeof saved.decisions === "object"
      ? saved.decisions
      : {};

    // Ensure section-0 always exists in visited.
    if (!state.visitedSections.includes("section-0")) {
      state.visitedSections.unshift("section-0");
    }

    // If saved current section is missing from the page, fall back.
    if (!getSection(state.currentSectionId)) {
      state.currentSectionId = "section-0";
    }

    syncSectionVisibility();
    updateProgressUI();

    const currentSection = getSection(state.currentSectionId);
    if (currentSection) {
      requestAnimationFrame(() => {
        focusSection(currentSection);
      });
    }

    announceProgress(state.currentSectionId);
  }

  /**
   * Default startup behavior with only section-0 visible.
   */
  function initializeDefaultView() {
    state.currentSectionId = "section-0";
    state.visitedSections = ["section-0"];
    state.history = [];
    state.branchHistory = [];
    state.decisions = {};

    const sections = getAllSections();

    sections.forEach((section) => {
      if (section.id === "section-0") {
        showSection(section);
      } else {
        hideSection(section);
      }
    });

    updateProgressUI();
    saveState();
    announceProgress("section-0");
  }

  /**
   * Public helper so other files can move the lesson if needed.
   * Example:
   * window.SINSNavigation.goTo("section-6");
   */
  window.SINSNavigation = {
    goTo(sectionId) {
      if (!sectionId) return;
      navigateTo(sectionId, { pushHistory: true });
    },

    getState() {
      return JSON.parse(JSON.stringify(state));
    },

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      initializeDefaultView();
      const firstSection = getSection("section-0");
      if (firstSection) {
        scrollToSection(firstSection);
        focusSection(firstSection);
      }
    }
  };

  /**
   * Init
   */
  function init() {
    document.addEventListener("click", handleDocumentClick);
    restoreNavigationState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

