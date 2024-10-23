import {readFileSync} from "fs";
import OpenAI from "openai";
import {type PromptPart, SimplePromptPart} from "./llm/PromptPart";
import type {SpeechSystem} from "./speech/SpeechSystem";

const chatModeSystemPrompt: string = readFileSync("prompts/fortune-system-prompt.txt").toString();
const inviteModeSystemPrompt: string = readFileSync("prompts/invite-mode.prompt.txt").toString();
const universalSystemPrompt: string = readFileSync("prompts/universal-system.prompt.txt").toString();

/**
 * Two-sided conversation, next step initiated by the given prompt, renderd for the given
 * {@link SpeechSystem}.
 *
 * @param prompt
 * @param ss
 */
const chatModeMessages = (prompt: string, ss: SpeechSystem): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  console.log("chat mode function");
  if (!prompt) {
    console.error("prompt was falsy");
  }
  const systemParts = [
    dateTimePrompt(),
    chatModeSystemPrompt,
    universalSystemPrompt,
    pauseInstructions(ss).text()
  ].join("\\n\\n");
  return [
    {role: 'system', content: systemParts},
    {role: 'user', content: prompt}
  ];
};

/**
 * Gives system instructions for how to render a pause for the given speech system.
 * @param ss the {@link SpeechSystem}
 */
const pauseInstructions = (ss: SpeechSystem): PromptPart => {
  const cmd = ss.pauseCommand(1000);
  if (cmd == null) {
    // no explicit pause command syntax
    return new SimplePromptPart("You frequently pause for dramatic effect. To do so, include elipsis and/or two new lines: `\\n\\n`");
  } else {
    return new SimplePromptPart(`You frequently pause for dramatic effect. To do so you always use precise syntax specifying the length of
  pause. A one second (1000 millisecond) pause must be specified exactly like this: \`${cmd}\``);
  }
};

/**
 * Initiated by us to invite a conversation.
 *
 * @param _prompt ignored.
 * @param ss speech system to render for.
 */
const inviteModeMessages = (_prompt: string, ss: SpeechSystem): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  console.log("invite mode function");
  const systemPrompt = [
    dateTimePrompt(),
    inviteModeSystemPrompt,
    universalSystemPrompt,
    pauseInstructions(ss).text()
  ].join("\\n\\n");

  return [{role: 'system', content: systemPrompt}];
};

/** Function each mode implements differently which supplies parameters for a chat completion request. */
type ChatPrepper = (prompt: string, ss: SpeechSystem) => OpenAI.Chat.Completions.ChatCompletionMessageParam[];

/** Map mode names to their chat functions. */
interface ModeMap {
  [key: string]: ChatPrepper;
}

function dateTimePrompt() {
  return `The current date and time is ${new Date()}`;
}

/**
 * Container for all conversation modes.
 */
class Modes {
  private readonly modeMap: ModeMap;
  private currentMode: string = "chat";

  constructor() {
    this.modeMap = {} as ModeMap;
    this.modeMap["invite"] = inviteModeMessages;
    this.modeMap["chat"] = chatModeMessages;
  }

  getMode(): ChatPrepper {
    return this.modeMap[this.currentMode];
  }

  current(): string {
    return this.currentMode;
  }

  allModes(): string[] {
    return Object.keys(this.modeMap);
  }
}


export {type ModeMap, Modes, ChatPrepper};