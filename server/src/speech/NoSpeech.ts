import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem, type SpeechResult} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";
import type {Message} from "../domain/Message";
import type {Predicate} from "../system/config";
import {always} from "../system/config";

const SILENT_SUCCESS: SpeechResult = {
  filePath: () => undefined,
  tts: () => undefined
}

/**
 * Does not make sound or generate audio files.
 */
class NoSpeech implements SpeechSystem {
  canRun() {
    return true;
  }

  readonly name = "NoSpeech";
  private onlyOptions = [new CharacterVoice("silence", "silence", "is golden")];

  readonly display = new DisplaySpeechSystem(this.getName(), this.onlyOptions, this.free());

  options(): Array<string> {
    return this.onlyOptions.map(x => x.voiceId);
  }

  currentOption(): SpeechSystemOption {
    return new SpeechSystemOption(this, this.onlyOptions[0].voiceId, this.onlyOptions[0].description);
  }

  speak(_message: string, _filename: string): Promise<SpeechResult> {
    return Promise.resolve(SILENT_SUCCESS);
  }

  pauseCommand(msDuration: number): string | null {
    return null;
  }

  removePauseCommands(m: Message): Message {
    return m;
  }



  /**
   * Doesn't have any metadata.
   */
  getMetadata(): string | undefined {
    return undefined;
  }

  getName(): string {
    return this.name;
  }

  /**
   * Always succeeds because we don't have metadata.
   * @param metadata ignored.
   */
  configure(metadata: string): Promise<void> {
    return Promise.resolve();
  }

  free(): boolean {
    return true;
  }
}

export {NoSpeech};