import { NotePlaybackInstruction } from "./NotePlaybackOptions";
import { IAudioContext } from "standardized-audio-context";

export interface PlaybackInstrument {
  midiId: number;
  name: string;
  loaded: boolean;
}

export interface InstrumentPlayer {
  instruments: PlaybackInstrument[];
  init: (audioContext: IAudioContext) => void;
  load: (midiId: number) => Promise<void>;
  schedule: (midiId: number, time: number, notes: NotePlaybackInstruction[]) => void;
  play: (midiId: number, options: NotePlaybackInstruction) => void;
  stop: (midiId: number) => void;
}
