import {Message} from "./Message";

/**
 * A message struct with optional additional ids for tts and animation if they exist.
 */
export class LinkedMessage extends Message {
  readonly ttsId: number | undefined;
  readonly lipSyncId: number | undefined;

  constructor(
      id: number,
      created: Date,
      content: string,
      creatorId: number,
      isFromUser: boolean,
      ttsId: number | undefined,
      lipSyncId: number | undefined) {
    super(id, created, content, creatorId, isFromUser);
    console.log("constructing LinkedMessage");
    this.ttsId = ttsId;
    this.lipSyncId = lipSyncId;
  }

}