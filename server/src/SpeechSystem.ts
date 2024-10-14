import {SpeechSystemOption} from "SpeechSystems";

type SpeechSystem = {
  name: string;
  speak: (message: string) => Promise<void>;
  options: () => Array<string>;
  current(): SpeechSystemOption;
}

export type {SpeechSystem};
