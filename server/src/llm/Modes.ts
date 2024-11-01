import {readFileSync} from "fs";
import OpenAI from "openai";
import type {Message} from "../domain/Message";
import type {SpeechSystem} from "../speech/SpeechSystem";
import {type PromptPart, SimplePromptPart} from "./PromptPart";

const chatModeSystemPrompt: string = readFileSync("prompts/fortune-system-prompt.txt").toString();
const rokosBasiliskSystemPrompt: string = readFileSync("prompts/rokos-basilisk.prompt.txt").toString();
const inviteModeSystemPrompt: string = readFileSync("prompts/invite-mode.prompt.txt").toString();
const universalSystemPrompt: string = readFileSync("prompts/universal-system.prompt.txt").toString();

// TODO write session timer into system prompt

// LLM-specific message role
const ROLE_SYSTEM = 'system';
const ROLE_USER = 'user';
const ROLE_ASSISTANT = 'assistant';

type OpenAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Converts a {@link Message} to the expected OpenAI API type.
 * @param m the message.
 */
const messageToOpenAi = (m: Message) => ({
  role: m.isFromUser ? ROLE_USER : ROLE_ASSISTANT,
  content: m.content
}) as OpenAIMsg;

/**
 * Two-sided conversation, next step initiated by the given prompt, rendered for the given {@link SpeechSystem}.
 *
 * @param messageHistory the possibly two way conversation until now
 * @param ss the speech system being used
 */
const chatModeMessages = (messageHistory: Message[], ss: SpeechSystem): OpenAIMsg[] => {
  console.log("chat mode function");
  const systemParts = [
    dateTimePrompt(),
    chatModeSystemPrompt,
    rokosBasiliskSystemPrompt,
    universalSystemPrompt,
    pauseInstructions(ss).text()
  ];
  if (messageHistory.length === 0) {
    console.error("message history was empty");
    // TODO do this whenever the last message was from system.
    systemParts.push("There is an awkward gap in the conversation. You say something next.");
    return [
      {role: ROLE_SYSTEM, content: systemParts.join("\\n\\n")},
    ];
  } else {
    return [
      {role: ROLE_SYSTEM, content: systemParts.join("\\n\\n")},
      ...messageHistory.map(messageToOpenAi)
    ];
  }

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
 * @param chatHistory currently ignored.
 * @param ss speech system to render for.
 */
const inviteModeMessages = (chatHistory: Message[], ss: SpeechSystem): OpenAIMsg[] => {
  console.log("invite mode function");
  const systemPrompt = [
    dateTimePrompt(),
    inviteModeSystemPrompt,
    universalSystemPrompt,
    pauseInstructions(ss).text()
  ].join("\\n\\n");

  return [{role: ROLE_SYSTEM, content: systemPrompt}];
};

/** Function each mode implements differently which supplies parameters for a chat completion request. */
type ChatPrepper = (chatHistory: Message[], ss: SpeechSystem) => OpenAIMsg[];

/** Map mode names to their chat functions. */
interface ModeMap {
  [key: string]: ChatPrepper;
}

function dateTimePrompt() {
  return `The current date is ${new Date()}`;
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