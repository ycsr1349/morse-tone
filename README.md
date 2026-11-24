# morse-tone

[![test](https://github.com/ycsr1349/morse-tone/actions/workflows/test.yml/badge.svg)](https://github.com/ycsr1349/morse-tone/actions/workflows/test.yml)

Generate real Morse code audio with ITU-R M.1677-1 timing.

Zero dependencies, TypeScript, works in Node and the browser. Turns text into a
list of timed marks, or straight into a WAV file you can play.

```
npm install morse-tone
```

```ts
import { toWav } from "morse-tone";

const wav = toWav("SOS", { wpm: 20, tone: 600 });
```

That's it. `wav` is a `Uint8Array`.

---

## Why this exists

There are plenty of libraries that turn text into `... --- ...`. What most of
them don't do is turn it into **sound with correct timing** — and that is the
part people actually need when they build a CW trainer, a classroom demo, an
accessibility tool, or a game that plays telegraph audio.

`morse-tone` is that layer:

- timing follows the ITU standard, not a guess
- output is a real WAV (16-bit PCM, mono) or timed marks you can drive however you like
- no runtime dependencies, no Node-only APIs, same code path in both environments
- the standards math is written down and asserted in tests

Listen to the sample: [`examples/sos.wav`](examples/sos.wav) (SOS, 20 wpm, 600 Hz).

There is a dependency-free demo in [`demo/index.html`](demo/index.html). Run it with
any static server, for example `npx serve .` then open `/demo/`.

## Timing, spelled out

ITU-R M.1677-1 defines everything in **units**, and one unit is `1200 / wpm`
milliseconds:

| Element | Units |
| --- | --- |
| dit | 1 |
| dah | 3 |
| gap between elements of one character | 1 |
| gap between characters | 3 |
| gap between words | 7 |

The `1200 / wpm` constant comes from the word **PARIS**: it takes exactly 50
units including its trailing word gap, so at 1 wpm a word takes one minute.

This is asserted in the test suite rather than assumed:

```
durationMs("PARIS", { wpm: 20, trailingGap: true }) === 3000   // 50 units × 60 ms
```

## Usage

### Timed marks

Useful when you want to drive your own oscillator, a canvas, or an LED.

```ts
import { encode } from "morse-tone";

const marks = encode("SOS", { wpm: 20 });
// [{ on: true, durationMs: 60 }, { on: false, durationMs: 60 }, ...]
```

Marks always alternate `on` / `off`, so you can walk them with a simple loop.

### WAV bytes

```ts
import { toWav } from "morse-tone";
import { writeFileSync } from "node:fs";

const wav = toWav("CQ CQ DE M0ABC", { wpm: 18, tone: 700 });
writeFileSync("cq.wav", wav);
```

```ts
// browser
const blob = new Blob([toWav("SOS")], { type: "audio/wav" });
const url = URL.createObjectURL(blob);
```

### Dots and text

```ts
import { toDots, decode } from "morse-tone";

toDots("hello world")      // ".... . .-.. .-.. --- / .-- --- .-. .-.. -.."
decode("... --- ...")      // "SOS"
```

### Duration without generating audio

```ts
import { durationMs } from "morse-tone";

durationMs("SOS", { wpm: 20 })   // 1620
```

## API

```ts
encode(text: string, options?: EncodeOptions): Mark[]
durationMs(text: string, options?: EncodeOptions): number
toDots(text: string): string
decode(dots: string): string
toWav(text: string, options?: WavOptions): Uint8Array
```

`EncodeOptions`

| Option | Default | Meaning |
| --- | --- | --- |
| `wpm` | `20` | character speed; sets the unit length |
| `farnsworth` | same as `wpm` | slower effective speed used for character and word gaps only |
| `trailingGap` | `false` | append a word gap after the last character |

`WavOptions` extends `EncodeOptions`

| Option | Default | Meaning |
| --- | --- | --- |
| `sampleRate` | `44100` | output sample rate |
| `tone` | `600` | carrier frequency in Hz |
| `amplitude` | `0.8` | peak amplitude, 0–1 |
| `rampMs` | `5` | rise/fall per mark, avoids clicks |

## Farnsworth spacing

Beginners copy faster than they can send. Farnsworth keeps the dits and dahs at
the character speed but stretches the gaps, so the rhythm is easier to follow.

```ts
encode("PARIS", { wpm: 20, farnsworth: 10 });
```

Element length stays at `1200 / 20` ms; character and word gaps are computed at
`1200 / 10` ms. Farnsworth must be less than or equal to `wpm`.

## Character set

A–Z, 0–9, and the punctuation ITU-R M.1677-1 defines: `. , ? ' ! / ( ) & : ; = + - _ " $ @`

Characters outside the table are skipped, and the remaining characters keep their
spacing. Nothing throws on ordinary text.

## Tests

```
npm test
```

The suite pins the unit math against the PARIS reference, checks that marks
alternate, verifies the WAV header and byte length, and confirms that audio is
audible mid-mark and silent in gaps.

## Where it came from

This is the engine behind the audio export on
[morse-code-translator.org](https://morse-code-translator.org), a free
browser-based translator that runs entirely on the device. The library is
extracted so other projects can use the same timing without rebuilding it.

## License

MIT
