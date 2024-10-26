class Message {
  id: number;
  created: Date;
  content: string;
  creatorName: string;

  constructor(id: number, created: Date, content: string, creatorName: string) {
    this.id = id;
    this.created = created;
    this.content = content;
    this.creatorName = creatorName;
  }
}

export {Message};