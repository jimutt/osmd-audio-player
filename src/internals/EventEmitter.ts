export class EventEmitter<T> {
  private subscribers: Map<T, Function[]> = new Map();

  public on(event: T, callback: (...args: any[]) => any) {
    if (!this.subscribers.get(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event).push(callback);
  }

  public emit(event: T, ...args: any[]) {
    const subscribers = this.subscribers.get(event) || [];
    for (const sub of subscribers) {
      sub(...args);
    }
  }
}
