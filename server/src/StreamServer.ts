import {DefaultEventsMap, Server} from "socket.io";
import {Express} from "express";
import {createServer} from "http";
import {WorkflowStep} from "./system/WorkflowStep";

class StreamServer {
  private io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

  constructor(app: Express, port: number, corsOrigin: string) {
    if (port <=1024 || port > 65535) {
      throw new Error(`Bad port number ${port}`);
    }
    console.log(`booting StreamServer on port ${port}`);
    const httpServer = createServer(app);
    // perhaps for production we should set options like ping, timeout etc.
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
    this.io.on("hello", (socket) => {
      console.log(`a user said hello on socket ${socket.id}`);
    });
    this.io.listen(port);
  }

  /**
   * Report reaching the given {@link WorkflowStep}
   * @param workflow
   */
  workflow(workflow: WorkflowStep) {
    this.io.emit("workflow", workflow);
  }

  error(mesg: string) {
    this.io.emit("loq_error", mesg);
  }

}

export {StreamServer};