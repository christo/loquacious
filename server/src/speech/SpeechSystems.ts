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

  /** Returns a compact string representation of a {@link SpeechSystem} and its current option. */
  descriptor() {
    const desc = this.description ? ` (${this.description})` : "";
    return `${this.system.name}/${this.option}${desc}`;
  }

  /** Display object represending a speech system and its configured option */
  safeObject() {
    return {system: this.system.name, option: this.option, description: this.description};
  }
}

/**
 * Aggregates every {@link SpeechSystem}.
 */
class SpeechSystems {

  private currentSystemIndex = 0;
  systems: Array<SpeechSystem> = [
    new MacOsSpeech(),
    new NoSpeech(),
    new ElevenLabsSpeech(),
  ]

  current() {
    return this.systems[this.currentSystemIndex];
  }

  byName(name: string): SpeechSystem {
    const maybeFound: SpeechSystem | undefined = this.systems.find(s => s.name == name);
    if (maybeFound) {
      return maybeFound;
    } else {
      throw Error(`No speech system with name "${name}" found.`);
    }
  }
}

export {SpeechSystemOption, SpeechSystems}