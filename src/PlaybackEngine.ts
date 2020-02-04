import * as Soundfont from "soundfont-player";
import PlaybackScheduler from "./PlaybackScheduler";
import {
  Cursor,
  OpenSheetMusicDisplay,
  MusicSheet,
  Note,
  Instrument,
  InvalidEnumArgumentException,
  Voice
} from "opensheetmusicdisplay";
import { midiInstruments } from "./midiInstruments";

enum PlaybackState {
  INIT = "INIT",
  PLAYING = "PLAYING",
  STOPPED = "STOPPED",
  PAUSED = "PAUSED"
}

interface InstrumentPlayer {
  midiId: number;
  playback: Soundfont.Player;
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
  private midiPlayers: { [midiId: number]: Soundfont.Player };

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

    this.cursor = null;
    this.sheet = null;
    this.denominator = null;

    this.scheduler = null;

    this.iterationSteps = 0;
    this.currentIterationStep = 0;

    this.timeoutHandles = [];

    this.playbackSettings = {
      bpm: this.defaultBpm,
      masterVolume: 1
    };

    this.state = PlaybackState.INIT;
  }

  get wholeNoteLength(): number {
    return Math.round((60 / this.playbackSettings.bpm) * this.denominator * 1000);
  }

  public getPlaybackInstrument(voiceId: number): [number, string] {
    if (!this.sheet) return [0, ""];
    const voice = this.sheet.Instruments.flatMap(i => i.Voices).find(v => v.VoiceId === voiceId);
    return this.availableInstruments.find(i => i[0] === (voice as any).midiInstrumentId + 1);
  }

  async setInstrument(voice: Voice, midiInstrumentId: number): Promise<void> {
    // @ts-ignore
    const player = await Soundfont.instrument(this.ac, this.getInstrumentName(midiInstrumentId - 1));
    (voice as any).midiInstrumentId = midiInstrumentId;
    this.midiPlayers[midiInstrumentId] = player;
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

    await this.loadInstrumentPlayers();
    this.initInstruments();

    this.scheduler = new PlaybackScheduler(this.denominator, this.wholeNoteLength, this.ac, (delay, notes) =>
      this.notePlaybackCallback(delay, notes)
    );
    this.countAndSetIterationSteps();
    this.ready = true;
  }

  private initInstruments() {
    for (const i of this.sheet.Instruments) {
      for (const v of i.Voices) {
        console.log(v);
        (v as any).midiInstrumentId = i.MidiInstrumentId;
      }
    }
  }

  private async loadInstrumentPlayers() {
    let playerPromises: Promise<InstrumentPlayer>[] = [];
    for (const i of this.sheet.Instruments) {
      playerPromises.push(
        // @ts-ignore
        Soundfont.instrument(this.ac, this.getInstrumentName(i.MidiInstrumentId)).then(player => ({
          midiId: i.MidiInstrumentId,
          playback: player
        }))
      );
    }
    const players = await Promise.all(playerPromises);
    this.midiPlayers = {};
    for (const player of players) {
      this.midiPlayers[player.midiId] = player.playback;
    }
  }

  getInstrumentName(midiId: number): string {
    return midiInstruments[midiId][1].toLowerCase().replace(/\s+/g, "_");
  }

  async play() {
    await this.ac.resume();

    this.cursor.show();

    this.state = PlaybackState.PLAYING;
    this.scheduler.start();
  }

  async stop() {
    this.state = PlaybackState.STOPPED;
    this.stopInstruments();
    this.clearTimeouts();
    this.scheduler.reset();
    this.cursor.reset();
    this.currentIterationStep = 0;
    this.cursor.hide();
  }

  pause() {
    this.state = PlaybackState.PAUSED;
    this.ac.suspend();
    this.stopInstruments();
    this.scheduler.setIterationStep(this.currentIterationStep);
    this.scheduler.pause();
    this.clearTimeouts();
  }

  resume() {
    this.state = PlaybackState.PLAYING;
    this.scheduler.resume();
    this.ac.resume();
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

  setBpm(bpm) {
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
    let scheduledNotes = {};

    for (let note of notes) {
      let noteDuration = this.getNoteDuration(note);
      if (noteDuration === 0) continue;
      let noteVolume = this.getNoteVolume(note);

      const midiPlaybackInstrument = (note as any).ParentVoiceEntry.ParentVoice.midiInstrumentId;
      const fixedKey = note.ParentVoiceEntry.ParentVoice.Parent.SubInstruments[0].fixedKey || 0;

      if (!scheduledNotes[midiPlaybackInstrument]) {
        scheduledNotes[midiPlaybackInstrument] = [];
      }

      scheduledNotes[midiPlaybackInstrument].push({
        note: note.halfTone - fixedKey * 12,
        duration: noteDuration / 1000,
        gain: noteVolume
      });
    }

    for (const iId in scheduledNotes) {
      if (!scheduledNotes.hasOwnProperty(iId)) continue;
      if (!this.midiPlayers[iId]) {
        console.warn("Missing player for instrument ID " + iId);
        continue;
      }
      this.midiPlayers[iId].schedule(this.ac.currentTime + audioDelay, scheduledNotes[iId]);
    }

    this.timeoutHandles.push(setTimeout(() => this.iterationCallback(), Math.max(0, audioDelay * 1000 - 40))); // Subtracting 40 milliseconds to compensate for update delay
  }

  private stopInstruments() {
    for (const iId in this.midiPlayers) {
      if (!this.midiPlayers.hasOwnProperty(iId)) continue;
      this.midiPlayers[iId].stop();
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

  private getNoteDuration(note: Note) {
    let duration = note.Length.RealValue * this.wholeNoteLength;
    if (note.NoteTie) {
      if (Object.is(note.NoteTie.StartNote, note) && note.NoteTie.Notes[1]) {
        duration += note.NoteTie.Notes[1].Length.RealValue * this.wholeNoteLength;
      } else {
        duration = 0;
      }
    }
    return duration;
  }

  private getNoteVolume(note: Note) {
    return note.ParentVoiceEntry.ParentVoice.Volume;
  }
}
