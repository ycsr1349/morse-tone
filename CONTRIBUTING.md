# Contributing

Thanks for looking. This is a small library, so the rules are short.

## Before you open a PR

1. `npm test` must pass. If you change timing behaviour, add a test that pins the
   value — the ITU unit math is the whole point of this package.
2. Keep the runtime dependency count at zero. If a feature needs a dependency,
   open an issue first and explain the trade-off.
3. The library must stay usable in both Node and the browser. No `fs`, no
   `Buffer`, no Node-only globals in `src/`.
4. Match the existing style: 2 spaces, double quotes, semicolons, explicit return
   types on exported functions.

## Good first issues

- More test vectors from published CW training material
- A `decodeWav()` that recovers text from an audio buffer (hard: needs
  threshold detection and tolerance for noise)
- Support for accented characters and extended Morse (non-ITU national
  extensions), behind an opt-in flag
- Demo improvements — the demo should stay dependency-free

## Reporting a timing bug

Include the input text, `wpm`, `farnsworth`, the duration you expected, and the
duration you got. A failing test case in a PR is the fastest possible fix.
