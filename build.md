# Build and Run

First time:

* In `server/` run `bun i`
* In `/` run `bun i`

To run in dev mode:

* in `server/` run `bun run dev`
* in `/` run `bun run dev`

Then point browser at [http://localhost:5173/](http://localhost:5173/)

## Microphone and Camera Privacy Notice

If you do not accept camera and mic permission when prompted by your browser,
some stuff will not work.

The design intention is that you should be able to maintain complete privacy
control of the camera and microphone captured media, however, if you put your
API key in for a service and configure it to be used this way, obviously your
camera image and microphone audio will be sent to that service provider.

Configuration is modular so you should in theory be able to run everything
yourself on your own hardware. Performance characteristics will vary
accordingly.
