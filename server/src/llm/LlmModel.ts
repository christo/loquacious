import OpenAI from "openai";

interface LlmModel {
  /**
   * Unique identifier used by external APIs.
   */
  id: string;

  /**
   * Seconds since Unix epoch when model was created.
   */
  created: number;

  /**
   * Fixed type.
   */
  object: 'model';

  /**
   * Owning organisation.
   */
  owned_by: string;
}

function fromOpenAi(openai: OpenAI.Model): LlmModel {
  return openai as LlmModel;
}

export {type LlmModel, fromOpenAi};