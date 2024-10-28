
class Message {
  id: number;
  created: Date;
  content: string;
  creatorId: number;
  isFromUser: boolean;

  constructor(id: number, created: Date, content: string, creatorId: number, isFromUser: boolean) {
    this.id = id;
    this.created = created;
    this.content = content;
    this.creatorId = creatorId;
    this.isFromUser = isFromUser;
  }
}

export {Message};