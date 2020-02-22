import { InstrumentPlayer, PlaybackInstrument } from "./InstrumentPlayer";
import { NotePlaybackOptions } from "./NotePlaybackOptions";
import { midiInstruments } from "../midi/midiInstruments";
import * as Soundfont from "soundfont-player";

export class SoundfontPlayer implements InstrumentPlayer {
  public instruments: PlaybackInstrument[];

  private players = [];
  private audioContext: AudioContext;

  constructor() {
    this.instruments = midiInstruments.map(i => ({
      midiId: i[0],
      name: i[1],
      loaded: false
    }));
  }

  init(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async load(instrumentId: string | number) {
    const instrument = this.instruments.find(i => i.midiId === instrumentId);
    if (!instrument) {
      throw new Error("SoundfontPlayer does not support midi instrument ID " + instrumentId);
    }
    const player = await Soundfont.instrument(
      this.audioContext,
      this.getSoundfontPlayerInstrumentName(instrument.name) as Soundfont.InstrumentName
    );
  }

  play: (instrumentId: string | number, pitch: string, options: NotePlaybackOptions) => void;
  schedule: (midiId: number, notes: any[]) => void;

  private getSoundfontPlayerInstrumentName(midiName: string): string {
    return midiName.toLowerCase().replace(/\s+/g, "_");
  }
}
