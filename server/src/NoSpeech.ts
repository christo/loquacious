import type {SpeechSystem} from "SpeechSystem";
import {SpeechSystemOption} from "SpeechSystems";

class NoSpeech implements SpeechSystem {
  name = "No Speech";
  onlyOptions = ["silence"];

  options(): Array<string> {
    return this.onlyOptions;
  }

  current(): SpeechSystemOption {
    return new SpeechSystemOption(this, this.onlyOptions[0]);
  }

  speak(message: string): Promise<void> {
    console.log(`No Speech so not speaking message of length ${message.length}`);
    return Promise.resolve();
  }
}

export {NoSpeech};