import {LipSyncAnimator, LipSyncResult} from "./LipSyncAnimator";
import {DisplaySpeechSystem, SpeechResult, SpeechSystem} from "../speech/SpeechSystem";
import {MediaFormat, MF_MP3} from "../media";
import {hasEnv} from "../system/config";
import {SpeechSystemOption} from "../speech/SpeechSystems";
import {Message} from "../domain/Message";

/**
 * Implements both {@link SpeechSystem} and {@link LipSyncAnimator} in one API call.
 */
class DidAnimatorWithTts implements LipSyncAnimator, SpeechSystem {

  display: DisplaySpeechSystem;

  constructor() {
    this.display = new DisplaySpeechSystem(this.getName(), [], this.free());
  }

  animate(imageFile: string, speechFile: string, fileKey: string): Promise<LipSyncResult> {
    return Promise.reject();
  }

  speechOutputFormat(): MediaFormat {
    // for this composite service, returning speech might require stripping the audio out of the generated video
    // TODO this is a guess, check it
    return MF_MP3;
  }

  writeCacheFile(): Promise<void> {
    return Promise.resolve(undefined);
  }

  videoOutputFormat(): MediaFormat | undefined {
    return undefined;
  }

  free = () => false;

  getMetadata = () => undefined;

  getName = () => "D-ID Composite";

  configure(metadata: string): Promise<void> {
    console.warn("DidAnimatorWithTts.configure unsupported.");
    return Promise.resolve();
  }

  canRun = hasEnv("DID_AUTH");

  speak(message: string, basename: string): Promise<SpeechResult> {
    return Promise.reject("unimplemented");
  }

  currentOption() {
    // TODO implement
    return new SpeechSystemOption(this, "default", "default");
  }

  options(): SpeechSystemOption[] {
    // TODO implement
    return [];
  }

  pauseCommand(msDuration: number): string | null {
    // TODO implement - depends on configured speech system used
    return null;
  }

  setCurrentOption(value: string): Promise<void> {
    return Promise.resolve(undefined);
  }




  removePauseCommands(m: Message): Message {
    // TODO implement this
    return m;
  }


}