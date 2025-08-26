// High-precision stopwatch using performance.now() and rAF to avoid setInterval drift.

const display = document.getElementById("display");
const lapList = document.getElementById("lapTimes");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const lapBtn   = document.getElementById("lapBtn");

let isRunning = false;
let startStamp = 0;          // performance.now() when (re)started
let elapsedBeforePause = 0;  // accumulated ms before current run
let rafId = null;

let laps = [];               // { totalMs, splitMs }
let lastLapTotalMs = 0;      // total elapsed at previous lap

// --- Helpers
const formatTime = (ms) => {
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const msPart = Math.floor(ms % 1000);

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const mmm = String(msPart).padStart(3, "0");
  return `${hh}:${mm}:${ss}:${mmm}`;
};

const render = (totalMs) => {
  display.textContent = formatTime(totalMs);
};

const tick = () => {
  const now = performance.now();
  const totalMs = elapsedBeforePause + (now - startStamp);
  render(totalMs);
  rafId = requestAnimationFrame(tick);
};

const setButtons = ({ running }) => {
  startBtn.disabled = running;
  pauseBtn.disabled = !running;
  resetBtn.disabled = running && laps.length === 0 && (elapsedBeforePause === 0);
  lapBtn.disabled   = !running;
};

// --- Control Handlers
startBtn.addEventListener("click", () => {
  if (isRunning) return;
  isRunning = true;
  startStamp = performance.now();
  rafId = requestAnimationFrame(tick);
  setButtons({ running: true });
});

pauseBtn.addEventListener("click", () => {
  if (!isRunning) return;
  isRunning = false;
  cancelAnimationFrame(rafId);
  rafId = null;
  // consolidate elapsed
  const now = performance.now();
  elapsedBeforePause += (now - startStamp);
  render(elapsedBeforePause);
  setButtons({ running: false });
  // After first pause, reset becomes available even if no laps
  resetBtn.disabled = false;
});

resetBtn.addEventListener("click", () => {
  // stop any running loop
  if (rafId) cancelAnimationFrame(rafId);
  isRunning = false;
  rafId = null;
  startStamp = 0;
  elapsedBeforePause = 0;
  laps = [];
  lastLapTotalMs = 0;
  display.textContent = "00:00:00:000";
  lapList.innerHTML = "";
  setButtons({ running: false });
  resetBtn.disabled = true;
});

lapBtn.addEventListener("click", () => {
  // compute current total elapsed irrespective of running/paused states
  let totalMs = elapsedBeforePause;
  if (isRunning) {
    const now = performance.now();
    totalMs += (now - startStamp);
  }

  const splitMs = totalMs - lastLapTotalMs;
  lastLapTotalMs = totalMs;

  laps.push({ totalMs, splitMs });
  drawLaps();
  // keep focus UX snappy
  lapBtn.blur();
});

// --- UI for laps
function drawLaps() {
  lapList.innerHTML = "";
  laps.forEach((lap, idx) => {
    const row = document.createElement("div");
    row.className = "lap-row";

    const label = document.createElement("div");
    label.className = "lap-label";
    label.textContent = `Lap ${idx + 1}`;

    const times = document.createElement("div");
    times.className = "lap-times";

    const totalBadge = document.createElement("span");
    totalBadge.className = "badge";
    totalBadge.textContent = `Total: ${formatTime(lap.totalMs)}`;

    const splitBadge = document.createElement("span");
    splitBadge.className = "badge";
    splitBadge.textContent = `Split: ${formatTime(lap.splitMs)}`;

    times.appendChild(totalBadge);
    times.appendChild(splitBadge);

    row.appendChild(label);
    row.appendChild(times);
    lapList.appendChild(row);
  });
}

// Initial button states
setButtons({ running: false });
resetBtn.disabled = true;

// Optional keyboard shortcuts: Space=Start/Pause, L=Lap, R=Reset
document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.code === "Space") {
    e.preventDefault();
    isRunning ? pauseBtn.click() : startBtn.click();
  } else if (e.key.toLowerCase() === "l") {
    if (!lapBtn.disabled) lapBtn.click();
  } else if (e.key.toLowerCase() === "r") {
    if (!resetBtn.disabled) resetBtn.click();
  }
});
