import {EventChannel, LoqEvent} from "./EventEmitter";

/**
 * Encapsulation of polymorphic generic async function call.
 */
interface LoqModule<I, O> {
  /**
   * Perform primary function, transforming input to output.
   * @param input
   */
  call(input: Promise<I>): Promise<O>;

  /**
   * Register for events
   * @param event
   * @param handler
   */
  on(event: EventChannel, handler: (event: LoqEvent) => void): void;
}

export {LoqModule};