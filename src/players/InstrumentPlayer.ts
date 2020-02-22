import { NotePlaybackOptions } from "./NotePlaybackOptions";

export interface PlaybackInstrument {
  midiId: number;
  name: string;
  loaded: boolean;
}

export interface InstrumentPlayer {
  instruments: PlaybackInstrument[];
  init: (audioContext: AudioContext) => void;
  load: (midiId: number) => Promise<void>;
  schedule: (midiId: number, notes: NotePlaybackInstruction[]) => void;
  play: (midiId: number, pitch: string, options: NotePlaybackOptions) => void;
}
