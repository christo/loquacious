import {Animator, AnimatorResult} from "./Animator";
import {MediaFormat, MF_MP4} from "../media";
import {hasEnv} from "../system/config";

/**
 * D-iD implementation of {@link Animator} intended to be used together with {@link DidTts}.
 */
class DidAnimator implements Animator {

  canRun = hasEnv("DID_AUTH");

  constructor() {
  }

  animate(imageFile: string, speechFile: Promise<string | undefined>, fileKey: string): Promise<AnimatorResult> {

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
}

export {DidAnimator};