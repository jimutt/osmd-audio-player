import { midiInstruments } from "../midi/midiInstruments";

for (const i of midiInstruments) {
  console.log(`[${i[0] - 1}, "${i[1]}"],`);
}
