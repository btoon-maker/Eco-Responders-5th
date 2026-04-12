 /**
 * interactives.js
 * Stories in Science (SINS) Lesson Interactives
 * GitHub Pages compatible
 *
 * Responsibilities:
 * - Render the NOAA Data Review Simulator inside its placeholder
 * - Render the Feedback Loop Modeling interactive inside its placeholder
 * - Save interactive work locally
 * - Send completed interactive evidence to the journal system
 * - Use event listeners only
 *
 * This file does not handle:
 * - Section navigation logic
 * - Resume code generation/loading
 * - Export download generation
 */

(function () {
  "use strict";

  const STORAGE_KEY = "sinsEcoRespondersInteractives";

  const interactiveState = {
    noaa: {
      selectedIndicator: "",
      pattern: "",
      risk: ""
    },
    feedbackLoop: {
      placements: {
        climate: "",
        vegetation: "",
        wildlife: "",
        human: ""
      },
      loopResponse: "",
      recoveryResponse: ""
    },
    updatedAt: Date.now()
  };

  const NOAA_INDICATORS = {
    rainfall: {
      name: "Rainfall",
      unit: "Inches of Rain",
      explanation: "Rainfall tells us how much water fell from the sky.",
      tip: "Look at whether the numbers go up, go down, or stay about the same over the years.",
      years: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
      values: [26, 24, 21, 18, 15, 13, 11]
    },
    temperature: {
      name: "Temperature",
      unit: "Average Summer °F",
      explanation: "Temperature shows how warm the area has been.",
      tip: "Pay attention to whether the hottest years are also the most recent years.",
      years: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
      values: [82, 84, 85, 87, 89, 91, 93]
    },
    wind: {
      name: "Wind",
      unit: "Average Wind Speed (mph)",
      explanation: "Wind conditions change from year to year. Look for patterns and consider what those changes might mean.",
      tip: "Notice which years stand out. A pattern does not always have to be a straight line up or down.",
      years: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
      values: [9, 11, 13, 10, 15, 14, 18]
    },
    fuelMoisture: {
      name: "Fuel Moisture",
      unit: "Plant Moisture (%)",
      explanation: "Fuel moisture tells us how much water is inside grasses, leaves, and small plants.",
      tip: "Think about what happens when plants lose water. Dry fuel can catch fire faster.",
      years: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
      values: [82, 78, 73, 67, 61, 55, 49]
    }
  };

  const FEEDBACK_LOOP_TERMS = [
    "Hotter ground",
    "Drier fuel",
    "Fewer trees",
    "Less shade",
    "More erosion",
    "Slower regrowth",
    "More habitat loss",
    "Fire-smart zones",
    "Adding trees",
    "Healthier soil"
  ];

  function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.warn("Could not read interactive storage.", error);
      return null;
    }
  }

  function writeStorage() {
    interactiveState.updatedAt = Date.now();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(interactiveState));
    } catch (error) {
      console.warn("Could not write interactive storage.", error);
    }
  }

  function loadState() {
    const saved = readStorage();
    if (!saved) return;

    if (saved.noaa && typeof saved.noaa === "object") {
      interactiveState.noaa = {
        ...interactiveState.noaa,
        ...saved.noaa
      };
    }

    if (saved.feedbackLoop && typeof saved.feedbackLoop === "object") {
      interactiveState.feedbackLoop = {
        ...interactiveState.feedbackLoop,
        ...saved.feedbackLoop,
        placements: {
          ...interactiveState.feedbackLoop.placements,
          ...(saved.feedbackLoop.placements || {})
        }
      };
    }
  }

  function setStatus(message) {
    const status =
      document.getElementById("autosave-status") ||
      document.getElementById("progression-reveal-status");

    if (status) {
      status.textContent = message;
    }
  }

  function postToJournal(payload) {
    try {
      window.postMessage(payload, "*");
    } catch (error) {
      console.warn("Could not send interactive evidence to journal.", error);
    }
  }

  /* =========================
     NOAA DATA REVIEW SIMULATOR
     ========================= */

  function initNOAAInteractive() {
    const container = document.getElementById("noaa-interactive-container");
    if (!container) return;

    container.innerHTML = `
      <div class="interactive-placeholder-card">
        <h3>NOAA Data Review Simulator</h3>
        <p>Jordan opens the NOAA dashboard. Choose one clue to investigate first.</p>

        <div class="interactive-noaa__choices" id="noaa-choices"></div>

        <div class="interactive-noaa__panel" id="noaa-panel" hidden>
          <div class="journal-block" style="margin-top: 1rem;">
            <h3 id="noaa-title">Indicator</h3>
            <p id="noaa-explanation"></p>
            <p><strong>Scientist Tip:</strong> <span id="noaa-tip"></span></p>

            <canvas
              id="noaa-chart"
              width="640"
              height="320"
              aria-label="NOAA data chart"
              style="width: 100%; max-width: 100%; border: 1px solid #d6e2d2; border-radius: 12px; background: #fff;"
            ></canvas>

            <div style="margin-top: 1rem;">
              <label for="noaa-pattern"><strong>Pattern I Notice</strong></label>
              <textarea id="noaa-pattern" rows="4" placeholder="I notice that..."></textarea>
            </div>

            <div style="margin-top: 1rem;">
              <label for="noaa-risk"><strong>Why This Matters for Fire Risk</strong></label>
              <textarea id="noaa-risk" rows="4" placeholder="This matters for fire risk because..."></textarea>
            </div>

            <div class="navigation-buttons">
              <button type="button" class="secondary-button" id="noaa-back">Back to Data Choices</button>
              <button type="button" class="primary-button" id="noaa-send">Add to Lesson Journal</button>
            </div>

            <div id="noaa-preview" style="margin-top: 1rem; white-space: pre-wrap;"></div>
          </div>
        </div>
      </div>
    `;

    renderNOAAChoices();
    attachNOAAListeners();

    if (interactiveState.noaa.selectedIndicator) {
      openNOAAPanel(interactiveState.noaa.selectedIndicator);
    }
  }

  function renderNOAAChoices() {
    const choices = document.getElementById("noaa-choices");
    if (!choices) return;

    choices.innerHTML = "";
    choices.style.display = "grid";
    choices.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    choices.style.gap = "1rem";
    choices.style.marginTop = "1rem";

    Object.entries(NOAA_INDICATORS).forEach(([key, item]) => {
      const card = document.createElement("div");
      card.className = "option-card";
      card.innerHTML = `
        <h4>${item.name}</h4>
        <p>${item.explanation}</p>
        <button type="button" class="decision-button" data-noaa-key="${key}">
          Investigate ${item.name}
        </button>
      `;
      choices.appendChild(card);
    });
  }

  function attachNOAAListeners() {
    const choices = document.getElementById("noaa-choices");
    const pattern = document.getElementById("noaa-pattern");
    const risk = document.getElementById("noaa-risk");
    const back = document.getElementById("noaa-back");
    const send = document.getElementById("noaa-send");

    if (choices) {
      choices.addEventListener("click", (event) => {
        const button = event.target.closest("[data-noaa-key]");
        if (!button) return;

        const key = button.dataset.noaaKey;
        openNOAAPanel(key);
      });
    }

    if (pattern) {
      pattern.addEventListener("input", () => {
        interactiveState.noaa.pattern = pattern.value;
        writeStorage();
        updateNOAAPreview();
      });
    }

    if (risk) {
      risk.addEventListener("input", () => {
        interactiveState.noaa.risk = risk.value;
        writeStorage();
        updateNOAAPreview();
      });
    }

    if (back) {
      back.addEventListener("click", closeNOAAPanel);
    }

    if (send) {
      send.addEventListener("click", sendNOAAEvidence);
    }
  }

  function openNOAAPanel(key) {
    const indicator = NOAA_INDICATORS[key];
    if (!indicator) return;

    interactiveState.noaa.selectedIndicator = key;
    writeStorage();

    const panel = document.getElementById("noaa-panel");
    const title = document.getElementById("noaa-title");
    const explanation = document.getElementById("noaa-explanation");
    const tip = document.getElementById("noaa-tip");
    const pattern = document.getElementById("noaa-pattern");
    const risk = document.getElementById("noaa-risk");

    if (panel) panel.hidden = false;
    if (title) title.textContent = indicator.name;
    if (explanation) explanation.textContent = indicator.explanation;
    if (tip) tip.textContent = indicator.tip;
    if (pattern) pattern.value = interactiveState.noaa.pattern || "";
    if (risk) risk.value = interactiveState.noaa.risk || "";

    drawNOAAChart(indicator);
    updateNOAAPreview();
  }

  function closeNOAAPanel() {
    const panel = document.getElementById("noaa-panel");
    if (panel) panel.hidden = true;
  }

  function updateNOAAPreview() {
    const preview = document.getElementById("noaa-preview");
    if (!preview) return;

    const key = interactiveState.noaa.selectedIndicator;
    if (!key || !NOAA_INDICATORS[key]) {
      preview.textContent = "";
      return;
    }

    const indicator = NOAA_INDICATORS[key];
    preview.textContent =
`Source: NOAA Data Review Simulator
Indicator: ${indicator.name}
Years Reviewed: ${indicator.years[0]}–${indicator.years[indicator.years.length - 1]}
Pattern I Notice: ${interactiveState.noaa.pattern || "[Not written yet]"}
Why This Matters for Fire Risk: ${interactiveState.noaa.risk || "[Not written yet]"}`;
  }

  function sendNOAAEvidence() {
    const key = interactiveState.noaa.selectedIndicator;
    if (!key || !NOAA_INDICATORS[key]) {
      setStatus("Choose a NOAA data indicator first.");
      return;
    }

    if (!interactiveState.noaa.pattern.trim() || !interactiveState.noaa.risk.trim()) {
      setStatus("Complete both NOAA response boxes before sending.");
      return;
    }

    const indicator = NOAA_INDICATORS[key];
    const payload = {
      type: "SINS_NOAA_EVIDENCE",
      source: "NOAA Data Review Simulator",
      indicator: indicator.name,
      yearsReviewed: `${indicator.years[0]}-${indicator.years[indicator.years.length - 1]}`,
      pattern: interactiveState.noaa.pattern.trim(),
      fireRiskReason: interactiveState.noaa.risk.trim(),
      formattedText:
`Source: NOAA Data Review Simulator
Indicator: ${indicator.name}
Years Reviewed: ${indicator.years[0]}–${indicator.years[indicator.years.length - 1]}
Pattern I Notice: ${interactiveState.noaa.pattern.trim()}
Why This Matters for Fire Risk: ${interactiveState.noaa.risk.trim()}`
    };

    postToJournal(payload);
    setStatus("NOAA evidence added to the Field Journal.");
  }

  function drawNOAAChart(indicator) {
    const canvas = document.getElementById("noaa-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, right: 20, bottom: 60, left: 55 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const values = indicator.values;
    const years = indicator.years;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(1, maxValue - minValue);
    const lower = Math.floor(minValue - range * 0.15);
    const upper = Math.ceil(maxValue + range * 0.15);

    ctx.strokeStyle = "#d0d9ce";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (plotHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#4d6a92";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.font = "12px Open Sans, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 4; i += 1) {
      const value = upper - ((upper - lower) / 4) * i;
      const y = padding.top + (plotHeight / 4) * i;
      ctx.fillText(String(Math.round(value)), padding.left - 8, y);
    }

    const xStep = plotWidth / (years.length - 1);
    const points = values.map((value, index) => {
      const x = padding.left + index * xStep;
      const y = padding.top + ((upper - value) / (upper - lower)) * plotHeight;
      return { x, y, value, year: years[index] };
    });

    ctx.strokeStyle = "#228b22";
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();

    points.forEach((point) => {
      ctx.fillStyle = "#ffc627";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(point.year, point.x, height - padding.bottom + 10);

      ctx.textBaseline = "bottom";
      ctx.fillText(String(point.value), point.x, point.y - 8);
    });

    ctx.save();
    ctx.translate(18, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(indicator.unit, 0, 0);
    ctx.restore();
  }

  /* =========================
     FEEDBACK LOOP MODEL
     ========================= */

  function initFeedbackLoopInteractive() {
    const container = document.getElementById("feedback-loop-model-container");
    if (!container) return;

    container.innerHTML = `
      <div class="interactive-placeholder-card">
        <h3>Feedback Loop Model</h3>
        <p>Build one possible feedback loop for Maple Valley by placing a term into each part of the system.</p>

        <div class="plan-card-grid" style="grid-template-columns: 1fr 1fr; margin-top: 1rem;">
          <div class="plan-card">
            <h4>Word Bank</h4>
            <div id="feedback-loop-bank" style="display: flex; flex-wrap: wrap; gap: 0.6rem;"></div>
          </div>

          <div class="plan-card">
            <h4>System Model</h4>
            <div style="display: grid; gap: 0.75rem;">
              <label>
                <strong>Climate</strong>
                <select id="loop-climate"></select>
              </label>

              <label>
                <strong>Vegetation</strong>
                <select id="loop-vegetation"></select>
              </label>

              <label>
                <strong>Wildlife</strong>
                <select id="loop-wildlife"></select>
              </label>

              <label>
                <strong>Human choices</strong>
                <select id="loop-human"></select>
              </label>
            </div>
          </div>
        </div>

        <div class="journal-block" style="margin-top: 1rem;">
          <h3>Model Reflection</h3>

          <p>What happens as the loop repeats?</p>
          <textarea id="loop-response" rows="4" placeholder="As the loop repeats..."></textarea>

          <p style="margin-top: 1rem;">How could humans change this loop to help the system recover?</p>
          <textarea id="recovery-response" rows="4" placeholder="Humans could change the loop by..."></textarea>

          <div class="navigation-buttons">
            <button type="button" class="primary-button" id="loop-send">Add Model to Lesson Journal</button>
          </div>

          <div id="loop-preview" style="margin-top: 1rem; white-space: pre-wrap;"></div>
        </div>
      </div>
    `;

    renderFeedbackLoopWordBank();
    populateFeedbackLoopSelects();
    attachFeedbackLoopListeners();
    restoreFeedbackLoopUI();
    updateFeedbackLoopPreview();
  }

  function renderFeedbackLoopWordBank() {
    const bank = document.getElementById("feedback-loop-bank");
    if (!bank) return;

    bank.innerHTML = "";

    FEEDBACK_LOOP_TERMS.forEach((term) => {
      const pill = document.createElement("span");
      pill.className = "interactive-placeholder-node";
      pill.textContent = term;
      bank.appendChild(pill);
    });
  }

  function populateFeedbackLoopSelects() {
    const ids = ["loop-climate", "loop-vegetation", "loop-wildlife", "loop-human"];

    ids.forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;

      select.innerHTML = `<option value="">Choose one...</option>`;
      FEEDBACK_LOOP_TERMS.forEach((term) => {
        const option = document.createElement("option");
        option.value = term;
        option.textContent = term;
        select.appendChild(option);
      });
    });
  }

  function attachFeedbackLoopListeners() {
    const climate = document.getElementById("loop-climate");
    const vegetation = document.getElementById("loop-vegetation");
    const wildlife = document.getElementById("loop-wildlife");
    const human = document.getElementById("loop-human");
    const loopResponse = document.getElementById("loop-response");
    const recoveryResponse = document.getElementById("recovery-response");
    const send = document.getElementById("loop-send");

    if (climate) {
      climate.addEventListener("change", () => {
        interactiveState.feedbackLoop.placements.climate = climate.value;
        writeStorage();
        updateFeedbackLoopPreview();
      });
    }

    if (vegetation) {
      vegetation.addEventListener("change", () => {
        interactiveState.feedbackLoop.placements.vegetation = vegetation.value;
        writeStorage();
        updateFeedbackLoopPreview();
      });
    }

    if (wildlife) {
      wildlife.addEventListener("change", () => {
        interactiveState.feedbackLoop.placements.wildlife = wildlife.value;
        writeStorage();
        updateFeedbackLoopPreview();
      });
    }

    if (human) {
      human.addEventListener("change", () => {
        interactiveState.feedbackLoop.placements.human = human.value;
        writeStorage();
        updateFeedbackLoopPreview();
      });
    }

    if (loopResponse) {
      loopResponse.addEventListener("input", () => {
        interactiveState.feedbackLoop.loopResponse = loopResponse.value;
        writeStorage();
        updateFeedbackLoopPreview();
      });
    }

    if (recoveryResponse) {
      recoveryResponse.addEventListener("input", () => {
        interactiveState.feedbackLoop.recoveryResponse = recoveryResponse.value;
        writeStorage();
        updateFeedbackLoopPreview();
      });
    }

    if (send) {
      send.addEventListener("click", sendFeedbackLoopEvidence);
    }
  }

  function restoreFeedbackLoopUI() {
    const placements = interactiveState.feedbackLoop.placements;

    const climate = document.getElementById("loop-climate");
    const vegetation = document.getElementById("loop-vegetation");
    const wildlife = document.getElementById("loop-wildlife");
    const human = document.getElementById("loop-human");
    const loopResponse = document.getElementById("loop-response");
    const recoveryResponse = document.getElementById("recovery-response");

    if (climate) climate.value = placements.climate || "";
    if (vegetation) vegetation.value = placements.vegetation || "";
    if (wildlife) wildlife.value = placements.wildlife || "";
    if (human) human.value = placements.human || "";
    if (loopResponse) loopResponse.value = interactiveState.feedbackLoop.loopResponse || "";
    if (recoveryResponse) recoveryResponse.value = interactiveState.feedbackLoop.recoveryResponse || "";
  }

  function updateFeedbackLoopPreview() {
    const preview = document.getElementById("loop-preview");
    if (!preview) return;

    const placements = interactiveState.feedbackLoop.placements;

    preview.textContent =
`Feedback Loop Model
Climate: ${placements.climate || "[Not chosen yet]"}
Vegetation: ${placements.vegetation || "[Not chosen yet]"}
Wildlife: ${placements.wildlife || "[Not chosen yet]"}
Human choices: ${placements.human || "[Not chosen yet]"}

What happens as the loop repeats?
${interactiveState.feedbackLoop.loopResponse || "[Not written yet]"}

How could humans change this loop to help the system recover?
${interactiveState.feedbackLoop.recoveryResponse || "[Not written yet]"}`;
  }

  function sendFeedbackLoopEvidence() {
    const placements = interactiveState.feedbackLoop.placements;

    const allChosen =
      placements.climate &&
      placements.vegetation &&
      placements.wildlife &&
      placements.human;

    if (!allChosen) {
      setStatus("Complete all parts of the feedback loop model first.");
      return;
    }

    if (
      !interactiveState.feedbackLoop.loopResponse.trim() ||
      !interactiveState.feedbackLoop.recoveryResponse.trim()
    ) {
      setStatus("Complete both feedback loop reflection boxes before sending.");
      return;
    }

    const payload = {
      type: "SINS_FEEDBACK_LOOP_MODEL",
      source: "Feedback Loop Model",
      placements: { ...placements },
      loopResponse: interactiveState.feedbackLoop.loopResponse.trim(),
      recoveryResponse: interactiveState.feedbackLoop.recoveryResponse.trim(),
      formattedText:
`Feedback Loop Model
Climate: ${placements.climate}
Vegetation: ${placements.vegetation}
Wildlife: ${placements.wildlife}
Human choices: ${placements.human}

What happens as the loop repeats?
${interactiveState.feedbackLoop.loopResponse.trim()}

How could humans change this loop to help the system recover?
${interactiveState.feedbackLoop.recoveryResponse.trim()}`
    };

    postToJournal(payload);
    setStatus("Feedback loop model added to the Field Journal.");
  }

  /* =========================
     PUBLIC API
     ========================= */

  window.SINSInteractives = {
    getState() {
      return JSON.parse(JSON.stringify(interactiveState));
    },

    saveNow() {
      writeStorage();
      setStatus("Interactive work saved.");
    }
  };

  /* =========================
     INIT
     ========================= */

  function init() {
    loadState();
    initNOAAInteractive();
    initFeedbackLoopInteractive();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
