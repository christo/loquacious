import {readFileSync} from "fs";
import {OpenAI} from "openai";

const chatModeSystemPrompt: string = readFileSync("prompts/fortune-system-prompt.txt").toString();
const inviteModeSystemPrompt: string = readFileSync("prompts/invite-mode.prompt.txt").toString();

function chatModeMessages(prompt: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {role: 'system', content: `The current date and time is ${new Date()}`},
    {role: 'system', content: chatModeSystemPrompt},
    {
      role: 'system',
      content: "Never offer anything that would require you to move or perform any physical task yourself. Never offer tea, assume your visitor will bring something to drink if they want it."
    },
    {role: 'user', content: prompt}
  ];
}

function inviteModeMessages(prompt: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {role: 'system', content: `The current date and time is ${new Date()}`},
    {
      role: 'system',
      content: "Never offer anything that would require you to move or perform any physical task yourself. Never offer tea, assume your visitor will bring something to drink if they want it."
    },
    {role: 'system', content: inviteModeSystemPrompt}
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