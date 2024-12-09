export interface GateWay<T> {
  current(): T;

  setCurrent(key: String): void;

  all(): T[]
}