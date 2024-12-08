import type {CharacterVoice} from "speech/CharacterVoice";
import {SpeechSystemOption} from "speech/SpeechSystems";
import type {Message} from "../domain/Message";
import {Tts} from "../domain/Tts";
import type {MediaFormat} from "../media";
import type {CreatorService} from "../system/CreatorService";
import {EventChannel, EventEmitter, LoqEvent} from "../system/EventEmitter";
import {LoqModule} from "../system/LoqModule";
import Db from "../db/Db";
import {WorkflowEvents} from "../system/WorkflowEvents";

/** UI struct for a speech system with its name and all possible options */
class DisplaySpeechSystem {
  name: string;
  options: Array<CharacterVoice>;
  isFree: boolean;

  constructor(name: string, options: Array<CharacterVoice>, isFree: boolean) {
    this.name = name;
    if (options.length === 0) {
      throw Error("no options specified");
    }
    this.options = options;
    this.isFree = isFree;
  }
}

class SpeechSystemLoqModule implements LoqModule<SpeechInput, SpeechResult> {
  private readonly speechSystem: SpeechSystem;
  private _db: Db;
  private _workflowEvents: WorkflowEvents;

  constructor(ss: SpeechSystem, db: Db, workflowEvents: WorkflowEvents) {
    this.speechSystem = ss;
    this._db = db;
    this._workflowEvents = workflowEvents;
  }

  async call(input: Promise<SpeechInput>): Promise<SpeechResult> {
    try {
      const speechInput = await input;
      return this.speechSystem.speak(speechInput.getText(), speechInput.getBaseFileName()).then(x => {
        return x;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

/**
 * Type representing the result of a request to generate speech from text.
 */
interface SpeechResult {
  filePath(): Promise<string | undefined>;

  tts(): Promise<Tts | undefined>;
}

class AsyncSpeechResult implements SpeechResult {
  tts: () => Promise<Tts | undefined>;
  filePath: () => Promise<string | undefined>;

  constructor(fp: () => Promise<string | undefined>, tts: () => Promise<Tts | undefined>) {
    this.tts = tts;
    console.log(`typeof fp: ${typeof fp}`);
    this.filePath = fp;
  }

  static fromPromises(fp: Promise<string | undefined>, tts: Promise<Tts | undefined>) {
    return new AsyncSpeechResult(() => fp, () => tts);
  }

  static fromValues(fp: string | undefined, tts: Tts | undefined) {
    return AsyncSpeechResult.fromPromises(Promise.resolve(fp), Promise.resolve(tts));
  }
}

type SpeechInput = {
  getText(): string;
  getBaseFileName(): string;
}

/**
 * Represents a text to speech system.
 */
interface SpeechSystem extends CreatorService {

  /**
   * Generates spoken audio for message and returns relative filepath to audio from data base dir.
   * @param message
   * @param basename file base name
   */
  speak(message: string, basename: string): Promise<SpeechResult>;

  /**
   * Unique key for each option.
   */
  options(): Array<SpeechSystemOption>;

  setCurrentOption(value: string): Promise<void>;

  /**
   * Command for inserting a speech of this duration or null if no such command exists
   */
  pauseCommand(msDuration: number): string | null;

  /**
   * Current voice for the speech system.
   */
  currentOption(): SpeechSystemOption;

  display: DisplaySpeechSystem;

  /**
   * If the message is not generated by a user, return a new Message identical except with
   * the content stripped of any pause command for the SpeechSystem. If the message is
   * from the user, return the message unchanged.
   * @param m the message
   */
  removePauseCommands(m: Message): Message;

  /**
   * Provide the {@link MediaFormat} of the created audio.
   */
  speechOutputFormat(): MediaFormat;
}

export {
  type SpeechSystem,
  type SpeechResult,
  DisplaySpeechSystem,
  AsyncSpeechResult,
  type SpeechInput,
  SpeechSystemLoqModule
};
