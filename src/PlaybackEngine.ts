import * as Soundfont from "soundfont-player";
import PlaybackScheduler from "./PlaybackScheduler";
import { Cursor, OpenSheetMusicDisplay, MusicSheet, Note, Instrument } from "opensheetmusicdisplay";
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

export default class PlaybackEngine {
  private ac: AudioContext;
  private defaultBpm: number = 100;
  private cursor: Cursor;
  private sheet: MusicSheet;
  private denominator: number;
  private scheduler: PlaybackScheduler;
  private players: { [midiId: number]: Soundfont.Player };

  private iterationSteps: number;
  private currentIterationStep: number;

  private timeoutHandles: number[];

  public playbackSettings: any; // TODO: TYPE
  public state: PlaybackState;
  public availableInstruments = midiInstruments;

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
      masterVolume: 1,
      instruments: []
    };

    this.state = PlaybackState.INIT;
  }

  get wholeNoteLength(): number {
    return Math.round((60 / this.playbackSettings.bpm) * this.denominator * 1000);
  }

  public getPlaybackInstrument(scoreInstrumentId: number): [number, string] {
    const midiInstrumentId = this.playbackSettings.instruments.find(i => i.id === scoreInstrumentId).midiInstrumentId;
    return this.availableInstruments.find(i => i[0] === midiInstrumentId + 1);
  }

  async setInstrument(scoreInstrumentId: number, midiInstrumentId: number): Promise<void> {
    // @ts-ignore
    const player = await Soundfont.instrument(this.ac, this.getInstrumentName(midiInstrumentId - 1));
    let instrument = this.playbackSettings.instruments.find(i => i.id === scoreInstrumentId);
    instrument.midiInstrumentId = midiInstrumentId;
    this.players[midiInstrumentId] = player;
  }

  async loadScore(osmd: OpenSheetMusicDisplay): Promise<void> {
    this.sheet = osmd.Sheet;
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
  }

  private initInstruments() {
    this.playbackSettings.instruments = [];
    for (const i of this.sheet.Instruments) {
      const instrumentSettings = {
        name: i.Name,
        id: i.Id,
        midiInstrumentId: i.MidiInstrumentId,
        voices: i.Voices.map(v => {
          return {
            name: "Voice " + v.VoiceId,
            id: v.VoiceId,
            volume: 1
          };
        })
      };
      this.playbackSettings.instruments.push(instrumentSettings);
      for (const v of i.Voices) {
        (v as any).playbackInstrument = instrumentSettings;
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
    this.players = {};
    for (const player of players) {
      this.players[player.midiId] = player.playback;
    }
  }

  getInstrumentName(midiId: number): string {
    return midiInstruments[midiId + 1][1].toLowerCase().replace(/\s+/g, "_");
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

  setVoiceVolume(instrumentId, voiceId, volume) {
    let playbackInstrument = this.playbackSettings.instruments.find(i => i.id === instrumentId);
    let playbackVoice = playbackInstrument.voices.find(v => v.id === voiceId);
    playbackVoice.volume = volume;
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

      const midiPlaybackInstrument = (note as any).ParentVoiceEntry.ParentVoice.playbackInstrument.midiInstrumentId;

      if (!scheduledNotes[midiPlaybackInstrument]) {
        scheduledNotes[midiPlaybackInstrument] = [];
      }

      scheduledNotes[midiPlaybackInstrument].push({
        note: note.halfTone,
        duration: noteDuration / 1000,
        gain: noteVolume
      });
    }

    for (const iId in scheduledNotes) {
      if (!scheduledNotes.hasOwnProperty(iId)) continue;
      if (!this.players[iId]) {
        console.warn("Missing player for instrument ID " + iId);
        continue;
      }
      this.players[iId].schedule(this.ac.currentTime + audioDelay, scheduledNotes[iId]);
    }

    this.timeoutHandles.push(setTimeout(() => this.iterationCallback(), Math.max(0, audioDelay * 1000 - 40))); // Subtracting 40 milliseconds to compensate for update delay
  }

  private stopInstruments() {
    for (const iId in this.players) {
      if (!this.players.hasOwnProperty(iId)) continue;
      this.players[iId].stop();
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

  private getNoteVolume(note) {
    let instrument = note.voiceEntry.ParentVoice.Parent;
    let playbackInstrument = this.playbackSettings.instruments.find(i => i.id === instrument.Id);
    let playbackVoice = playbackInstrument.voices.find(v => v.id === note.voiceEntry.ParentVoice.VoiceId);
    return playbackVoice.volume;
  }
}
