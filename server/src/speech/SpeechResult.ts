import {Tts} from "../domain/Tts";

/**
 * Result of a request to generate speech from text.
 */
interface SpeechResult {
  /**
   * Audio file path.
   */
  filePath(): string;

  /**
   * Corresponding Db domain object.
   */
  tts(): Tts;
}

export {SpeechResult};