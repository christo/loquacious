import {LipSyncAnimator, LipSyncInput, LipSyncLoqModule, LipSyncResult} from "./LipSyncAnimator";
import {SpeechResult, SpeechSystem} from "../speech/SpeechSystem";
import {MediaFormat, MF_MP4} from "../media";
import {hasEnv} from "../system/config";

import {LoqModule} from "../system/LoqModule";


/**
 * D-iD implementation of {@link LipSyncAnimator} intended to be used together with {@link DidTts}.
 */
class DidAnimator implements LipSyncAnimator {
  private readonly module: LoqModule<LipSyncInput, LipSyncResult>;


  constructor() {
    this.module = new LipSyncLoqModule(this, this.db);
  }

  animate(imageFile: string, speechFile: Promise<string | undefined>, fileKey: string): Promise<LipSyncResult> {

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

  loqModule(): LoqModule<LipSyncInput, LipSyncResult> {
    return this.module;
  }
}

export {DidAnimator};