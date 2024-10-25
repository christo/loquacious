import type {CharacterVoice} from "speech/CharacterVoice";
import {SpeechSystemOption} from "speech/SpeechSystems";
import type {ConfigurableCreator} from "../domain/ConfigurableCreator";
import type {CreatorType} from "../domain/CreatorType";

/** UI struct for a speech system with its name and all possible options */
class DisplaySpeechSystem {
  name: string;
  options: Array<CharacterVoice>;

  constructor(name: string, options: Array<CharacterVoice>) {
    this.name = name;
    this.options = options;
  }
}

interface SpeechResult {
  filePath: () => string | undefined;
}

/**
 * Represents a test to speech system.
 */
interface SpeechSystem extends CreatorType, ConfigurableCreator {
  name: string;

  /**
   * Generates spoken audio for message and returns relative filepath to audio from data base dir.
   * @param message
   */
  speak: (message: string) => Promise<SpeechResult>;
  /**
   * Unique key for each option.
   */
  options: () => Array<string>;
  /** Command for inserting a speech of this duration or null if no such command exists */
  pauseCommand: (msDuration: number) => string | null;
  currentOption: () => SpeechSystemOption;
  display: DisplaySpeechSystem;
}

export {type SpeechSystem, type SpeechResult, DisplaySpeechSystem};
