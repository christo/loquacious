import {Server} from "socket.io";
import {Express} from "express";
import {createServer} from "http";
import {WorkflowStep} from "./system/WorkflowStep";


class StreamServer {
  private app: Express;
  private port: number;

  constructor(app: Express, port: number) {
    if (port <=1024 || port > 65535) {
      throw new Error(`Bad port number ${port}`);
    }
    this.app = app;
    this.port = port;
    console.log(`booting StreamServer on port ${this.port}`);
    const httpServer = createServer(this.app);
    // TODO set options like ping, timeout etc.
    const options = {
      cors: {
        origin: corsOrigin
      }
    };
    this.io = new Server(httpServer, options);

    this.io.on("connection", (socket) => {
      console.log(`a user connected on socket id ${socket.id}`);
      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    });

    this.io.listen(this.port);
  }

}

export {StreamServer};