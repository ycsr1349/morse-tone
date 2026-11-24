import test from "node:test";
import assert from "node:assert/strict";
import { durationMs, encode, toWav, toDots, decode, MORSE_TABLE } from "../dist/index.js";

// Reference values for ITU-R M.1677-1 timing:
//   unit = 1200 / wpm ms, dit = 1 unit, dah = 3 units,
//   element gap = 1 unit, character gap = 3 units, word gap = 7 units.

test("one dit is one unit", () => {
  assert.equal(durationMs("E", { wpm: 20 }), 60); // 1200/20 = 60 ms
});

test("one dah is three units", () => {
  assert.equal(durationMs("T", { wpm: 20 }), 180);
});

test("SOS at 20 wpm is 27 units and 9 carrier-on marks", () => {
  const marks = encode("SOS", { wpm: 20 });
  assert.equal(marks.filter((mark) => mark.on).length, 9);
  // S(5) + gap(3) + O(11) + gap(3) + S(5) = 27 units = 1620 ms
  assert.equal(marks.reduce((total, mark) => total + mark.durationMs, 0), 1620);
});

test("PARIS plus trailing word gap is exactly 50 units", () => {
  // 43 units of characters and character gaps, plus the 7-unit trailing word
  // gap, is the PARIS standard: one minute at 1 wpm.
  assert.equal(durationMs("PARIS", { wpm: 20, trailingGap: true }), 3000);
  assert.equal(durationMs("PARIS", { wpm: 20, trailingGap: true }), 50 * 60);
});

test("farnsworth stretches gaps but keeps the dits and dahs", () => {
  const fast = durationMs("PARIS", { wpm: 20 });
  const slow = durationMs("PARIS", { wpm: 20, farnsworth: 10 });
  assert.ok(slow > fast);
  // Element length is still driven by wpm, so the first character is unchanged.
  assert.equal(durationMs("E", { wpm: 20, farnsworth: 10 }), 60);
});

test("array of marks alternates on and off", () => {
  const marks = encode("SOS", { wpm: 20 });
  for (let index = 1; index < marks.length; index += 1) {
    assert.notEqual(marks[index - 1].on, marks[index].on);
  }
});

test("dot-dash text and back", () => {
  assert.equal(toDots("sos"), "... --- ...");
  assert.equal(decode("... --- ..."), "SOS");
  assert.equal(toDots("hello world"), ".... . .-.. .-.. --- / .-- --- .-. .-.. -..");
});

test("wav container is well formed", () => {
  const wav = toWav("SOS", { wpm: 20, sampleRate: 8000 });
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), "WAVE");
  assert.equal(String.fromCharCode(...wav.slice(36, 40)), "data");

  const view = new DataView(wav.buffer);
  assert.equal(view.getUint16(20, true), 1); // PCM
  assert.equal(view.getUint16(22, true), 1); // mono
  assert.equal(view.getUint32(24, true), 8000);
  assert.equal(view.getUint16(34, true), 16); // bits per sample

  // 1620 ms at 8 kHz = 12960 samples, 2 bytes each, plus a 44-byte header.
  assert.equal(view.getUint32(40, true), 12960 * 2);
  assert.equal(wav.length, 44 + 12960 * 2);
});

test("wav audio is silent during gaps and loud during marks", () => {
  const rate = 8000;
  const wav = toWav("E", { wpm: 10, sampleRate: rate, rampMs: 0 });
  const view = new DataView(wav.buffer);
  const sample = (index) => view.getInt16(44 + index * 2, true);

  // E is a single dit: 1 unit on at 10 wpm = 120 ms = 960 samples.
  let peak = 0;
  for (let index = 50; index < 910; index += 7) {
    peak = Math.max(peak, Math.abs(sample(index)));
  }
  assert.ok(peak > 1000, `carrier should be audible mid-mark, peak was ${peak}`);
});

test("unsupported characters are skipped, spacing stays intact", () => {
  // "a你b" is one word; the unknown character is dropped and the two letters
  // keep their single inter-character gap, so it renders as ".- -...".
  assert.equal(toDots("a你b"), ".- -...");
  const marks = encode("a你b", { wpm: 20 });
  assert.equal(marks.filter((mark) => mark.on).length, 6); // ".-" has 2 elements, "-..." has 4
});

test("invalid speeds are rejected", () => {
  assert.throws(() => encode("SOS", { wpm: 0 }), RangeError);
  assert.throws(() => encode("SOS", { wpm: -5 }), RangeError);
  assert.throws(() => encode("SOS", { wpm: 10, farnsworth: 20 }), RangeError);
});

test("table covers letters, digits and the ITU punctuation set", () => {
  for (const character of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
    assert.equal(typeof MORSE_TABLE[character], "string", character);
  }
  for (const character of ".,?!'/()&:;=+-_\"$@") {
    assert.equal(typeof MORSE_TABLE[character], "string", character);
  }
});
