export enum ArticulationStyle {
  None,
  Staccato,
  Legato
}

export interface NotePlaybackStyle {
  articulation: ArticulationStyle;
}

export interface NotePlaybackInstruction extends NotePlaybackStyle {
  note: number;
  gain: number;
  duration: number;
}
