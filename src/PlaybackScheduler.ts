import StepQueue from "./internals/StepQueue";
import { VoiceEntry } from "opensheetmusicdisplay/build/dist/src";

type NoteSchedulingCallback = (delay: number, notes: any) => void;

export default class PlaybackScheduler {
  public denominator: number;
  public wholeNoteLength: number;

  private stepQueue = new StepQueue();
  private stepQueueIndex = 0;
  private scheduledTicks = new Set();

  private currentTick = 0;
  private currentTickTimestamp = 0;

  private audioContext: AudioContext;
  private audioContextStartTime: number = 0;

  private schedulerIntervalHandle: number = null;
  private scheduleInterval: number = 200; // Milliseconds
  private schedulePeriod: number = 500;
  private tickDenominator: number = 1024;

  private lastTickOffset: number = 300; // Hack to get the initial notes play better
  private playing: boolean = false;

  private noteSchedulingCallback: NoteSchedulingCallback;

  constructor(
    denominator: number,
    wholeNoteLength: number,
    audioContext: AudioContext,
    noteSchedulingCallback: NoteSchedulingCallback
  ) {
    this.noteSchedulingCallback = noteSchedulingCallback;
    this.denominator = denominator;
    this.wholeNoteLength = wholeNoteLength;
    this.audioContext = audioContext;
  }

  get schedulePeriodTicks() {
    return this.schedulePeriod / this.tickDuration;
  }

  get audioContextTime() {
    if (!this.audioContext) return 0;
    return (this.audioContext.currentTime - this.audioContextStartTime) * 1000;
  }

  get tickDuration() {
    return this.wholeNoteLength / this.tickDenominator;
  }

  private get calculatedTick() {
    return this.currentTick + Math.round((this.audioContextTime - this.currentTickTimestamp) / this.tickDuration);
  }

  start() {
    this.playing = true;
    this.stepQueue.sort();
    this.audioContextStartTime = this.audioContext.currentTime;
    this.currentTickTimestamp = this.audioContextTime;
    if (!this.schedulerIntervalHandle) {
      this.schedulerIntervalHandle = window.setInterval(() => this.scheduleIterationStep(), this.scheduleInterval);
    }
  }

  setIterationStep(step: number) {
    step = Math.min(this.stepQueue.steps.length - 1, step);
    this.stepQueueIndex = step;
    this.currentTick = this.stepQueue.steps[this.stepQueueIndex].tick;
  }

  pause() {
    this.playing = false;
  }

  resume() {
    this.playing = true;
    this.currentTickTimestamp = this.audioContextTime;
  }

  reset() {
    this.playing = false;
    this.currentTick = 0;
    this.currentTickTimestamp = 0;
    this.stepQueueIndex = 0;
    clearInterval(this.scheduleInterval);
    this.schedulerIntervalHandle = null;
  }

  loadNotes(currentVoiceEntries: VoiceEntry[]) {
    let thisTick = this.lastTickOffset;
    if (this.stepQueue.steps.length > 0) {
      thisTick = this.stepQueue.getFirstEmptyTick();
    }

    for (let entry of currentVoiceEntries) {
      if (!entry.IsGrace) {
        for (let note of entry.Notes) {
          this.stepQueue.addNote(thisTick, note);
          this.stepQueue.createStep(thisTick + note.Length.RealValue * this.tickDenominator);
        }
      }
    }
  }

  private scheduleIterationStep() {
    if (!this.playing) return;
    this.currentTick = this.calculatedTick;
    this.currentTickTimestamp = this.audioContextTime;

    let nextTick = this.stepQueue.steps[this.stepQueueIndex]?.tick;
    while (this.nextTickAvailableAndWithinSchedulePeriod(nextTick)) {
      let step = this.stepQueue.steps[this.stepQueueIndex];

      let timeToTick = (step.tick - this.currentTick) * this.tickDuration;
      if (timeToTick < 0) timeToTick = 0;

      this.scheduledTicks.add(step.tick);
      this.noteSchedulingCallback(timeToTick / 1000, step.notes);

      this.stepQueueIndex++;
      nextTick = this.stepQueue.steps[this.stepQueueIndex]?.tick;
    }

    for (let tick of this.scheduledTicks) {
      if (tick <= this.currentTick) {
        this.scheduledTicks.delete(tick);
      }
    }
  }

  private nextTickAvailableAndWithinSchedulePeriod(nextTick: any) {
    return (
      nextTick &&
      this.currentTickTimestamp + (nextTick - this.currentTick) * this.tickDuration <=
        this.currentTickTimestamp + this.schedulePeriod
    );
  }
}
