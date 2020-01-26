import StepQueue from "./StepQueue";
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
  private schedulePeriod: number = 1500;
  private tickDenominator: number = 1024;

  private lastTickOffset: number = 300; // Hack to get the initial notes play better
  private playing: boolean = false;
  private loaderFutureTicks: Set<number> = new Set();

  private noteSchedulingCallback: NoteSchedulingCallback;
  private iterationCallback: () => void;

  constructor(
    denominator: number,
    wholeNoteLength: number,
    audioContext: AudioContext,
    noteSchedulingCallback: NoteSchedulingCallback,
    iterationCallback: () => void = null
  ) {
    this.noteSchedulingCallback = noteSchedulingCallback;
    this.iterationCallback = iterationCallback;
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
    console.log("AudioContext time: ", this.audioContextTime);
    console.log("Tick duration: ", this.tickDuration);
    this.audioContextStartTime = this.audioContext.currentTime;
    this.currentTickTimestamp = this.audioContextTime;
    if (!this.schedulerIntervalHandle) {
      this.schedulerIntervalHandle = setInterval(() => this.scheduleIterationStep(), this.scheduleInterval);
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
      thisTick = Math.min(...this.loaderFutureTicks);
    }

    for (let entry of currentVoiceEntries) {
      for (let note of entry.Notes) {
        this.loaderFutureTicks.add(thisTick + note.Length.RealValue * this.tickDenominator);
        this.stepQueue.add(thisTick, note);
      }
    }

    for (let tick of this.loaderFutureTicks) {
      if (tick <= thisTick) this.loaderFutureTicks.delete(tick);
    }
  }

  private scheduleIterationStep() {
    if (!this.playing) return;
    this.currentTick = this.calculatedTick;
    this.currentTickTimestamp = this.audioContextTime;

    let nextTick = this.stepQueue.steps[this.stepQueueIndex]
      ? this.stepQueue.steps[this.stepQueueIndex].tick
      : undefined;
    while (this.nextTickAvailableAndWithinSchedulePeriod(nextTick)) {
      let step = this.stepQueue.steps[this.stepQueueIndex];

      let timeToTick = (step.tick - this.currentTick) * this.tickDuration;
      if (timeToTick < 0) timeToTick = 0;

      this.scheduledTicks.add(step.tick);
      this.noteSchedulingCallback(timeToTick / 1000, step.notes);

      this.stepQueueIndex++;
      nextTick = this.stepQueue.steps[this.stepQueueIndex] ? this.stepQueue.steps[this.stepQueueIndex].tick : undefined;
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
