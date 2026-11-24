import { MORSE_TABLE, REVERSE_TABLE } from "./code.js";

/** One contiguous stretch of carrier-on or carrier-off, in milliseconds. */
export interface Mark {
  on: boolean;
  durationMs: number;
}

export interface EncodeOptions {
  /** Character speed in words per minute. ITU timing defines 1 unit = 1200 / wpm ms. */
  wpm?: number;
  /**
   * Farnsworth spacing: element length is still set by `wpm`, but character and
   * word gaps are stretched as if the operator were sending at this slower speed.
   * Must be less than or equal to `wpm`.
   */
  farnsworth?: number;
  /** Emit a trailing word gap after the last character. Default false. */
  trailingGap?: boolean;
}

export const DEFAULT_WPM = 20;

function assertSpeed(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, received ${value}`);
  }
}

/**
 * ITU-R M.1677-1 timing, expressed in units:
 *
 *   dit = 1        dah = 3
 *   gap between elements of one character = 1
 *   gap between characters = 3
 *   gap between words = 7
 *
 * One unit is 1200 / wpm milliseconds, which makes the word "PARIS" plus a
 * trailing word gap exactly 50 units = one minute at 1 wpm.
 */
export function encode(text: string, options: EncodeOptions = {}): Mark[] {
  const wpm = options.wpm ?? DEFAULT_WPM;
  const farnsworth = options.farnsworth ?? wpm;
  assertSpeed("wpm", wpm);
  assertSpeed("farnsworth", farnsworth);
  if (farnsworth > wpm) {
    throw new RangeError("farnsworth must be less than or equal to wpm");
  }

  const elementMs = 1200 / wpm;
  const spacingMs = 1200 / farnsworth;

  const marks: Mark[] = [];
  const push = (on: boolean, durationMs: number): void => {
    if (durationMs <= 0) return;
    const last = marks[marks.length - 1];
    if (last !== undefined && last.on === on) {
      last.durationMs += durationMs;
      return;
    }
    marks.push({ on, durationMs });
  };

  const words = text
    .trim()
    .toUpperCase()
    .split(/[ \t\n\r]+/)
    .filter((word) => word.length > 0);

  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) push(false, 7 * spacingMs);

    let charactersEmitted = 0;
    for (const character of word) {
      const pattern = MORSE_TABLE[character];
      if (pattern === undefined) continue;

      if (charactersEmitted > 0) push(false, 3 * spacingMs);

      let firstElement = true;
      for (const symbol of pattern) {
        if (!firstElement) push(false, 1 * elementMs);
        push(true, (symbol === "." ? 1 : 3) * elementMs);
        firstElement = false;
      }

      charactersEmitted += 1;
    }
  });

  if (options.trailingGap === true && marks.length > 0) {
    push(false, 7 * spacingMs);
  }

  return marks;
}

/** Total length of the rendered signal, in milliseconds. */
export function durationMs(text: string, options: EncodeOptions = {}): number {
  return encode(text, options).reduce((total, mark) => total + mark.durationMs, 0);
}

/** Render as plain dot-dash text: characters separated by spaces, words by " / ". */
export function toDots(text: string): string {
  return text
    .trim()
    .toUpperCase()
    .split(/[ \t\n\r]+/)
    .filter((word) => word.length > 0)
    .map((word) =>
      Array.from(word)
        .map((character) => MORSE_TABLE[character] ?? "")
        .filter((pattern) => pattern.length > 0)
        .join(" "),
    )
    .filter((word) => word.length > 0)
    .join(" / ");
}

/** Decode dot-dash text back to plain text. Unknown patterns are dropped. */
export function decode(dots: string): string {
  return dots
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .trim()
        .split(/[ \t]+/)
        .filter((pattern) => pattern.length > 0)
        .map((pattern) => REVERSE_TABLE[pattern] ?? "")
        .join(""),
    )
    .filter((word) => word.length > 0)
    .join(" ");
}
