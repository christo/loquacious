## TODO

* [ ] extract core logic out of `server.ts`
  * [ ] put in Loquacious and its delegates
  * [x] establish where the database reference goes. 
    * It should be held by Loquacioius and fed downward
  * [x] match outputs from one module to inputs of next module
  * [ ] resolve taxonomy and ontology confusion between Module and LoqModule 
  * [ ] review wip LoqModule - should combine service with db access to do whole domain operation.
  * [ ] ? move `LoqModule` construction to same place as `CreatorService` construction. The
    `LoqModule` needs a reference to it as well as a `Db`.
  * [ ] move module acquisition to `Loquacious`? The modules need a db reference so maybe
    `Loquacious` can pass it? Once interface is shpaed, add tests so that db and filesystem do
    not create boring untestability problems.
  * [ ] move all db updates into the module's call but keep the pure non-db parts in the existing
    CreatorService implementations.
  * services that do multiple module roles should be made to work as if they are
    separate because input and output are both a `Promise`. DiD tts and lipsync
    are done in one remote call so the tts part merely collects input and does no
    actual evaluation until the lipsync call. The trick is that the SpeechResult from
    the DiD implementation may not work if given to another lipsync animator and this
    configuration should ideally be prohibited in the front end.
* [ ] test DiD service
* [ ] maybe bug: review workflow sigils timing - refactoring and promisification with `EventEmitter`
  seems to have made these transitions happen at the wrong time?
* [ ] plan 1.0 release scope
* [ ] shoot project status screencast
* [ ] test lipsync and speech with failed/disabled video - should play audio keeping image portrait
* [ ] vision system
  * [ ] spike seamless audio/video streaming to server, simultaneous to client-side pose est.
  * pose estimation on client - assumes stable camera (can we detect camera motion?)
  * [x] use MediaStream / MediaPipe so pose estimation can use camera stream to first detect user
    approach
  * [ ] person object identity persistence (distinguish same vs new person present)
    * see comment in `VideoCamera.tsx`
  * [ ] detect when a person approaches, describe what they look like etc.
    * distinguish presence vs approach over time
  * [ ] object persistence tracking with inter-frame object detection matching
  * [ ] periodic pose estimation to detect mode state transitions
  * ? detect if they are in an engaged mode or just looking
  * invite them to sit down and chat
  * enter introductions mode
  * on-demand camera contents description
    * this is my friend jane (if multi-punter, how to know who is speaking!?)
    * does my ass look big in this
  * pose estimation "auto calibration"
    * if camera moves or scene changes, need to mark engagement zone in
      camera field
    * lighting
    * pose estimation and video frame grab integration
      [ ] punter identity persistence
  * is this person the same person as checkpoint x?
  * use as input to interruption mode trigger
  * incorporate possible multi-person session, tag-team people who have witnessed interaction
    with ai already - note this means session can have multiple punter identities (think through)
* [ ] have I met this person before in a previous session?
* [ ] name and bio reference retrieval for people (stretch) - first hand data / ext data
* [ ] implement settings presets - depends on server-configured character portraits
  * [ ] portrait image
  * [ ] character voice (implies TTS system-specific)
  * [ ] fill out feature idea for runtime system prompt design
* [ ] spike speech to text using whisper.cpp
  * [ ] streaming command line transcription listening to microphone
  * [x] understand how server works - not streaming
  * [x] can server be used from loquacious app? - No.
  * [ ] check [smart-whisper](https://www.npmjs.com/package/smart-whisper)
  * [ ] run from dev server using local audio capture
  * [ ] plan stream from browser microphone
  * [ ] decide how to do it with video being processed by pose estimation
  * [ ] can run in browser reliably?
  * [x] test large model `models/ggml-large-v3.bin` is very good
  * [ ] test medium model
  * [ ] test small model
  * [ ] is it feasible to stream video to server to capture speech and pose
    estimation? What can/should be done on the client?
* [ ] system ui
  * [ ] manual pose calibration
  * [ ] autocalibration of pose estimation using vision system
  * [ ] character design ui
  * [ ] choose portrait, upload portrait, choose voice (specify speech system), name etc.
  * [ ] possibly capture gesture animation using pose estimation?
  * [ ] move portrait images into server
  * [ ] serve portrait image from server as static
* [ ] read about postgres types
  * parser https://node-postgres.com/features/queries#types
  * https://github.com/brianc/node-pg-types
  * https://node-postgres.com/features/types#strings-by-default
  * https://node-postgres.com/features/types
* [ ] design for possible workflow that produces spoken audio in lipsync video
  directly from text message without intermediate speech audio
* [ ] check out [d-id.com](http://d-id.com) API for lipsync video generation
  [streaming API](https://docs.d-id.com/reference/talks-streams-overview)
  could also be proxied and saved to disk. It also claims to support direct
  elevenlabs integration so could do speech and lipsync video in one API call.
* [ ] check [Synthesia](https://www.synthesia.io/features/avatars) for lip sync
* [ ] check [Hey Gen](https://www.heygen.com/interactive-avatar) for lip sync
* [ ] some kind of background process to put audio and video durations in db
* design character persona and interaction workflow such that potentially long
  latency responses are normalised within the theatric context.
  * expert-system graph of cached and precalculated fast responses or stalling
    performances
  * small LLM for fast detection of sentiment or context that can be
    appropriately stalled.
  * important goddess persona might imply momentus long latency interactions
    because she doesn't deal with trivialities of an everyday nature
  * absent-minded old character may provide cover for more explicit stalling
  * guided interactions that request long inputs that are expected to deserve
    long-pondering behaviour before any strict indication of comprehension or
    an answering response is expected.
    * e.g. if a fortune teller asks you to dig deep into your heart to ask a
      question of significance, it is OK to theatrically consult the crystal
      ball before finally providing a response
    * the character should indulge in slow, high-ceremony behaviour such
      that high latency responses are less likely to break
      suspension-of-disbelief
    * if the user is directed to speak slowly or can be asked to engage in
      ceremony too, then the expected cadence can better fit the high
      latency limitations of the system.
    * shepherding the user away from fast banter towards deeply contemplated
      questions deserving of a divinely inspired being will hopefully
      provide cover for the otherwise conspicuous absence of fast-paced
      banter
* [ ] test reference data filetree (better for version control not to require
  database so it can be version controlled)
* [ ] check out multimodal models like LLaVA 1.5 and LLaVA 1.6
  * may work to do both text and vision with the same model?
* usable cached generated output
* [ ] evaluate local AI TTS (better than macos?)
* [ ] evaluate elevenlabs websocket "realtime" streaming:
  https://elevenlabs.io/docs/api-reference/websockets
* use cached openings for quick-start.
  * many starting inputs could be simply "hello" or other variants
  * after speech-to-text recognises this as a hello input;
  * the greeting is normalised ("hello there" is the same as "well hello"
    etc.)
  * possibly split off from subsequent speech, such as "hello ... what is your
    name?", each could be separately cached, maybe recognition and
    normalisation
    could be done with a LLM?
  * response text can be randomly selected from cached set
  * response text tts should be cached (need many versions of small responses
    like "yes!" "yes of course!" etc.)
  * need a mechanism to decide if a short response is warranted
  * need some stalling responses to hide latency (distractions, pondering and
    thinking signals, explicit "excuse me a moment while I contemplate your
    words")
* [x] asking name flow
  * [x] flexible level of persistance about wanting to know a person's name
  * [x] calling by name if available
  * [ ] calling by pet names "sweetheart", "darling" etc. - add to system
    prompt
  * avoid assumption that we are talking to a single person
* fault detection
* individual person recognition (using only recent interactions)
* functions to know what is happening, what has happened before, state of
  system, configuration etc.
* attract mode
  * before fortune-teller sees an approaching person
  * detect when a person tentatively appraoches but does not trigger start
  * detect when multiple people stand gingerly nearby
  * consider second camera trained on whole scene or entrance
* Per-deployment configuration needs to know:
  * event details, maybe including whole schedule of events
  * VIPs / who's who
  * physical layout and scene design details (red tablecloth,
    crystal ball, vase of flowers etc.) Some of this can be dynamically derived using vision.
  * if a person asks about an event coming up, we could quip about telling
    their future: that they will go to that event
  * This config needs to be in database, system prompt or embedding must be driven by database
    rather than hard-coded.
* db logging
* [ ] aggregated system logs
* [ ] usage stats
* [ ] performance log
  * [ ] recent performance, best, worst, 80th percentile
* [ ] attempt to read body language and facial expressions
  * stands as if to leave
  * speaking to multiple visible people who take turns in the hot seat?
  * expresses emotion
    * evaluate if it may have been in response to something that was said
* [ ] authenticated web user with http session
* [ ] multiple concurrent sessions

## Future Ideas

The following are not proper TODOs.

* possible whole-scene photo input from secondary camera (option)
  * it may help the LLM if it can see not only what it looks like but what
    the actual current deployment scene looks like
