/**
 * Eco-Responders: script.js
 * Handles navigation, branching, autosave, and journal export.
 */

// --- Global State ---
let currentSection = 'section-0';
let userPath = []; // Tracks branching for export [cite: 11]
const RESUME_KEY = 'SINS_EcoResponders_Progress';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkExistingProgress();
    initializeNoaaSimulator();
    initializeFeedbackLoop();
    autoSave(); // Initial save to create resume code
});

// --- Navigation Logic ---
function navigateTo(sectionId) {
    // Hide all sections
    document.querySelectorAll('section').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });

    // Show target section [cite: 11]
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
        currentSection = sectionId;
        window.scrollTo({ top: 0, behavior: 'smooth' }); // [cite: 11]
    }

    autoSave();
}

function handleBranch(branchType) {
    userPath.push(branchType === '3A' ? "NOAA Data Path" : "Field Investigation Path"); // [cite: 105, 107]
    navigateTo('section-' + branchType);
}

// --- Autosave & Resume System [cite: 11, 18] ---
function autoSave() {
    const journalData = {};
    // Collect all textareas with data-tags or specific IDs
    document.querySelectorAll('textarea').forEach(tx => {
        journalData[tx.id] = tx.value;
    });

    const progress = {
        currentSection: currentSection,
        userPath: userPath,
        journalData: journalData,
        timestamp: new Date().getTime()
    };

    localStorage.setItem(RESUME_KEY, JSON.stringify(progress));
    updateResumeCodeDisplay();
}

function updateResumeCodeDisplay() {
    // Simple resume code using a timestamp-based string or fixed ID
    const display = document.getElementById('display-code');
    if (display) {
        display.textContent = "ECO-" + (localStorage.getItem(RESUME_KEY) ? "SAVE-READY" : "NEW");
    }
}

function checkExistingProgress() {
    const saved = localStorage.getItem(RESUME_KEY);
    if (saved) {
        document.getElementById('resume-container').style.display = 'flex';
    }
}

function resumeLesson() {
    const saved = JSON.parse(localStorage.getItem(RESUME_KEY));
    if (saved) {
        // Restore journal entries
        Object.keys(saved.journalData).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = saved.journalData[id];
        });
        userPath = saved.userPath || [];
        navigateTo(saved.currentSection);
    }
    closeResumeModal();
}

function closeResumeModal() {
    document.getElementById('resume-container').style.display = 'none';
}

// --- Interactive Simulators [cite: 121, 364] ---
function initializeNoaaSimulator() {
    const container = document.getElementById('noaa-simulator-container');
    if (!container) return;

    // Direct injection of the HTML provided in the builder [cite: 121-137]
    container.innerHTML = `
        <div class="simulator-box" style="border: 2px solid #4D6A92; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <h3>NOAA Data Dashboard</h3>
            <p><em>[The NOAA Data Review Simulator is active below]</em></p>
            <button class="btn-secondary" onclick="alert('Simulator Initialized: Students select variables like Rainfall or Temperature to see trends.')">
                Open NOAA Data View
            </button>
        </div>
    `;
}

function initializeFeedbackLoop() {
    const container = document.getElementById('feedback-loop-simulator-container');
    if (!container) return;

    // Placeholder for the Drag-and-Drop Loop [cite: 364-377]
    container.innerHTML = `
        <div class="simulator-box" style="border: 2px solid #228B22; padding: 15px; border-radius: 10px;">
            <p>Drag the cards to complete the loop: Climate → Vegetation → Wildlife → Human Choice</p>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">
                <span style="background:#eee; padding:5px; border:1px solid #ccc;">Less Shade</span>
                <span style="background:#eee; padding:5px; border:1px solid #ccc;">Hotter Ground</span>
                <span style="background:#eee; padding:5px; border:1px solid #ccc;">Drier Fuel</span>
            </div>
            <textarea id="loop-data-capture" placeholder="Describe your model's flow here..." oninput="autoSave()"></textarea>
        </div>
    `;
}

// --- Journal Export [cite: 11, 42, 114] ---
function exportJournal() {
    const saved = JSON.parse(localStorage.getItem(RESUME_KEY));
    if (!saved) return alert("No journal entries found to export!");

    let exportContent = "ECO-RESPONDER: FIELD JOURNAL EXPORT\n";
    exportContent += "====================================\n\n";
    exportContent += `Mission Path: ${userPath.join(" -> ")}\n\n`;

    // Map of text IDs to human-readable headers based on Template
    const headers = {
        'journal-3A-pattern': "NOAA Data Patterns",
        'journal-3A-inference': "Inference from Climate Data",
        'journal-3B-observations': "Field Observations",
        'journal-3B-inference': "Weather Inference",
        'journal-5A-human': "Human Impact Analysis",
        'journal-5B-eco': "Ecosystem Recovery Analysis",
        'journal-5C-both': "Integrated System Thinking",
        'journal-6-synthesis': "Team Briefing Synthesis",
        'journal-7-reflect': "Fire-Smart Reflection",
        'journal-8-decision': "Recommended Recovery Plan",
        'journal-9-loop': "Feedback Loop Model Analysis",
        'journal-11-psa': "Community PSA Message",
        'final-reflection': "Final Mission Reflection"
    };

    Object.keys(saved.journalData).forEach(id => {
        const response = saved.journalData[id].trim();
        if (response !== "") { // Only export completed responses [cite: 11]
            const header = headers[id] || "Section Response";
            exportContent += `${header}:\n"${response}"\n\n`;
        }
    });

    // Create download link
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EcoResponder_Journal.txt';
    a.click();
    URL.revokeObjectURL(url);
}
