import type {CharacterVoice} from "speech/CharacterVoice";
import {SpeechSystemOption} from "speech/SpeechSystems";

class DisplaySpeechSystem {
  name: string;
  options: Array<CharacterVoice>;

  constructor(name: string, options: Array<CharacterVoice>) {
    this.name = name;
    this.options = options;
  }
}

// may need to add a method to clean text of speech system directives for display

type SpeechSystem = {
  name: string;
  speak: (message: string) => Promise<void>;
  options: () => Array<string>;
  /** Command for inserting a speech of this duration or null if no such command exists */
  pauseCommand: (msDuration: number) => string | null;
  currentOption(): SpeechSystemOption;
  display: DisplaySpeechSystem;
}

export {type SpeechSystem, DisplaySpeechSystem};
