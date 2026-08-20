let playMusicOnOpen = () => {};

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--color-bg", theme.background);
  root.style.setProperty("--color-fg", theme.foreground);
  root.style.setProperty("--font-serif", theme.fontSerif);
}

function renderNames(config) {
  document.getElementById("recipient-name").textContent = config.recipientName;
  document.getElementById("sender-name").textContent = config.senderName;
}

function supportsHover() {
  return window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initTilt() {
  const button = document.getElementById("gift-box");
  const tiltEl = button.querySelector(".gift-box__tilt");

  if (prefersReducedMotion() || !supportsHover()) {
    tiltEl.classList.add("gift-box__tilt--idle");
    return;
  }

  button.addEventListener("pointermove", (event) => {
    const rect = button.getBoundingClientRect();
    const { rotateX, rotateY } = window.LetterLib.computeTilt(event.clientX, event.clientY, rect, 12);
    tiltEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  button.addEventListener("pointerleave", () => {
    tiltEl.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

function typeLetterText(text) {
  const el = document.getElementById("letter-text");
  const card = document.getElementById("letter-card");
  el.textContent = "";
  if (prefersReducedMotion()) {
    el.textContent = text;
    card.scrollTop = 0;
    return;
  }
  const schedule = window.LetterLib.buildRevealSchedule(text, 16);
  schedule.forEach(({ char, delay }) => {
    window.setTimeout(() => {
      el.textContent += char;
      card.scrollTop = card.scrollHeight;
    }, delay);
  });
}

function renderPhotos(photos) {
  const container = document.getElementById("photo-scatter");
  container.innerHTML = "";
  photos.forEach((photo, index) => {
    const wrap = document.createElement("figure");
    wrap.className = "polaroid";
    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.alt || "";
    img.onerror = () => wrap.remove();
    wrap.appendChild(img);
    container.appendChild(wrap);
    const delay = prefersReducedMotion() ? 0 : 500 + index * 180;
    window.setTimeout(() => wrap.classList.add("is-visible"), delay);
  });
}

function initMusic(config) {
  const toggle = document.getElementById("music-toggle");
  const audio = document.getElementById("song");

  if (!config.song || !config.song.src) {
    return; // no track configured; toggle stays hidden
  }

  audio.src = config.song.src;
  audio.loop = true;
  audio.load();
  audio.onerror = () => {
    toggle.hidden = true;
  };
  toggle.hidden = false;

  function setIcon(isPlaying) {
    document.getElementById("music-toggle-icon").textContent = isPlaying ? "❚❚" : "♪";
    toggle.setAttribute("aria-label", isPlaying ? "Pause music" : "Play music");
  }

  toggle.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().then(() => setIcon(true)).catch(() => setIcon(false));
    } else {
      audio.pause();
      setIcon(false);
    }
  });

  playMusicOnOpen = () => {
    audio.play().then(() => setIcon(true)).catch(() => setIcon(false));
  };
}

function onLetterOpen(config) {
  typeLetterText(config.letterText);
  renderPhotos(config.photos);
}

function initOpenSequence(config) {
  const button = document.getElementById("gift-box");
  const boxScreen = document.getElementById("box-screen");
  const letterScreen = document.getElementById("letter-screen");
  const state = window.LetterLib.createGiftBoxState();

  state.onChange((next) => {
    if (next === "opening") {
      button.classList.add("is-opening");
      button.disabled = true;
      boxScreen.classList.add("is-leaving");
    }
    if (next === "open") {
      boxScreen.hidden = true;
      letterScreen.hidden = false;
      void letterScreen.offsetWidth; // force layout so the opacity transition runs
      letterScreen.classList.add("is-visible");
      onLetterOpen(config);
    }
  });

  button.addEventListener("click", () => {
    state.open();
    playMusicOnOpen();
    const delay = prefersReducedMotion() ? 50 : 550;
    window.setTimeout(() => state.finishOpen(), delay);
  });
}

function showConfigError(message) {
  const app = document.getElementById("app");
  app.innerHTML =
    '<section class="screen config-error">' +
    "<p>Something's not right in config.js:</p>" +
    '<p class="config-error__detail"></p>' +
    "</section>";
  app.querySelector(".config-error__detail").textContent = message;
}

function init() {
  try {
    const config = window.LetterLib.validateConfig(window.LETTER_CONFIG);
    applyTheme(config.theme);
    renderNames(config);
    initTilt();
    initMusic(config);
    initOpenSequence(config);
    return config;
  } catch (err) {
    showConfigError(err && err.message ? err.message : String(err));
    return undefined;
  }
}

init();
