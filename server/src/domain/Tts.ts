/**
 * Represents the result of running text to speech on a message, producing an audio file.
 */
export class Tts {
  private id: number;
  private created: Date;
  private creatorId: number;
  private inputId: number;
  private outputId: number;

  constructor(id: number, created: Date, creatorId: number, inputId: number, outputId: number) {
    this.creatorId = creatorId;
    this.inputId = inputId;
    this.outputId = outputId;
    this.id = id;
    this.created = created;
  }
}