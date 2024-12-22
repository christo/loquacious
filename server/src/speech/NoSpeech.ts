import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/TtsGateway";
import type {Message} from "../domain/Message";
import {type MediaFormat, MF_MP3} from "../media";

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

  /**
   * Does nothing.
   * @param _value
   */
  async setCurrentOption(_value: string): Promise<void> {
    return Promise.resolve();
  }

  speak(_message: string, _filename: string): Promise<string> {
    // TODO this is a bit stinky
    return Promise.resolve("");
  }

  pauseCommand(_: number): string | null {
    return null;
  }

  removePauseCommands<T extends Message>(m: T): T {
    return m;
  }

  speechOutputFormat(): MediaFormat {
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
  configure(_: string): Promise<void> {
    return Promise.resolve();
  }

  free(): boolean {
    return true;
  }
}

export {NoSpeech};