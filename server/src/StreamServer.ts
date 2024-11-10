import {Server} from "socket.io";
import {Express} from "express";
import {createServer} from "http";


class StreamServer {
  private app: Express;
  private port: number;

  constructor(app: Express, port: number) {
    if (port <=1024 || port > 65535) {
      throw new Error(`Bad port number ${port}`);
    }
    this.app = app;
    this.port = port;
  }

  boot() {
    console.log(`booting StreamServer on port ${this.port}`);
    const httpServer = createServer(this.app);
    // TODO set options like ping, timeout etc.
    const options = {
      cors: {
        origin: "http://localhost:5173"   // TODO remove hardcoding
      }
    };
    const io = new Server(httpServer, options);

    io.on("connection", (socket) => {
      console.log(`a user connected on socket id ${socket.id}`);
      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    });

    io.listen(this.port);
  }

}

export {StreamServer};