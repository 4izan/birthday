(function (global) {
  const VALID_TRANSITIONS = {
    closed: ["opening"],
    opening: ["open"],
    open: [],
  };

  function createGiftBoxState(initial = "closed") {
    let state = initial;
    const listeners = [];

    function set(next) {
      const allowed = VALID_TRANSITIONS[state] || [];
      if (!allowed.includes(next)) {
        throw new Error(`Cannot transition from "${state}" to "${next}"`);
      }
      state = next;
      listeners.forEach((cb) => cb(state));
    }

    return {
      get state() {
        return state;
      },
      onChange(cb) {
        listeners.push(cb);
      },
      open() {
        set("opening");
      },
      finishOpen() {
        set("open");
      },
    };
  }

  const api = { createGiftBoxState };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.LetterLib = Object.assign(global.LetterLib || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
