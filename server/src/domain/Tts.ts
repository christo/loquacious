/**
 * Represents the result of running text to speech on a message, producing an audio file.
 */
export class Tts {
  id: number;
  created: Date;
  creatorId: number;
  inputId: number;
  outputId: number;

  constructor(id: number, created: Date, creatorId: number, inputId: number, outputId: number) {
    this.id = id;
    this.created = created;
    this.creatorId = creatorId;
    this.inputId = inputId;
    this.outputId = outputId;
  }
}