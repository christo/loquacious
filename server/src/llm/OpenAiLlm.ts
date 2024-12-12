import OpenAI from "openai";
import {hasEnv} from "../system/config";
import {Llm, type PartialLlmResult} from "./Llm";
import {LlmModel} from "./LlmModel";

type OpenAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const CANNOT_DO_SYSTEM_PROMPT = [
  "o1preview"
];

/**
 * OpenAI LLM Backend
 */
class OpenAiLlm implements Llm {
  readonly baseUrl = undefined;
  readonly enableHealth = false;
  //   got cloudflare failure calling any openai method. All online service-based things need a failure timeout
  canRun = hasEnv("OPENAI_API_KEY");
  // TODO need to give occasionally broken online service a timeout and canRun should only come back after time elapsed
  private readonly name = "ChatGPT-LLM";
  private openai;
  private modelName: string;

  constructor(model = "gpt-4o") {
    this.modelName = model;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string,
    });
  }

  async currentModel(): Promise<LlmModel> {
    const theModel = await this.findByName(this.modelName);
    if (theModel) {
      return theModel;
    } else {
      return Promise.reject(`Model ${this.modelName} not found`);
    }
  }

  async setCurrentOption(value: string): Promise<void> {
    if (CANNOT_DO_SYSTEM_PROMPT.includes(value)) {
      // special case, unusable theoretical model option
      return Promise.reject(`${value} cannot do a system prompt`);
    }
    const m = await this.findByName(value);
    if (m) {
      this.modelName = m.id;
      return Promise.resolve();
    } else {
      return Promise.reject(`${this.name}: No known model ${value}`);
    }
  }

  async models(): Promise<Array<LlmModel>> {
    let modelsPage = await this.openai.models.list();
    return modelsPage.data.filter(m => !CANNOT_DO_SYSTEM_PROMPT.includes(m.id)) as Array<LlmModel>;
  }

  async chat(messages: Array<OpenAIMsg>): Promise<PartialLlmResult> {
    const response = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: messages
    });
    const text = response.choices[0]?.message?.content as (string | null);
    return this.currentModel().then(m => ({
      message: text,
      model: m,
      llm: this.name,
    } as PartialLlmResult));
  }

  getMetadata(): string | undefined {
    return this.modelName;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    // note configured model is not necessarily effective model because borked
    this.modelName = metadata;
    return Promise.resolve();
  }

  free(): boolean {
    return false;
  }

  private async findByName(modelName: string) {
    const models = await this.models();
    return models.find((model) => model.id === modelName);
  }

}

export {OpenAiLlm};