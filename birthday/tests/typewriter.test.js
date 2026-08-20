const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRevealSchedule } = require("../lib/typewriter.js");

test("empty string yields an empty schedule", () => {
  assert.deepEqual(buildRevealSchedule(""), []);
});

test("schedule length matches text length, delays step by msPerChar", () => {
  const schedule = buildRevealSchedule("hi", 10);
  assert.equal(schedule.length, 2);
  assert.equal(schedule[0].char, "h");
  assert.equal(schedule[0].delay, 0);
  assert.equal(schedule[1].char, "i");
  assert.equal(schedule[1].delay, 10);
});

test("defaults to 18ms per character when not specified", () => {
  const schedule = buildRevealSchedule("ab");
  assert.equal(schedule[1].delay, 18);
});
