import { EventEmitter } from "./EventEmitter";

describe("EventEmitter", () => {
  test("Single subscriber", () => {
    const emitter = new EventEmitter();
    const cb = jest.fn(() => {});

    emitter.on("test-event", cb);
    emitter.emit("test-event");

    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("Single subscriber, with arguments", () => {
    const emitter = new EventEmitter();
    const cb = jest.fn(() => {});

    emitter.on("test-event", cb);
    emitter.emit("test-event", 1, 2);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(1, 2);
  });

  test("Multiple subscribers", () => {
    const emitter = new EventEmitter();
    const cb1 = jest.fn(() => {});
    const cb2 = jest.fn(() => {});

    emitter.on("test-event", cb1);
    emitter.on("test-event", cb2);

    emitter.emit("test-event");

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  test("Multiple events", () => {
    const emitter = new EventEmitter();
    const cb1 = jest.fn(() => {});
    const cb2 = jest.fn(() => {});
    const cb3 = jest.fn(() => {});

    emitter.on("event1", cb1);
    emitter.on("event2", cb2);
    emitter.on("event3", cb3);

    emitter.emit("event1");
    emitter.emit("event2");

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(0);
  });
});
