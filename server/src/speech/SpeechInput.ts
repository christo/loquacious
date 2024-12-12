/**
 * Result of requesting text to speech.
 */
interface SpeechInput {
  getText(): string;

  getBaseFileName(): string;

  getLlmMessageId(): number;
}

export {SpeechInput};