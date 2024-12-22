import {Message} from "./Message";

/**
 * A message with optional additional ids for tts and animation if they exist.
 */
export class LinkedMessage extends Message {
  private readonly _ttsId: number | undefined;
  private readonly _lipSyncId: number | undefined;


  constructor(
      id: number,
      created: Date,
      content: string,
      creatorId: number,
      isFromUser: boolean,
      ttsId: number | undefined,
      lipSyncId: number | undefined) {
    super(id, created, content, creatorId, isFromUser);
    this._ttsId = ttsId;
    this._lipSyncId = lipSyncId;
  }

  get ttsId(): number | undefined {
    return this._ttsId;
  }

  get lipSyncId(): number | undefined {
    return this._lipSyncId;
  }
}