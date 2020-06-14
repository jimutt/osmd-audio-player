import { Note } from "opensheetmusicdisplay/build/dist/src";

type ScheduledNotes = {
  tick: number;
  notes: Note[];
};

export default class StepQueue {
  steps: ScheduledNotes[] = [];

  constructor() {}

  [Symbol.iterator]() {
    return this.steps.values();
  }

  createStep(tick: number): ScheduledNotes {
    let step = this.steps.find(s => s.tick === tick);
    if (!step) {
      step = { tick, notes: [] };
      this.steps.push(step);
    }

    return step;
  }

  addNote(tick: number, note: Note): void {
    const step = this.steps.find(s => s.tick === tick) ?? this.createStep(tick);
    step.notes.push(note);
  }

  delete(value: ScheduledNotes): void {
    const index = this.steps.findIndex(v => v.tick === value.tick);
    if (index != null) this.steps.splice(index, 1);
  }

  sort(): StepQueue {
    this.steps.sort((a, b) => (a.tick < b.tick ? -1 : 0));
    return this;
  }

  getFirstEmptyTick(): number {
    return this.sort().steps.filter(s => !s.notes.length)[0].tick;
  }
}
