import {SpeechSystem} from "../speech/SpeechSystem";
import {OpenAIMsg} from "./OpenAIMsg";

/**
 * Input to LLM includes system prompts as well as user prompts, both from the whole conversation so far
 * and also the current new request.
 *
 * In future some event trigger inputs might need to be added and it's also possible that responses from
 * the ai are synthesised to bend it closer to a behavioural goal.
 *
 * Apart from obvious simple implementation {@link BasicLlmInput} the planned "expert system" and
 * potentially a more complex database-stored system prompt builder might be warranted to support
 * ongoing refinement of multiple personalities, moods, guidance on back stories and manage the
 * non-repetition or conflict of generated content across conversations. Also there may need to be
 * more methods here.
 */
interface LlmInput {
  /**
   * System prompt, whole session history of chat etc.
   */
  getParams(): OpenAIMsg[];

  /**
   * The speech system for which the Llm is instructed to write text. Necessary for specifying pauses
   * and any other future metadata.
   */
  // TODO ideally we would enumerate the instruction support functions here and forego the dependency on speechsystem
  //   but we don't know how many we need right now, at least we also need to be able to remove the pause instructions
  //   so we can also render the llm output as text
  targetTts(): SpeechSystem;
}

/**
 * Simple implementation.
 */
class BasicLlmInput implements LlmInput {
  private readonly _params: OpenAIMsg[];
  private readonly _speechSystem: SpeechSystem;

  constructor(params: OpenAIMsg[], speechSystem: SpeechSystem) {
    this._params = params;
    this._speechSystem = speechSystem;
  }

  getParams(): OpenAIMsg[] {
    return this._params;
  }

  targetTts(): SpeechSystem {
    return this._speechSystem;
  }
}

export {BasicLlmInput};
export {LlmInput};