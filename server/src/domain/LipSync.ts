class LipSync {
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

export {LipSync};