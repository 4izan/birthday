(function (global) {
  function buildRevealSchedule(text, msPerChar = 18) {
    const schedule = [];
    for (let i = 0; i < text.length; i++) {
      schedule.push({ index: i, char: text[i], delay: i * msPerChar });
    }
    return schedule;
  }

  const api = { buildRevealSchedule };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
