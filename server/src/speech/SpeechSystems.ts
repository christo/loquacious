import type {PathLike} from "node:fs";
import {ElevenLabsSpeech} from "speech/ElevenLabsSpeech";
import {MacOsSpeech} from "speech/MacOsSpeech";
import {NoSpeech} from "speech/NoSpeech";
import {type SpeechSystem} from "speech/SpeechSystem";
import path from "path";

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

  /**
   * Display object represending a speech system and its configured option
   */
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

  constructor(baseDir: string) {
    this.baseDir = path.join(baseDir, "tts");
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
      throw Error(`No currently runnable speech system with name "${name}" found.`);
    }
  }

  async setCurrent(value: string) {
    for (let i = 0; i < this.systems.length; i++) {
      if (this.systems[i].getName() === value) {
        console.log(`Setting speech system to ${value}`);
        this.currentSystemIndex = i;
        return;
      }
    }
  }
}

export {SpeechSystemOption, SpeechSystems}