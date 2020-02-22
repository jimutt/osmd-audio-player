import { midiInstruments } from './midiInstruments';

for(const i of midiInstruments) {
    console.log(`[${i[0] - 1}, "${i[1]}"],`);
}