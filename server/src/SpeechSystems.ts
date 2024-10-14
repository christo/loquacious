import {ElevenLabsSpeech} from "ElevenLabsSpeech";
import {MacOsSpeech} from "MacOsSpeech";
import {NoSpeech} from "NoSpeech";
import {type SpeechSystem} from "SpeechSystem";


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
    new ElevenLabsSpeech()
  ]

  voiceOptions() {
    return this.systems.flatMap(s => s.options().map(o => new SpeechSystemOption(s, o).safeObject()))
  }

  current() {
    return this.systems[this.currentSystemIndex].current();
  }
}

export {SpeechSystemOption, SpeechSystems}