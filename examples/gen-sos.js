import { writeFileSync, mkdirSync } from "node:fs";
import { toWav, durationMs } from "../dist/index.js";

const text = "SOS";
const bytes = toWav(text, { wpm: 20, tone: 600, sampleRate: 44100 });

mkdirSync(new URL("../examples/", import.meta.url), { recursive: true });
writeFileSync(new URL("../examples/sos.wav", import.meta.url), bytes);

console.log(`wrote examples/sos.wav — ${bytes.length} bytes, ${durationMs(text, { wpm: 20 })} ms of signal`);
