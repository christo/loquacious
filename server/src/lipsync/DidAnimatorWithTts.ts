import {LipSyncAnimator, LipSyncResult} from "./LipSyncAnimator";
import {DisplaySpeechSystem, SpeechResult, SpeechSystem} from "../speech/SpeechSystem";
import {MediaFormat, MF_MP3, MF_MP4} from "../media";
import {hasEnv} from "../system/config";
import {SpeechSystemOption} from "../speech/SpeechSystems";
import {Message} from "../domain/Message";

/**
 * Implements both {@link SpeechSystem} and {@link LipSyncAnimator} in one API call.
 */
class DidAnimatorWithTts implements LipSyncAnimator, SpeechSystem {

  display: DisplaySpeechSystem;
  speechSystemOption: SpeechSystemOption;

  constructor() {
    this.speechSystemOption = new SpeechSystemOption(this, "default", "default");
    this.display = new DisplaySpeechSystem(this.getName(), [], this.free());
  }

  animate(imageFile: string, speechFile: Promise<string| undefined>, fileKey: string): Promise<LipSyncResult> {

    /* example code from https://docs.d-id.com/reference/createtalk


    const url = 'https://api.d-id.com/talks';
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: 'Basic Zm9vOmJhcg==' // TODO basic auth
      },
      body: JSON.stringify({
        source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg',
        script: {
          type: 'text',
          subtitles: 'false',
          provider: {type: 'elevenlabs', voice_id: 'Sara'},
          input: 'Making videos is easy with D-ID'
        },
        config: {fluent: 'false', pad_audio: '0.0'}
      })
    };

    fetch(url, options)
        .then(res => res.json())
        .then(json => console.log(json))
        .catch(err => console.error(err));
     */
    return Promise.reject();

  }

  speechOutputFormat(): MediaFormat {
    // for this composite service, returning speech might require stripping the audio out of the generated video
    // TODO this is a guess, check it
    return MF_MP3;
  }

  postResponseHook(): Promise<void> {
    return Promise.resolve(undefined);
  }

  videoOutputFormat(): MediaFormat | undefined {
    return MF_MP4;
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
    console.warn("DidAnimatorWithTts.speak not implemented.");
    return Promise.reject("unimplemented");
  }

  currentOption() {
    return this.speechSystemOption;
  }

  options(): SpeechSystemOption[] {
    return [this.speechSystemOption];
  }

  pauseCommand(msDuration: number): string | null {
    // TODO implement - depends on configured speech system used
    return null;
  }

  setCurrentOption(value: string): Promise<void> {
    return Promise.resolve();
  }

  removePauseCommands(m: Message): Message {
    // TODO implement this
    return m;
  }


}