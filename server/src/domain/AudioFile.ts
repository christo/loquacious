export class AudioFile {
  id: number;
  created: Date;
  durationMs: number;
  mimeType: string;
  creatorId: number;

  constructor(id: number, created: Date, durationMs: number, mimeType: string, creatorId: number) {
    this.id = id;
    this.created = created;
    this.durationMs = durationMs;
    this.mimeType = mimeType;
    this.creatorId = creatorId;
  }
}

