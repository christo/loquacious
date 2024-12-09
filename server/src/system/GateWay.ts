import type {CreatorService} from "./CreatorService";

export interface GateWay<T extends CreatorService> {
  current(): T;

  setCurrent(key: String): void;

  all(): T[]
}