type EventChannel = "error" | "begin" | "end";

type LoqEvent = {
  channel: EventChannel;
  body: any;
};

/**
 * Generalised pub/sub. Event handlers registered for the specific channel are called in order
 * of registration when emit is called for that channel.
 */
class EventEmitter {

  /**
   * Handler registry keyed by {@link EventChannel}.
   * @private
   */
  private readonly handlers: { [keyof: string]: Array<(e: LoqEvent) => void> };
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
    this.handlers = {};
  }

  addHandler(channel: EventChannel, handler: (e: LoqEvent) => void): void {
    if (!this.handlers[channel]) {
      this.handlers[channel] = [];
    }
    this.handlers[channel].push(handler);
  }

  /**
   * Like emit but while {@LoqEvent} only has channel, easier to use.
   * @param c the channel
   */
  emitSimple(c: EventChannel): void {
    this.emit({channel: c} as LoqEvent);
  }

  /**
   * Safely send the event to handlers registered for it.
   */
  emit(e: LoqEvent): void {
    console.log(`(${this.name}) emitting event: ${e.channel}`);
    const channelHandlers = this.handlers[e.channel];
    if (channelHandlers) {
      for (let i = 0; i < channelHandlers.length; i++) {
        try {
          channelHandlers[i](e);
        } catch (error) {
          console.error(`error while handling event ${e.channel}`, error);
        }
      }
    }
  }
}

export {EventEmitter};
export {type LoqEvent, EventChannel};