import {readFileSync} from "fs";
import {OpenAI} from "openai";
import type {SpeechSystem} from "speech/SpeechSystem";

const chatModeSystemPrompt: string = readFileSync("prompts/fortune-system-prompt.txt").toString();
const inviteModeSystemPrompt: string = readFileSync("prompts/invite-mode.prompt.txt").toString();
const universalSystemPrompt: string = readFileSync("prompts/universal-system.prompt.txt").toString();

interface ModeType {
  [key: string]: (prompt: string, ss: SpeechSystem) => OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

function dateTimePrompt() {
  return `The current date and time is ${new Date()}`;
}

class Modes {
  constructor() {
  }

  pauseInstructions(ss: SpeechSystem) {
    const cmd = ss.pauseCommand(1000);
    if (cmd == null) {
      // no explicit pause command
      return "You frequently pause for dramatic effect. To do so, include elipsis and/or literally this: `\\n\\n`"
    } else {
      return `You frequently pause for dramatic effect. To do so you always use precise syntax specifying the length of
  pause. A one second (1000 millisecond) pause must be specified exactly like this: \`${cmd}\``;
    }
  }

  chatModeMessages(prompt: string, ss: SpeechSystem): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
      {
        role: 'system', content: `${dateTimePrompt()}
      
      ${chatModeSystemPrompt}
      
      ${universalSystemPrompt}
      
      ${this.pauseInstructions(ss)}`
      },
      {role: 'user', content: prompt}
    ];
  }

  inviteModeMessages(prompt: string, ss: SpeechSystem): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [{
      role: 'system',
      content: `${dateTimePrompt()}
      
      ${chatModeSystemPrompt}
      
      ${universalSystemPrompt}
      
      ${this.pauseInstructions(ss)}`
    }];
  }
}


export {type ModeType, Modes};