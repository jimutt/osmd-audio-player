import PlaybackScheduler from "./PlaybackScheduler";
import { Cursor, OpenSheetMusicDisplay, MusicSheet, Note, Instrument, Voice } from "opensheetmusicdisplay";
import { SoundfontPlayer } from "./players/SoundfontPlayer";
import { InstrumentPlayer, PlaybackInstrument } from "./players/InstrumentPlayer";
import { NotePlaybackInstruction } from "./players/NotePlaybackOptions";
import { getNoteDuration, getNoteVolume, getNoteArticulationStyle } from "./internals/noteHelpers";
import { EventEmitter } from "./internals/EventEmitter";
import { AudioContext, IAudioContext } from "standardized-audio-context";

export enum PlaybackState {
  INIT = "INIT",
  PLAYING = "PLAYING",
  STOPPED = "STOPPED",
  PAUSED = "PAUSED",
}

export enum PlaybackEvent {
  STATE_CHANGE = "state-change",
  ITERATION = "iteration",
}

interface PlaybackSettings {
  bpm: number;
  masterVolume: number;
}

export default class PlaybackEngine {
  private ac: IAudioContext;
  private defaultBpm: number = 100;
  private cursor: Cursor;
  private sheet: MusicSheet;
  private scheduler: PlaybackScheduler;
  private instrumentPlayer: InstrumentPlayer;
  private events: EventEmitter<PlaybackEvent>;

  private iterationSteps: number;
  private currentIterationStep: number;

  private timeoutHandles: number[];

  public playbackSettings: PlaybackSettings;
  public state: PlaybackState;
  public availableInstruments: PlaybackInstrument[];
  public scoreInstruments: Instrument[] = [];
  public ready: boolean = false;

  constructor(context: IAudioContext = new AudioContext(), instrumentPlayer: InstrumentPlayer = new SoundfontPlayer()) {
    this.ac = context;
    this.ac.suspend();

    this.instrumentPlayer = instrumentPlayer;
    this.instrumentPlayer.init(this.ac);

    this.availableInstruments = this.instrumentPlayer.instruments;

    this.events = new EventEmitter();

    this.cursor = null;
    this.sheet = null;

    this.scheduler = null;

    this.iterationSteps = 0;
    this.currentIterationStep = 0;

    this.timeoutHandles = [];

    this.playbackSettings = {
      bpm: this.defaultBpm,
      masterVolume: 1,
    };

    this.setState(PlaybackState.INIT);
  }

  get wholeNoteLength(): number {
    return Math.round((60 / this.playbackSettings.bpm) * 4000);
  }

  public getPlaybackInstrument(voiceId: number): PlaybackInstrument {
    if (!this.sheet) return null;
    const voice = this.sheet.Instruments.flatMap(i => i.Voices).find(v => v.VoiceId === voiceId);
    return this.availableInstruments.find(i => i.midiId === (voice as any).midiInstrumentId);
  }

  public async setInstrument(voice: Voice, midiInstrumentId: number): Promise<void> {
    await this.instrumentPlayer.load(midiInstrumentId);
    (voice as any).midiInstrumentId = midiInstrumentId;
  }

  async loadScore(osmd: OpenSheetMusicDisplay): Promise<void> {
    this.ready = false;
    this.sheet = osmd.Sheet;
    this.scoreInstruments = this.sheet.Instruments;
    this.cursor = osmd.cursor;
    if (this.sheet.HasBPMInfo) {
      this.setBpm(this.sheet.DefaultStartTempoInBpm);
    }

    await this.loadInstruments();
    this.initInstruments();

    this.scheduler = new PlaybackScheduler(this.wholeNoteLength, this.ac, (delay, notes) =>
      this.notePlaybackCallback(delay, notes)
    );

    this.countAndSetIterationSteps();
    this.ready = true;
    this.setState(PlaybackState.STOPPED);
  }

  private initInstruments() {
    for (const i of this.sheet.Instruments) {
      for (const v of i.Voices) {
        (v as any).midiInstrumentId = i.MidiInstrumentId;
      }
    }
  }

  private async loadInstruments() {
    let playerPromises: Promise<void>[] = [];
    for (const i of this.sheet.Instruments) {
      const pbInstrument = this.availableInstruments.find(pbi => pbi.midiId === i.MidiInstrumentId);
      if (pbInstrument == null) {
        this.fallbackToPiano(i);
      }
      playerPromises.push(this.instrumentPlayer.load(i.MidiInstrumentId));
    }
    await Promise.all(playerPromises);
  }

  private fallbackToPiano(i: Instrument) {
    console.warn(`Can't find playback instrument for midiInstrumentId ${i.MidiInstrumentId}. Falling back to piano`);
    i.MidiInstrumentId = 0;

    if (this.availableInstruments.find(i => i.midiId === 0) == null) {
      throw new Error("Piano fallback failed, grand piano not supported");
    }
  }

  async play() {
    await this.ac.resume();

    if (this.state === PlaybackState.INIT || this.state === PlaybackState.STOPPED) {
      this.cursor.show();
    }

    this.setState(PlaybackState.PLAYING);
    this.scheduler.start();
  }

  async stop() {
    this.setState(PlaybackState.STOPPED);
    this.stopPlayers();
    this.clearTimeouts();
    this.scheduler.reset();
    this.cursor.reset();
    this.currentIterationStep = 0;
    this.cursor.hide();
  }

  pause() {
    this.setState(PlaybackState.PAUSED);
    this.ac.suspend();
    this.stopPlayers();
    this.scheduler.setIterationStep(this.currentIterationStep);
    this.scheduler.pause();
    this.clearTimeouts();
  }

  jumpToStep(step) {
    this.pause();
    if (this.currentIterationStep > step) {
      this.cursor.reset();
      this.currentIterationStep = 0;
    }
    while (this.currentIterationStep < step) {
      this.cursor.next();
      ++this.currentIterationStep;
    }
    let schedulerStep = this.currentIterationStep;
    if (this.currentIterationStep > 0 && this.currentIterationStep < this.iterationSteps) ++schedulerStep;
    this.scheduler.setIterationStep(schedulerStep);
  }

  setBpm(bpm: number) {
    this.playbackSettings.bpm = bpm;
    if (this.scheduler) this.scheduler.wholeNoteLength = this.wholeNoteLength;
  }

  public on(event: PlaybackEvent, cb: (...args: any[]) => void) {
    this.events.on(event, cb);
  }

  private countAndSetIterationSteps() {
    this.cursor.reset();
    let steps = 0;
    while (!this.cursor.Iterator.EndReached) {
      if (this.cursor.Iterator.CurrentVoiceEntries) {
        this.scheduler.loadNotes(this.cursor.Iterator.CurrentVoiceEntries);
      }
      this.cursor.next();
      ++steps;
    }
    this.iterationSteps = steps;
    this.cursor.reset();
  }

  private notePlaybackCallback(audioDelay, notes: Note[]) {
    if (this.state !== PlaybackState.PLAYING) return;
    let scheduledNotes: Map<number, NotePlaybackInstruction[]> = new Map();

    for (let note of notes) {
      if (note.isRest()) {
        continue;
      }
      const noteDuration = getNoteDuration(note, this.wholeNoteLength);
      if (noteDuration === 0) continue;
      const noteVolume = getNoteVolume(note);
      const noteArticulation = getNoteArticulationStyle(note);

      const midiPlaybackInstrument = (note as any).ParentVoiceEntry.ParentVoice.midiInstrumentId;
      const fixedKey = note.ParentVoiceEntry.ParentVoice.Parent.SubInstruments[0].fixedKey || 0;

      if (!scheduledNotes.has(midiPlaybackInstrument)) {
        scheduledNotes.set(midiPlaybackInstrument, []);
      }

      scheduledNotes.get(midiPlaybackInstrument).push({
        note: note.halfTone - fixedKey * 12,
        duration: noteDuration / 1000,
        gain: noteVolume,
        articulation: noteArticulation,
      });
    }

    for (const [midiId, notes] of scheduledNotes) {
      this.instrumentPlayer.schedule(midiId, this.ac.currentTime + audioDelay, notes);
    }

    this.timeoutHandles.push(
      window.setTimeout(() => this.iterationCallback(), Math.max(0, audioDelay * 1000 - 35)), // Subtracting 35 milliseconds to compensate for update delay
      window.setTimeout(() => this.events.emit(PlaybackEvent.ITERATION, notes), audioDelay * 1000)
    );
  }

  private setState(state: PlaybackState) {
    this.state = state;
    this.events.emit(PlaybackEvent.STATE_CHANGE, state);
  }

  private stopPlayers() {
    for (const i of this.sheet.Instruments) {
      for (const v of i.Voices) {
        this.instrumentPlayer.stop((v as any).midiInstrumentId);
      }
    }
  }

  // Used to avoid duplicate cursor movements after a rapid pause/resume action
  private clearTimeouts() {
    for (let h of this.timeoutHandles) {
      clearTimeout(h);
    }
    this.timeoutHandles = [];
  }

  private iterationCallback() {
    if (this.state !== PlaybackState.PLAYING) return;
    if (this.currentIterationStep > 0) this.cursor.next();
    ++this.currentIterationStep;
  }
}
