export enum ArticulationStyle {
  None,
  Staccato,
  Legato
}

export interface NotePlaybackOptions {
  articulation: ArticulationStyle;
  velocity: number;
  duration: number;
}
