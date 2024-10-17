import {readFileSync} from "fs";
import {OpenAI} from "openai";
import type {SpeechSystem} from "speech/SpeechSystem";

// TODO need a warmup mode for any pre-operational work

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

  /**
   * Gives system instructions for how to render a pause for the given speech system.
   * @param ss
   */
  pauseInstructions(ss: SpeechSystem) {
    const cmd = ss.pauseCommand(1000);
    if (cmd == null) {
      // no explicit pause command syntax
      return "You frequently pause for dramatic effect. To do so, include elipsis and/or two new lines: `\\n\\n`"
    } else {
      return `You frequently pause for dramatic effect. To do so you always use precise syntax specifying the length of
  pause. A one second (1000 millisecond) pause must be specified exactly like this: \`${cmd}\``;
    }
  }

  /**
   * Two-sided conversation, next step initiated by the given prompt, renderd for the given
   * {@link SpeechSystem}.
   *
   * @param prompt
   * @param ss
   */
  chatModeMessages(prompt: string, ss: SpeechSystem): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const systemParts = [
      dateTimePrompt(),
      chatModeSystemPrompt,
      universalSystemPrompt,
      this.pauseInstructions(ss)
    ].join("\\n\\n")
    return [
      {role: 'system', content: systemParts},
      {role: 'user', content: prompt}
    ];
  }

  /**
   * Initiated by us to invite a conversation.
   *
   * @param prompt ignored.
   * @param ss speech system to render for.
   */
  inviteModeMessages(prompt: string, ss: SpeechSystem): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {

    const systemPrompt = [
      dateTimePrompt(),
      inviteModeSystemPrompt,
      universalSystemPrompt,
      this.pauseInstructions(ss)
    ].join("\\n\\n");

    return [{role: 'system', content: systemPrompt}];
  }
}


export {type ModeType, Modes};