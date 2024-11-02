import type {PathLike} from "node:fs";
import {ElevenLabsSpeech} from "speech/ElevenLabsSpeech";
import {MacOsSpeech} from "speech/MacOsSpeech";
import {NoSpeech} from "speech/NoSpeech";
import {type SpeechSystem} from "speech/SpeechSystem";

/**
 * Represents a choosable option within a specific speech system. Options are represented by unique strings that
 * are SpeechSystem specific identifiers, typically for a specific voice. Future expansion here may include
 * audio post-processing, speaking rate etc.
 */
class SpeechSystemOption {
  systemName: string;
  optionKey: string;
  optionName: string;
  description?: string
  isFree: boolean;

  constructor(system: SpeechSystem, key: string, name: string, description?: string) {
    this.systemName = system.getName();
    this.optionKey = key;
    this.optionName = name;
    this.description = description;
    this.isFree = system.free();
  }

  /** Returns a compact string representation of a {@link SpeechSystem} and its current option. */
  descriptor() {
    const desc = this.description ? ` (${this.description})` : "";
    return `${this.systemName}/${this.optionName}${desc}`;
  }

  /** Display object represending a speech system and its configured option */
  safeObject() {
    return {
      system: this.systemName,
      optionKey: this.optionKey,
      optionName: this.optionName,
      description: this.descriptor(),
      isFree: this.isFree
    };
  }
}

/**
 * Aggregates every {@link SpeechSystem}.
 */
class SpeechSystems {

  readonly systems: Array<SpeechSystem>;
  private currentSystemIndex = 0;
  private readonly baseDir: PathLike;


  constructor(baseDir: PathLike) {
    this.baseDir = baseDir;
    this.systems = [
      new ElevenLabsSpeech(this.baseDir),
      new MacOsSpeech(this.baseDir),
      new NoSpeech(),
    ].filter(s => s.canRun())
  }

  current() {
    return this.systems[this.currentSystemIndex];
  }

  // noinspection JSUnusedGlobalSymbols
  byName(name: string): SpeechSystem {
    const maybeFound: SpeechSystem | undefined = this.systems.find(s => s.getName() === name);
    if (maybeFound) {
      return maybeFound;
    } else {
      throw Error(`No speech system with name "${name}" found.`);
    }
  }
}

export {SpeechSystemOption, SpeechSystems}