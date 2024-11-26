import {LoqEvent} from "./Loquacious";

/**
 * Generalised pub/sub.
 */
class EventEmitter {

  private readonly handlers: { [keyof: string]: Array<(e: LoqEvent) => void>};

  constructor() {
    this.handlers = {};
  }

  addHandler(channel: string, handler: (e: LoqEvent) => void): void {
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