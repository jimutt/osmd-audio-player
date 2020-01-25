import * as Soundfont from "soundfont-player";
import PlaybackScheduler from "./PlaybackScheduler";
import { Cursor, OpenSheetMusicDisplay, MusicSheet } from "opensheetmusicdisplay";

enum PlaybackState {
  INIT = "INIT",
  PLAYING = "PLAYING",
  STOPPED = "STOPPED",
  PAUSED = "PAUSED"
}

export default class PlaybackEngine {
  private ac: AudioContext;
  private defaultBpm: number = 100;
  private cursor: Cursor;
  private sheet: MusicSheet;
  private denominator: number;
  private scheduler: PlaybackScheduler;

  private iterationSteps: number;
  private currentIterationStep: number;

  private timeoutHandles: number[];

  public playbackSettings: any; // TODO: TYPE

  public state: PlaybackState;

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
      instrument: null,
      volumes: {
        master: 1,
        instruments: []
      }
    };

    this.state = PlaybackState.INIT;
  }

  get wholeNoteLength(): number {
    return Math.round((60 / this.playbackSettings.bpm) * this.denominator * 1000);
  }

  async loadInstrument(instrumentName): Promise<void> {
    // @ts-ignore
    this.playbackSettings.instrument = await Soundfont.instrument(this.ac, instrumentName);
  }

  loadScore(osmd: OpenSheetMusicDisplay): void {
    this.sheet = osmd.Sheet;
    this.cursor = osmd.cursor;
    this.denominator = this.sheet.SheetPlaybackSetting.rhythm.Denominator;
    if (this.sheet.HasBPMInfo) {
      this.setBpm(this.sheet.DefaultStartTempoInBpm);
    }

    let instruments = this.sheet.Instruments.map(i => {
      return {
        name: i.Name,
        id: i.Id,
        voices: i.Voices.map(v => {
          return {
            name: "Voice " + v.VoiceId,
            id: v.VoiceId,
            volume: 1
          };
        })
      };
    });

    this.playbackSettings.volumes.instruments = instruments;

    this.scheduler = new PlaybackScheduler(this.denominator, this.wholeNoteLength, this.ac, (delay, notes) =>
      this.notePlaybackCallback(delay, notes)
    );
    this.countAndSetIterationSteps();
  }

  async play() {
    if (!this.playbackSettings.instrument) await this.loadInstrument("acoustic_grand_piano");
    await this.ac.resume();

    this.cursor.show();

    this.state = PlaybackState.PLAYING;
    this.scheduler.start();
  }

  async stop() {
    this.state = PlaybackState.STOPPED;
    if (this.playbackSettings.instrument) this.playbackSettings.instrument.stop();
    this.clearTimeouts();
    this.scheduler.reset();
    this.cursor.reset();
    this.currentIterationStep = 0;
    this.cursor.hide();
  }

  pause() {
    this.state = PlaybackState.PAUSED;
    this.ac.suspend();
    if (this.playbackSettings.instrument) this.playbackSettings.instrument.stop();
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
    let playbackInstrument = this.playbackSettings.volumes.instruments.find(i => i.id === instrumentId);
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

  private notePlaybackCallback(audioDelay, notes) {
    if (this.state !== PlaybackState.PLAYING) return;
    let scheduledNotes = [];

    for (let note of notes) {
      let noteDuration = this.getNoteDuration(note);
      if (noteDuration === 0) continue;
      let noteVolume = this.getNoteVolume(note);

      scheduledNotes.push({
        note: note.halfTone,
        duration: noteDuration / 1000,
        gain: noteVolume
      });
    }

    this.playbackSettings.instrument.schedule(this.ac.currentTime + audioDelay, scheduledNotes);

    this.timeoutHandles.push(setTimeout(() => this.iterationCallback(), Math.max(0, audioDelay * 1000 - 40))); // Subtracting 40 milliseconds to compensate for update delay
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

  private getNoteDuration(note) {
    let duration = note.length.realValue * this.wholeNoteLength;
    if (note.NoteTie) {
      if (Object.is(note.NoteTie.StartNote, note) && note.NoteTie.notes[1]) {
        duration += note.NoteTie.notes[1].length.realValue * this.wholeNoteLength;
      } else {
        duration = 0;
      }
    }
    return duration;
  }

  private getNoteVolume(note) {
    let instrument = note.voiceEntry.ParentVoice.Parent;
    let playbackInstrument = this.playbackSettings.volumes.instruments.find(i => i.id === instrument.Id);
    let playbackVoice = playbackInstrument.voices.find(v => v.id === note.voiceEntry.ParentVoice.VoiceId);
    return playbackVoice.volume;
  }
}
