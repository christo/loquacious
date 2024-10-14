import type {CharacterVoice} from "CharacterVoice";
import {SpeechSystemOption} from "SpeechSystems";

class DisplaySpeechSystem {
  name: string;
  options: Array<CharacterVoice>;

  constructor(name: string, options: Array<CharacterVoice>) {
    this.name = name;
    this.options = options;
  }
}

type SpeechSystem = {
  name: string;
  speak: (message: string) => Promise<void>;
  options: () => Array<string>;
  current(): SpeechSystemOption;
  display: DisplaySpeechSystem;
}

export {type SpeechSystem, DisplaySpeechSystem};
