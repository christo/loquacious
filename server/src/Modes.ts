import {readFileSync} from "fs";
import {OpenAI} from "openai";

const chatModeSystemPrompt: string = readFileSync("prompts/fortune-system-prompt.txt").toString();
const inviteModeSystemPrompt: string = readFileSync("prompts/invite-mode.prompt.txt").toString();

function chatModeMessages(prompt: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {role: 'system', content: chatModeSystemPrompt},
    {role: 'user', content: prompt}
  ];
}

function inviteModeMessages(prompt: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {role: 'system', content: inviteModeSystemPrompt},
  ];
}
interface ModeType {
  [key: string]: (prompt: string) => OpenAI.Chat.Completions.ChatCompletionMessageParam[] ;
}

const MODES: ModeType = {
  "invite": inviteModeMessages,
  "chat": chatModeMessages
};

export {type ModeType, MODES};