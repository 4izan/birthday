const test = require("node:test");
const assert = require("node:assert/strict");
const { validateConfig } = require("../lib/config.js");

test("fills in theme defaults and normalizes optional fields when omitted", () => {
  const cfg = validateConfig({
    recipientName: "A",
    senderName: "B",
    letterText: "hi",
  });
  assert.equal(cfg.theme.primary, "#c9184a");
  assert.deepEqual(cfg.photos, []);
  assert.equal(cfg.song, null);
});

test("throws listing the missing required field", () => {
  assert.throws(
    () => validateConfig({ senderName: "B", letterText: "hi" }),
    /recipientName/
  );
});

test("caps photos at 5 entries", () => {
  const photos = Array.from({ length: 8 }, (_, i) => ({ src: `p${i}.jpg` }));
  const cfg = validateConfig({
    recipientName: "A",
    senderName: "B",
    letterText: "hi",
    photos,
  });
  assert.equal(cfg.photos.length, 5);
});

test("throws when a photo entry has no src", () => {
  assert.throws(
    () =>
      validateConfig({
        recipientName: "A",
        senderName: "B",
        letterText: "hi",
        photos: [{}],
      }),
    /photos\[0\]\.src/
  );
});

test("passes through a valid song and custom theme override", () => {
  const cfg = validateConfig({
    recipientName: "A",
    senderName: "B",
    letterText: "hi",
    song: { src: "assets/song.mp3" },
    theme: { primary: "#000000" },
  });
  assert.equal(cfg.song.src, "assets/song.mp3");
  assert.equal(cfg.theme.primary, "#000000");
  assert.equal(cfg.theme.accent, "#ffb3c6"); // untouched default
});
