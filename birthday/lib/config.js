(function (global) {
  const DEFAULT_THEME = {
    primary: "#c9184a",
    accent: "#ffb3c6",
    background: "#fff0f3",
    foreground: "#3a1f28",
    fontSerif: "Georgia, 'Times New Roman', serif",
  };

  function validateConfig(raw) {
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid letter config: config must be an object");
    }

    const errors = [];
    if (!raw.recipientName || typeof raw.recipientName !== "string") {
      errors.push("recipientName must be a non-empty string");
    }
    if (!raw.senderName || typeof raw.senderName !== "string") {
      errors.push("senderName must be a non-empty string");
    }
    if (!raw.letterText || typeof raw.letterText !== "string") {
      errors.push("letterText must be a non-empty string");
    }

    const photos = Array.isArray(raw.photos) ? raw.photos : [];
    photos.forEach((p, i) => {
      if (!p || typeof p.src !== "string" || !p.src) {
        errors.push(`photos[${i}].src must be a non-empty string`);
      }
    });

    if (errors.length > 0) {
      throw new Error("Invalid letter config: " + errors.join("; "));
    }

    const song =
      raw.song && typeof raw.song.src === "string" && raw.song.src
        ? { src: raw.song.src, title: raw.song.title || "" }
        : null;

    return {
      recipientName: raw.recipientName,
      senderName: raw.senderName,
      letterText: raw.letterText,
      photos: photos.slice(0, 5).map((p) => ({ src: p.src, alt: p.alt || "" })),
      song,
      theme: Object.assign({}, DEFAULT_THEME, raw.theme || {}),
    };
  }

  const api = { validateConfig };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
