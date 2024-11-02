import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechResult, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";
import type {Message} from "../domain/Message";
import {type MediaFormat, MF_MP3} from "../media";

const SILENT_SUCCESS: SpeechResult = {
  filePath: () => undefined,
  tts: () => undefined
}

/**
 * Does not make sound or generate audio files.
 */
class NoSpeech implements SpeechSystem {
  readonly name = "NoSpeech";
  private onlyOption = [new CharacterVoice("silence", "silence", "is golden")];
  readonly display = new DisplaySpeechSystem(this.getName(), this.onlyOption, this.free());

  canRun() {
    return true;
  }

  options(): Array<SpeechSystemOption> {
    return this.onlyOption.map(v => new SpeechSystemOption(this, v.voiceId, v.name, v.description));
  }

  currentOption(): SpeechSystemOption {
    return new SpeechSystemOption(this, this.onlyOption[0].voiceId, this.onlyOption[0].description);
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

  outputFormat(): MediaFormat {
    return MF_MP3;
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