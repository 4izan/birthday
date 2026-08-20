const test = require("node:test");
const assert = require("node:assert/strict");
const { createGiftBoxState } = require("../lib/giftBoxState.js");

test("starts closed", () => {
  const s = createGiftBoxState();
  assert.equal(s.state, "closed");
});

test("open() transitions to opening and notifies listeners", () => {
  const s = createGiftBoxState();
  const seen = [];
  s.onChange((state) => seen.push(state));
  s.open();
  assert.equal(s.state, "opening");
  assert.deepEqual(seen, ["opening"]);
});

test("finishOpen() transitions opening -> open", () => {
  const s = createGiftBoxState();
  s.open();
  s.finishOpen();
  assert.equal(s.state, "open");
});

test("open() while already opening throws", () => {
  const s = createGiftBoxState();
  s.open();
  assert.throws(() => s.open());
});

test("finishOpen() from closed throws", () => {
  const s = createGiftBoxState();
  assert.throws(() => s.finishOpen());
});
