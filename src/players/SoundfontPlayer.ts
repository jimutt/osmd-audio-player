import { InstrumentPlayer, PlaybackInstrument } from "./InstrumentPlayer";
import { NotePlaybackStyle, NotePlaybackInstruction, ArticulationStyle } from "./NotePlaybackOptions";
import { midiInstruments } from "../midi/midiInstruments";
import * as Soundfont from "soundfont-player";

export class SoundfontPlayer implements InstrumentPlayer {
  public instruments: PlaybackInstrument[];

  private players: Map<number, Soundfont.Player> = new Map();
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

  async load(midiId: number) {
    const instrument = this.instruments.find(i => i.midiId === midiId);
    if (!instrument) {
      throw new Error("SoundfontPlayer does not support midi instrument ID " + midiId);
    }
    if (this.players.has(midiId)) return;

    const player = await Soundfont.instrument(
      //@ts-ignore
      this.audioContext,
      this.getSoundfontPlayerInstrumentName(instrument.name) as Soundfont.InstrumentName
    );
    this.players.set(midiId, player);
  }

  play: (midiId: string | number, options: NotePlaybackStyle) => void;

  stop(midiId: number) {
    if (!this.players.has(midiId)) return;
    this.players.get(midiId).stop();
  }

  schedule(midiId: number, time: number, notes: NotePlaybackInstruction[]) {
    this.verifyPlayerLoaded(midiId);
    this.applyDynamics(notes);
    this.players.get(midiId).schedule(time, notes);
  }

  private applyDynamics(notes: NotePlaybackInstruction[]): void {
    for(const note of notes) {
      if(note.articulation === ArticulationStyle.Staccato) {
        note.gain = Math.max(note.gain + 0.3, note.gain * 1.3);
        note.duration = Math.min(note.duration * 0.4, 0.4);
      }
    }
  }

  private verifyPlayerLoaded(midiId: number) {
    if (!this.players.has(midiId)) throw new Error("No soundfont player loaded for midi instrument " + midiId);
  }

  private getSoundfontPlayerInstrumentName(midiName: string): string {
    return midiName.toLowerCase().replace(/\s+/g, "_");
  }
}
