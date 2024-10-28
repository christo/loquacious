import type {CreatorType} from "./CreatorType";

/**
 * Full persistent struct for an entity that can produce an interaction asset like text, image, video etc.
 * Metadata content is implementation-specific free format.
 */
export class Creator implements CreatorType {
  readonly id: number;
  readonly _name: string;
  readonly _metadata: string | undefined;
  readonly _free: boolean;

  constructor(id: number, name: string, free: boolean, metadata?: string) {
    this.id = id;
    this._name = name;
    this._metadata = metadata;
    this._free = free;
  }

  getMetadata() {
    return this._metadata
  };

  getName() {
    return this._name
  };

  free(): boolean {
    return this._free;
  }
}