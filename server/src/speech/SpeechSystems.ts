import {ElevenLabsSpeech} from "speech/ElevenLabsSpeech";
import {MacOsSpeech} from "speech/MacOsSpeech";
import {NoSpeech} from "speech/NoSpeech";
import {type SpeechSystem} from "speech/SpeechSystem";

/**
 * Represents a choosable option within a specific speech system. Options are represented by unique strings that
 * are SpeechSystem specific identifiers, typically for a specific voice. Future expansion here may include
 * audio post-processing, speaking rate etc.
 */
class SpeechSystemOption {
  system: SpeechSystem;
  option: string;
  description?: string

  constructor(system: SpeechSystem, option: string, description?: string) {
    this.system = system;
    this.option = option;
    this.description = description;
  }

  descriptor() {
    const desc = this.description ? ` (${this.description})` : "";
    return `${this.system.name}/${this.option}${desc}`;
  }

  safeObject() {
    return { system: this.system.name, option: this.option}
  }
}

/**
 * Aggregates every {@link SpeechSystem}.
 */
class SpeechSystems {

  currentSystemIndex = 0;
  systems: Array<SpeechSystem> = [
    new MacOsSpeech(),
    new NoSpeech(),
    new ElevenLabsSpeech(),
  ]
  currentSpeechSystem() {
    return this.systems[this.currentSystemIndex];
  }
}

export {SpeechSystemOption, SpeechSystems}