import { NotePlaybackOptions } from "../NotePlaybackOptions";

interface PlaybackInstrument {
  id: string | number;
  name: string;
  loaded: boolean;
}

export interface InstrumentPlayer {
  instruments: PlaybackInstrument[];
  load: (instrumentId: string | number) => Promise<void>;
  play: (instrumentId: string | number, pitch: string, options: NotePlaybackOptions) => void;
}
