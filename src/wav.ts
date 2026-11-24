import { encode, type EncodeOptions } from "./timing.js";

export interface WavOptions extends EncodeOptions {
  /** Output sample rate in Hz. Default 44100. */
  sampleRate?: number;
  /** Carrier frequency in Hz. Default 600. */
  tone?: number;
  /** Peak amplitude, 0 to 1. Default 0.8. */
  amplitude?: number;
  /** Rise and fall time per mark, in milliseconds. Default 5. */
  rampMs?: number;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/**
 * Render the signal as a mono 16-bit PCM WAV file.
 *
 * Returns the raw bytes, so the same call works in Node (`fs.writeFile`) and in
 * the browser (`new Blob([bytes], { type: "audio/wav" })`).
 */
export function toWav(text: string, options: WavOptions = {}): Uint8Array {
  const sampleRate = options.sampleRate ?? 44100;
  const tone = options.tone ?? 600;
  const amplitude = options.amplitude ?? 0.8;
  const rampMs = options.rampMs ?? 5;

  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError("sampleRate must be a positive integer");
  }
  if (!Number.isFinite(tone) || tone <= 0) {
    throw new RangeError("tone must be a positive number");
  }
  if (!Number.isFinite(amplitude) || amplitude < 0 || amplitude > 1) {
    throw new RangeError("amplitude must be between 0 and 1");
  }
  if (!Number.isFinite(rampMs) || rampMs < 0) {
    throw new RangeError("rampMs must be zero or positive");
  }

  const marks = encode(text, options);
  const counts = marks.map((mark) =>
    Math.max(0, Math.round((mark.durationMs / 1000) * sampleRate)),
  );
  const totalSamples = Math.max(1, counts.reduce((total, count) => total + count, 0));

  const bytes = new Uint8Array(44 + totalSamples * 2);
  const view = new DataView(bytes.buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, totalSamples * 2, true);

  const rampSamples = Math.round((rampMs / 1000) * sampleRate);
  let offset = 44;
  let sampleIndex = 0;

  marks.forEach((mark, markIndex) => {
    const count = counts[markIndex] ?? 0;
    for (let index = 0; index < count; index += 1) {
      let value = 0;
      if (mark.on) {
        const seconds = sampleIndex / sampleRate;
        value = amplitude * Math.sin(2 * Math.PI * tone * seconds);

        if (rampSamples > 0) {
          const edge = Math.min(index, count - 1 - index);
          if (edge < rampSamples) {
            value *= 0.5 - 0.5 * Math.cos((Math.PI * edge) / rampSamples);
          }
        }
      }

      const pcm = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
      bytes[offset] = pcm & 0xff;
      bytes[offset + 1] = (pcm >> 8) & 0xff;
      offset += 2;
      sampleIndex += 1;
    }
  });

  return bytes;
}
