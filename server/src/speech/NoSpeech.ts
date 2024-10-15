import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";

class NoSpeech implements SpeechSystem {
  name = "No Speech";
  onlyOptions = [new CharacterVoice("silence", "is golden")];
  display = new DisplaySpeechSystem(this.name, this.onlyOptions)

  options(): Array<string> {
    return this.onlyOptions.map(x => x.voiceId);
  }

  currentOption(): SpeechSystemOption {
    return new SpeechSystemOption(this, this.onlyOptions[0].voiceId, this.onlyOptions[0].description);
  }

  speak(message: string): Promise<void> {
    console.log(`Silently speaking message of length ${message.length}`);
    return Promise.resolve();
  }

  pauseCommand(msDuration: number): string | null {
    return null;
  }


}

export {NoSpeech};