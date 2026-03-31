const clockTime = document.getElementById("clock-time");
const clockDate = document.getElementById("clock-date");
const wakeLockNotice = document.getElementById("wake-lock-notice");
const timerDisplay = document.getElementById("timer-display");
const timerStatus = document.getElementById("timer-status");
const minutesInput = document.getElementById("minutes-input");
const secondsInput = document.getElementById("seconds-input");
const startTimerButton = document.getElementById("start-timer");
const pauseTimerButton = document.getElementById("pause-timer");
const resetTimerButton = document.getElementById("reset-timer");
const fullscreenButtons = document.querySelectorAll(".fullscreen-button");

let wakeLockSentinel = null;
let wakeLockTarget = null;
let countdownMs = getInputDurationMs();
let timerIntervalId = null;
let timerEndsAt = null;

function updateClock() {
  const now = new Date();
  clockTime.textContent = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  clockDate.textContent = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(now);
}

function showWakeLockNotice(message) {
  if (!message) {
    wakeLockNotice.hidden = true;
    wakeLockNotice.textContent = "";
    return;
  }

  wakeLockNotice.hidden = false;
  wakeLockNotice.textContent = message;
}

async function releaseWakeLock() {
  if (!wakeLockSentinel) {
    wakeLockTarget = null;
    showWakeLockNotice("");
    return;
  }

  try {
    await wakeLockSentinel.release();
  } catch (_error) {
    // Ignore failures during teardown. Browsers may auto-release on visibility changes.
  }

  wakeLockSentinel = null;
  wakeLockTarget = null;
  showWakeLockNotice("");
}

async function requestWakeLockFor(element) {
  if (!("wakeLock" in navigator)) {
    showWakeLockNotice("このブラウザは画面スリープ抑止に未対応です。");
    return;
  }

  if (document.visibilityState !== "visible") {
    return;
  }

  if (wakeLockSentinel && wakeLockTarget === element) {
    return;
  }

  await releaseWakeLock();

  try {
    const sentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel = sentinel;
    wakeLockTarget = element;
    showWakeLockNotice("フルスクリーン中は画面スリープを抑止しています。");

    sentinel.addEventListener("release", () => {
      if (wakeLockSentinel === sentinel) {
        wakeLockSentinel = null;
        wakeLockTarget = null;
        showWakeLockNotice("");
      }
    });
  } catch (_error) {
    showWakeLockNotice("画面スリープ抑止を取得できませんでした。");
  }
}

async function syncWakeLockWithFullscreen() {
  const fullscreenElement = document.fullscreenElement;

  if (!fullscreenElement || !fullscreenElement.classList.contains("panel")) {
    await releaseWakeLock();
    return;
  }

  const mode = fullscreenElement.dataset.mode;

  if (mode === "clock" || mode === "timer") {
    await requestWakeLockFor(fullscreenElement);
    return;
  }

  await releaseWakeLock();
}

async function toggleFullscreen(targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  if (document.fullscreenElement === target) {
    await document.exitFullscreen();
    return;
  }

  await target.requestFullscreen();
}

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}

function getInputDurationMs() {
  const minutes = clampNumber(minutesInput.value, 0, 999);
  const seconds = clampNumber(secondsInput.value, 0, 59);
  minutesInput.value = String(minutes);
  secondsInput.value = String(seconds);
  return (minutes * 60 + seconds) * 1000;
}

function renderCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopCountdownInterval() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function tickCountdown() {
  if (!timerEndsAt) {
    return;
  }

  countdownMs = Math.max(0, timerEndsAt - Date.now());
  renderCountdown(countdownMs);

  if (countdownMs === 0) {
    stopCountdownInterval();
    timerEndsAt = null;
    timerStatus.textContent = "終了";
  }
}

function startCountdown() {
  if (timerIntervalId) {
    return;
  }

  if (countdownMs <= 0) {
    countdownMs = getInputDurationMs();
    renderCountdown(countdownMs);
  }

  if (countdownMs <= 0) {
    timerStatus.textContent = "0秒より大きい値を設定してください";
    return;
  }

  timerEndsAt = Date.now() + countdownMs;
  timerStatus.textContent = "計測中";
  tickCountdown();
  timerIntervalId = window.setInterval(tickCountdown, 250);
}

function pauseCountdown() {
  if (!timerIntervalId) {
    return;
  }

  tickCountdown();
  stopCountdownInterval();
  timerEndsAt = null;
  timerStatus.textContent = "一時停止中";
}

function resetCountdown() {
  stopCountdownInterval();
  timerEndsAt = null;
  countdownMs = getInputDurationMs();
  renderCountdown(countdownMs);
  timerStatus.textContent = "待機中";
}

fullscreenButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await toggleFullscreen(button.dataset.target);
    } catch (_error) {
      showWakeLockNotice("フルスクリーン切替に失敗しました。");
    }
  });
});

startTimerButton.addEventListener("click", startCountdown);
pauseTimerButton.addEventListener("click", pauseCountdown);
resetTimerButton.addEventListener("click", resetCountdown);
minutesInput.addEventListener("change", resetCountdown);
secondsInput.addEventListener("change", resetCountdown);

document.addEventListener("fullscreenchange", () => {
  void syncWakeLockWithFullscreen();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void syncWakeLockWithFullscreen();
    return;
  }

  void releaseWakeLock();
});

updateClock();
window.setInterval(updateClock, 1000);
resetCountdown();
