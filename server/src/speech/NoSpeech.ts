import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";

/**
 * Does not make sound or generate audio files.
 */
class NoSpeech implements SpeechSystem {
  readonly name = "NoSpeech";
  private onlyOptions = [new CharacterVoice("silence", "silence", "is golden")];
  readonly display = new DisplaySpeechSystem(this.name, this.onlyOptions)

  options(): Array<string> {
    return this.onlyOptions.map(x => x.voiceId);
  }

  currentOption(): SpeechSystemOption {
    return new SpeechSystemOption(this, this.onlyOptions[0].voiceId, this.onlyOptions[0].description);
  }

  speak(message: string): Promise<string> {
    console.log(`Silently speaking message of length ${message.length}`);
    return Promise.resolve("No audio because no speech");
  }

  pauseCommand(msDuration: number): string | null {
    return null;
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