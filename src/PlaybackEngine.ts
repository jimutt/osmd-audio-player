import PlaybackScheduler from "./PlaybackScheduler";
import { Cursor, OpenSheetMusicDisplay, MusicSheet, Note, Instrument, Voice } from "opensheetmusicdisplay";
import { midiInstruments } from "./midi/midiInstruments";
import { SoundfontPlayer } from "./players/SoundfontPlayer";
import { InstrumentPlayer } from "./players/InstrumentPlayer";
import { NotePlaybackInstruction, ArticulationStyle } from "./players/NotePlaybackOptions";
import { getNoteDuration, getNoteVolume, getNoteArticulationStyle } from "./noteHelpers";

enum PlaybackState {
  INIT = "INIT",
  PLAYING = "PLAYING",
  STOPPED = "STOPPED",
  PAUSED = "PAUSED",
}

interface PlaybackSettings {
  bpm: number;
  masterVolume: number;
}

export default class PlaybackEngine {
  private ac: AudioContext;
  private defaultBpm: number = 100;
  private cursor: Cursor;
  private sheet: MusicSheet;
  private denominator: number;
  private scheduler: PlaybackScheduler;
  private instrumentPlayer: InstrumentPlayer;

  private iterationSteps: number;
  private currentIterationStep: number;

  private timeoutHandles: number[];

  public playbackSettings: PlaybackSettings;
  public state: PlaybackState;
  public availableInstruments = midiInstruments;
  public scoreInstruments: Instrument[] = [];
  public ready: boolean = false;

  constructor() {
    this.ac = new AudioContext();
    this.ac.suspend();

    this.instrumentPlayer = new SoundfontPlayer();
    this.instrumentPlayer.init(this.ac);

    this.cursor = null;
    this.sheet = null;
    this.denominator = null;

    this.scheduler = null;

    this.iterationSteps = 0;
    this.currentIterationStep = 0;

    this.timeoutHandles = [];

    this.playbackSettings = {
      bpm: this.defaultBpm,
      masterVolume: 1,
    };

    this.state = PlaybackState.INIT;
  }

  get wholeNoteLength(): number {
    return Math.round((60 / this.playbackSettings.bpm) * this.denominator * 1000);
  }

  public getPlaybackInstrument(voiceId: number): [number, string] {
    if (!this.sheet) return [0, ""];
    const voice = this.sheet.Instruments.flatMap(i => i.Voices).find(v => v.VoiceId === voiceId);
    return this.availableInstruments.find(i => i[0] === (voice as any).midiInstrumentId);
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
    this.denominator = this.sheet.SheetPlaybackSetting.rhythm.Denominator;
    if (this.sheet.HasBPMInfo) {
      this.setBpm(this.sheet.DefaultStartTempoInBpm);
    }

    await this.loadInstruments();
    this.initInstruments();

    this.scheduler = new PlaybackScheduler(this.denominator, this.wholeNoteLength, this.ac, (delay, notes) =>
      this.notePlaybackCallback(delay, notes)
    );
    this.countAndSetIterationSteps();
    this.ready = true;
    this.state = PlaybackState.STOPPED;
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
      playerPromises.push(this.instrumentPlayer.load(i.MidiInstrumentId));
    }
    await Promise.all(playerPromises);
  }

  async play() {
    await this.ac.resume();

    if (this.state === PlaybackState.INIT || this.state === PlaybackState.STOPPED) {
      this.cursor.show();
    }

    this.state = PlaybackState.PLAYING;
    this.scheduler.start();
  }

  async stop() {
    this.state = PlaybackState.STOPPED;
    this.stopPlayers();
    this.clearTimeouts();
    this.scheduler.reset();
    this.cursor.reset();
    this.currentIterationStep = 0;
    this.cursor.hide();
  }

  pause() {
    this.state = PlaybackState.PAUSED;
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

    this.timeoutHandles.push(setTimeout(() => this.iterationCallback(), Math.max(0, audioDelay * 1000 - 40))); // Subtracting 40 milliseconds to compensate for update delay
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
