
type EventChannel = "error" | "begin" | "end" | "defer"

type LoqEvent = {
  channel: EventChannel;
};

/**
 * Generalised pub/sub.
 */
class EventEmitter {

  private readonly handlers: { [keyof: string]: Array<(e: LoqEvent) => void>};

  constructor() {
    this.handlers = {};
  }

  addHandler(channel: EventChannel, handler: (e: LoqEvent) => void): void {
    if (!this.handlers[channel]) {
      this.handlers[channel] = [];
    }
    this.handlers[channel].push(handler);
  }

  emit(e: LoqEvent): void {
    const channelHandlers = this.handlers[e.channel];
    for (let i = 0; i < channelHandlers.length; i++) {
      try {
        channelHandlers[i](e);
      } catch (e) {
        console.error("error handling event", e);
      }
    }
  }
}

export {EventEmitter};
export {type LoqEvent, EventChannel};