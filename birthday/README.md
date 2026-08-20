# A Letter For You

A personalized, animated "open the gift" love letter page. Static HTML/CSS/JS — no build step, no server required to view it, no dependencies.

## Customize it

Edit `config.js`:

- `recipientName`, `senderName` — the names shown on the box screen
- `letterText` — your message (use `\n` for line breaks)
- `photos` — up to 5 `{ src, alt }` entries; put the image files in `assets/photos/`
- `song` — `{ src: "assets/song.mp3", title: "..." }`, or `null` to leave out music
- `theme` — colors and font, applied via CSS custom properties

Missing photo files or a missing/broken song file are skipped automatically — the page won't break.

## Preview it

Double-click `index.html`, or drag it into a browser tab. No server needed.

## Host it

Upload the whole folder to any static host (GitHub Pages, Netlify, Vercel, etc.) — `index.html` is the entry point.

## Run the unit tests (optional, for development only)

Requires Node.js 18+.

    node --test

These cover the pure logic (config validation, tilt math, typewriter timing, the box's open-state machine). The animations themselves are verified by eye in a browser — see the manual verification steps in `docs/superpowers/plans/2026-08-19-love-letter-reveal.md`.
