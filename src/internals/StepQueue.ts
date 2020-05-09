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

  add(tick: number, note: Note) {
    let existingStep = this.steps.find(s => s.tick === tick);
    if (existingStep) {
      existingStep.notes.push(note);
    } else {
      this.steps.push({ tick, notes: [note] });
    }
  }

  delete(value: ScheduledNotes) {
    const index = this.steps.findIndex(v => v.tick === value.tick);
    if (index != null) this.steps.splice(index, 1);
  }

  sort(): void {
    this.steps.sort((a, b) => (a.tick > b.tick ? 1 : 0));
  }
}
