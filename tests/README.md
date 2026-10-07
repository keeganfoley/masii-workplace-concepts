# Scroll regression checks

Serve the site from the repository root with `python3 -m http.server 8420`.
In another terminal, run `cd tests && npm ci && npm test` (Google Chrome required).
Run `npm run perf` for desktop wheel performance under 4× CPU throttling and mobile touch checks.

The checks cover chapter position and visibility on desktop/mobile, reverse scrolling,
keyboard Home/End, chapter navigation, deep links, viewport resizing, idle drift,
strong wheel/touch gestures advancing exactly one screen, section entry/exit,
Aurora's rapid transition reversal, Editorial tabs preserving page position, and
reduced-motion rendering across all six concepts. Performance numbers are diagnostic,
not hardware-independent thresholds. Mobile checks use Chrome device emulation.
