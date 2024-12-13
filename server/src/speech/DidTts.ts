import {DisplaySpeechSystem, SpeechSystem} from "./SpeechSystem";
import {SpeechSystemOption} from "./TtsGateway";
import {Message} from "../domain/Message";
import {MediaFormat, MF_MP3} from "../media";
import {pauseCommand, removePauseCommands} from "./ElevenLabsSpeech";

/**
 * Just collect inputs to pass on to DidAnimator for using ElevenLabs from there.
 */
class DidTts implements SpeechSystem {
  display: DisplaySpeechSystem;
  private readonly speechSystemOption: SpeechSystemOption;


  constructor() {
    this.display = new DisplaySpeechSystem(this.getName(), [], this.free());
    this.speechSystemOption = new SpeechSystemOption(this, "default", "default");
  }

  /**
   * Delegates to ElevenLabs
   * @param msDuration
   */
  pauseCommand = pauseCommand;

  /**
   * Delegates to ElevenLabs
   * @param m
   */
  removePauseCommands = removePauseCommands;

  currentOption() {
    return this.speechSystemOption;
  }

  options(): SpeechSystemOption[] {
    return [this.speechSystemOption];
  }

  speak(message: string, basename: string): Promise<string> {
    return Promise.reject("implement threading the result to the DiD lipsync part");
  }

  speechOutputFormat(): MediaFormat {
    // for this composite service, returning speech might require stripping the audio out of the generated video
    // TODO this is a guess, check it
    return MF_MP3;
  }

  free(): boolean {
    return false;
  }

  getMetadata(): string | undefined {
    return undefined;
  }

  getName(): string {
    return "DiD Tts";
  }

  canRun(): boolean {
    return true;
  }

  configure(metadata: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  setCurrentOption(value: string): Promise<void> {
    return Promise.resolve(undefined);
  }
}

export {DidTts};