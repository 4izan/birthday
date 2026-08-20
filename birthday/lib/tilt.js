(function (global) {
  function computeTilt(pointerX, pointerY, rect, maxDeg = 12) {
    const px = (pointerX - rect.left) / rect.width;
    const py = (pointerY - rect.top) / rect.height;
    const clampedX = Math.min(1, Math.max(0, px));
    const clampedY = Math.min(1, Math.max(0, py));
    const rotateY = (clampedX - 0.5) * 2 * maxDeg;
    const rotateX = (0.5 - clampedY) * 2 * maxDeg;
    return { rotateX, rotateY };
  }

  const api = { computeTilt };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
