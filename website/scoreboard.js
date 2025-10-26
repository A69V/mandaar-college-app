import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "AIzaSyAOtc2UrW2hXO4JJK5ZZQcDOfUVbEFmnis",
    authDomain: "umang-mandar.firebaseapp.com",
    projectId: "umang-mandar",
    // ... rest of your config
    databaseURL: "https://umang-mandar-default-rtdb.asia-southeast1.firebasedatabase.app/"
};
// --- END CONFIG ---

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function createScoreWidget(targetElementId, matchId) {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
        console.error(`Score Widget Error: Target element #${targetElementId} not found.`);
        return;
    }

    // Inject initial HTML structure
    targetElement.innerHTML = `
        <div class="live-score-widget">
            <div class="widget-header">
                <span class="widget-status"><span class="widget-live-dot"></span>LIVE</span>
                <span class="widget-match-id">Match: ${matchId}</span>
            </div>
            <div class="widget-score">
                <span class="widget-team-name">--</span>
                <span class="widget-score-details">
                    <span class="widget-runs-wickets">0-0</span>
                    <span class="widget-overs">(0.0)</span>
                </span>
            </div>
            <div class="widget-players">
                <div class="widget-batsman-1"><span class="striker-star">*</span> <span>Striker:</span> -- (0)</div>
                <div class="widget-batsman-2"><span>Non-Str:</span> -- (0)</div>
                <div class="widget-bowler"><span>Bowler:</span> --</div>
            </div>
            <div class="widget-footer">Loading...</div>
        </div>
    `;

    // Get references to injected elements
    const widget = targetElement.querySelector('.live-score-widget'); // Get the widget container itself
    const statusEl = widget.querySelector('.widget-status');
    const teamNameEl = widget.querySelector('.widget-team-name');
    const scoreEl = widget.querySelector('.widget-runs-wickets');
    const oversEl = widget.querySelector('.widget-overs');
    const batsman1El = widget.querySelector('.widget-batsman-1');
    const batsman2El = widget.querySelector('.widget-batsman-2');
    const bowlerEl = widget.querySelector('.widget-bowler');
    const footerEl = widget.querySelector('.widget-footer');


    // --- Render Function for Widget ---
    function renderWidget(state) {
        if (!state || !state.live) {
            footerEl.textContent = "Waiting for data...";
            return;
        }
        const live = state.live;
        const striker = live.batsmen?.striker || { name: '--', runs: 0, balls: 0 };
        const nonStriker = live.batsmen?.nonStriker || { name: '--', runs: 0, balls: 0 };
        const bowler = live.bowler || { name: '--' };
        const battingTeamName = state[live.battingTeam]?.name || 'Batting';

        // Update Status
        let statusText = live.matchStatus || "LIVE";
        let showDot = true;
        if (state.status === "completed") {
            statusText = "FINISHED";
            showDot = false;
        } else if (live.matchStatus === "Innings Break") {
            statusText = "INNS BREAK";
            showDot = false;
        }
        statusEl.innerHTML = `${showDot ? '<span class="widget-live-dot"></span>' : ''}${statusText}`;


        // Update Score
        teamNameEl.textContent = battingTeamName;
        scoreEl.textContent = `${live.score}-${live.wickets}`;
        oversEl.textContent = `(${live.overs}.${live.balls})`;

        // Update Players
        batsman1El.innerHTML = `<span class="striker-star">*</span> <span>${striker.name}:</span> <span class="batsman-score">${striker.runs} (${striker.balls})</span>`;
        batsman2El.innerHTML = `<span>${nonStriker.name}:</span> <span class="batsman-score">${nonStriker.runs} (${nonStriker.balls})</span>`;
        bowlerEl.innerHTML = `<span>Bowler:</span> ${bowler.name}`;

        // Update Footer (Summary/Target)
        let footerText = `${battingTeamName} are ${live.score}/${live.wickets} after ${live.overs}.${live.balls} overs.`;
        if (live.inning === 2 && live.targetScore) {
            const runsNeeded = live.targetScore - live.score;
            const ballsRemaining = (state.totalOvers * 6) - (live.overs * 6 + live.balls);
            if (runsNeeded > 0 && ballsRemaining > 0 && state.live.wickets < 10) {
                 footerText = `${battingTeamName} need <span class="widget-target">${runsNeeded}</span> runs from ${ballsRemaining} balls.`;
            } else if (state.status === "completed") {
                 footerText = state.result || "Match Finished.";
            } else {
                 footerText = `Target: ${live.targetScore}`; // Fallback if calculation fails
            }
        } else if (state.status === "completed") {
            footerText = state.result || "Match Finished.";
        }
        footerEl.innerHTML = footerText;
    }


    // --- Connect to Firebase ---
    const matchRef = ref(db, 'matches/' + matchId);
    onValue(matchRef, (snapshot) => {
        if (snapshot.exists()) {
            const state = snapshot.val();
             // Basic check
             if (state.live && state.teamA && state.teamB) {
                 renderWidget(state);
             } else {
                 console.warn(`Widget (${matchId}): Incomplete data received.`);
                 footerEl.textContent = "Incomplete data...";
             }
        } else {
            console.error(`Widget (${matchId}): Match data not found.`);
            widget.innerHTML = `<div class="live-score-widget"><div class="widget-header">Error</div> Match ${matchId} not found.</div>`; // Show error in widget
        }
    }, (error) => {
        console.error(`Widget (${matchId}): Firebase read failed:`, error);
        widget.innerHTML = `<div class="live-score-widget"><div class="widget-header">Error</div> Connection failed.</div>`; // Show error in widget
    });
}

// --- Make the function globally available ---
// You call this function from your main HTML page
window.createScoreWidget = createScoreWidget;