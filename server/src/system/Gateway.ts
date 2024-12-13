import type {CreatorService} from "./CreatorService";

// TODO make use of this for all such services: speech, lipsync...
export interface Gateway<T extends CreatorService> {
  current(): T;

  setCurrent(key: String): void;

  all(): T[]
}