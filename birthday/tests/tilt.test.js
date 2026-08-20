const test = require("node:test");
const assert = require("node:assert/strict");
const { computeTilt } = require("../lib/tilt.js");

test("center of the rect yields no rotation", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const { rotateX, rotateY } = computeTilt(100, 50, rect);
  assert.equal(rotateX, 0);
  assert.equal(rotateY, 0);
});

test("top-left corner yields max positive rotateX and max negative rotateY", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const { rotateX, rotateY } = computeTilt(0, 0, rect, 12);
  assert.equal(rotateX, 12);
  assert.equal(rotateY, -12);
});

test("bottom-right corner yields max negative rotateX and max positive rotateY", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const { rotateX, rotateY } = computeTilt(200, 100, rect, 12);
  assert.equal(rotateX, -12);
  assert.equal(rotateY, 12);
});

test("pointer outside the rect is clamped to the nearest edge", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  const outside = computeTilt(-50, -50, rect, 12);
  const corner = computeTilt(0, 0, rect, 12);
  assert.deepEqual(outside, corner);
});
