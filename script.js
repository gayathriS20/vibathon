const modes = {
    focus: { label: 'Focus', mins: 25, color: '#e94560' },
    short: { label: 'Short Break', mins: 5, color: '#00b4d8' },
    long: { label: 'Long Break', mins: 15, color: '#7b2d8b' },
};

const timerText = document.getElementById('timerText');
const sessionLabel = document.getElementById('sessionLabel');
const modeTabs = document.getElementById('modeTabs');
const ringFg = document.getElementById('ringFg');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const customMinutes = document.getElementById('customMinutes');
const applyCustom = document.getElementById('applyCustom');
const sessionDots = document.getElementById('sessionDots');
const sessionCount = document.getElementById('sessionCount');
const sessionHistoryEl = document.getElementById('sessionHistory');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const completionBanner = document.getElementById('completionBanner');

const STORAGE_KEY = 'studyTimerData';

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
ringFg.style.strokeDasharray = CIRCUMFERENCE;

let currentMode = 'focus';
let remainingSeconds = modes[currentMode].mins * 60;
let timerId = null;
let completedSessions = 0;
let isRunning = false;

function formatTime(seconds) {
    const minimum = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(minimum).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateRing() {
    const total = modes[currentMode].mins * 60;
    const progress = (total - remainingSeconds) / total;
    const offset = CIRCUMFERENCE * (1 - progress);
    ringFg.style.strokeDashoffset = offset;
}

function applyTheme() {
    ringFg.style.stroke = modes[currentMode].color;
    sessionLabel.textContent = modes[currentMode].label;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === currentMode);
    });
    timerText.textContent = formatTime(remainingSeconds);
    updateRing();
}

function setMode(mode) {
    currentMode = mode;
    isRunning = false;
    clearInterval(timerId);
    timerId = null;
    startPauseBtn.textContent = 'Start';
    remainingSeconds = modes[mode].mins * 60;
    applyTheme();
}

function updateSessionTracker() {
    sessionDots.innerHTML = '';
    for (let counter = 0; counter < completedSessions; counter += 1) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        sessionDots.appendChild(dot);
    }
    sessionCount.textContent = `${completedSessions} session${completedSessions === 1 ? '' : 's'}`;
}

function renderSessionHistory(history) {
    sessionHistoryEl.innerHTML = '';
    history.slice().reverse().forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.time} · ${entry.mode} · ${entry.length} minimum`;
        sessionHistoryEl.appendChild(li);
    });
}

function loadSessionData() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return [];
        return JSON.parse(json);
    } catch (err) {
        console.warn('Could not load history', err);
        return [];
    }
}

function saveSessionData(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function addSessionHistory(mode, lengthMin) {
    const history = loadSessionData();
    const now = new Date();
    const entry = {
        time: now.toLocaleString(),
        mode: mode,
        length: lengthMin,
    };
    history.push(entry);
    saveSessionData(history);
    renderSessionHistory(history);
}

function clearSessionHistory() {
    localStorage.removeItem(STORAGE_KEY);
    sessionHistoryEl.innerHTML = '';
}

function showCompletionMessage(message) {
    completionBanner.textContent = message;
    completionBanner.classList.remove('hidden');
    setTimeout(() => completionBanner.classList.add('hidden'), 2500);
}

function completeCycle() {
    if (currentMode === 'focus') {
        completedSessions += 1;
        updateSessionTracker();
        addSessionHistory(modes.focus.label, modes.focus.mins);
        showCompletionMessage('Focus complete! Time for a break.');

        if (completedSessions % 4 === 0) {
            setMode('long');
            showCompletionMessage('Long break! Refresh and return soon.');
            return;
        }
        setMode('short');
        return;
    }

    if (currentMode === 'short' || currentMode === 'long') {
        setMode('focus');
        showCompletionMessage('Break finished! Back to focus.');
    }
}

function tick() {
    if (remainingSeconds <= 0) {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        startPauseBtn.textContent = 'Start';
        completeCycle();
        return;
    }

    remainingSeconds -= 1;
    timerText.textContent = formatTime(remainingSeconds);
    updateRing();
}

function startTimer() {
    if (isRunning) {
        clearInterval(timerId);
        timerId = null;
        startPauseBtn.textContent = 'Start';
        isRunning = false;
        return;
    }

    if (remainingSeconds <= 0) {
        remainingSeconds = modes[currentMode].mins * 60;
    }

    timerId = setInterval(tick, 1000);
    startPauseBtn.textContent = 'Pause';
    isRunning = true;
}

function resetTimer() {
    clearInterval(timerId);
    timerId = null;
    isRunning = false;
    remainingSeconds = modes[currentMode].mins * 60;
    startPauseBtn.textContent = 'Start';
    applyTheme();
    showCompletionMessage('Timer reset');
}

modeTabs.addEventListener('click', (event) => {
    if (!event.target.classList.contains('tab')) return;
    const mode = event.target.dataset.mode;
    setMode(mode);
});

startPauseBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);

applyCustom.addEventListener('click', () => {
    const value = parseInt(customMinutes.value, 10);
    if (Number.isNaN(value) || value < 1 || value > 180) {
        showCompletionMessage('Enter minutes between 1 and 180');
        return;
    }

    modes[currentMode].mins = value;
    remainingSeconds = value * 60;
    applyTheme();
    showCompletionMessage(`${modes[currentMode].label} set to ${value} minimum`);
});

customMinutes.addEventListener('keyup', (evt) => {
    if (evt.key === 'Enter') applyCustom.click();
});

clearHistoryBtn.addEventListener('click', () => {
    completedSessions = 0;
    updateSessionTracker();
    clearSessionHistory();
    showCompletionMessage('Session history cleared');
});

applyTheme();
updateSessionTracker();
const storedHistory = loadSessionData();
if (storedHistory.length > 0) {
    renderSessionHistory(storedHistory);
    completedSessions = storedHistory.filter(entry => entry.mode === 'Focus').length;
    updateSessionTracker();
}