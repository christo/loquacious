# Loquacious

AI face-to-face chat experiment.

At this stage, this is a feasibility investigation to see how a face-to-face
video chat can be assembled using various AI models. Components can be
swapped for alternatives which is especially useful for quality and performance
testing.

The prototype scenario is a fortune teller character, physically installed as an
interactive feature, decorated like a fortune teller's booth or tent. The key
hardware is focused on a computer with a webcam or potentially any device
capable of doing a video call.

The idea is that punters come and interact with the fortune teller in a natural
conversation workflow, typical of a fortune-teller. Depending on the details
this would include all such services: clairvoyant, astrologer, tarot reader etc.

The fortune teller character is entirely automatic, built with the following
components.

While there are several design choices that are tuned for something like the
fortune teller character, systems and configuration are expected to work the
same for a very different character scenario. At the moment animals or 
cartoon characters cannot produce lipsync video.

## Design Principles

It is hoped that this system can operate without a traditional human-operated 
media production toolchain or pipeline. So far all media assets are driven by
code and AI prompts. Adding video production, illustration or any other kind
of media editing may offer quality benefits or potential time or money savings.
Nevertheless, exclusively constraining all human development-time input to
text from a keyboard makes for an interesting exploration and at the moment
is adopted as a defining feature of this research project.

## Character Portrait

The first thing a user sees when interacting with the system contains a portrait
of a fortune teller. Various text-to-image generative systems have been used to
create make these characters at design time although in theory, this could be
created on demand. In a full realisation of such a system, the character may be
gently animated in a suitable waiting state like a meditative trance.

Various design alternatives include making the installation like a portal or
magic mirror through which the character could be summoned akin to a kind of
cosmic video conference call.

Good character portraits seem to have the following features:

* Proportion of the frame that is occupied by the head is between 10% and 30%
* Background of head is relatively uniform. Any detail here may be subject to
warping or tearing.
* No foreground objects or obstructions should be near the head or face.
Otherwise they will be warped.
* Body position ideally should look natural if held still indefinitely. Having
the character's hands on a crystal ball or be hidden somehow makes the expected
absence of hand gestures less conspicuous.
* Face lighting and colour should be most like the training data. Face paint,
extreme wrinkles, exaggerated features, excessive shadows or extreme postures
all seem to result in pathalogically bad lip sync results.
* Long hair is sometimes problematic because the head and face are animated
exclusively inside an inset rectangle which may tear at the edge rather than
produce natural movement in long hair that may extend beyond the animated
inset frame. Hair motion is not properly simulated so hairstyles rigidly fixed
to the head will work best.
* Image resolution has a dramatic effect on lipsync latency and final quality
but more experimentation is required to determine sweet spots.

## Speech to Text

(STT) Listens to audio and transcribes audible speech to text that is fed to the
LLM.

Interesting problems:

* Voice isolation
* Distinguishing ambient speech from conversational address.
* Interruption and speaking over.
* Collaborative handling of transcription errors.
* Accent tuning.
* Round-trip pronunciation metadata. The LLM can't hear the speech, only the
transcription. This may make some interactions terrible unless there is some
metadata that the STT and TTS can share around pronunciation. Worst case
scenarios are expected to be ridiculous.

## Large Language Model (LLM)

Takes text input from the user (or some other situational instructions) and
using a prepared system prompt, responds in-character with text that is fed to
the text-to-speech (TTS) system.

The LLM may be useful for augmenting an additional expert system described
below also for making judgements about situational workflow using several
inputs: transcript, vision to text, pose estimation to text, relevant
knowledge base embeddings, explicit guided review of conversation history,
possibly conversation from sessions with other users at the same event.

Some form of "memory" may also be usefully implemented.

## Text to Speech (TTS)

Voice synthesiser that converts text into a high quality spoken voice, cloned or
selected from a library to be suitable for the character. The best quality
voices found so far are available from (elevenlabs.ai)[https://elevenlabs.ai]
through their API. For convenient and cheap development-mode testing, MacOS
voice synthesiser is also available. The audio for the speech is fed to a Lip
Sync system.

## Lip Sync Speech to Video

Although there are various ways to accomplish an animated character who is
visibly speaking the generated speech, reasonable quality can be achieved using
a model to convert a portait image and the speech audio into a video of that
character speaking the words. A 3D model that is rigged for speech and gestures
could also be used but both design-time and runtime components would be divegent
from the current design. The generated video is sent to the screen to
present to the user as final output.

## Session Modes

The fortune teller would initially in a waiting state until a customer arrives.
Their arrival would trigger an introductory mode of interaction with a distinct
system prompt. The fortune teller would invite the customer to sit down and they
would introduce themselves. Once this is done, the primary chat interaction can
start. The session could be interrupted somehow and a return to the waiting
state is expected until a new customer arrives. These sessions should maintain a
history of the interactions, tracking the customer's name and chat history.
Detection of mode transitions and the establishment of a new session with a new
empty chat history can be done in part with pose estimation of video input.

## Pose Estimation for Scenario Awareness

In addition to the core workflow outlined above, models trained to interpret
video as estimated human poses can be used to detect an approaching customer for
the fortune teller or to detect untimely interruptions to a session. Hand-coded
heuristics could be used for detecting approach and sitting behaviour and each
would need some kind of calibration depending on the physical layout of the
booth with respect to the camera position.

## Image to Text

In order to facilitate more life-like interactions of two humans who can see
each other and may naturally interact about each other's appearance, a model
that can describe the contents of an image can be used to provide the fortune
teller a description of the person she is speaking to. During the introductory
mode the fortune teller might compliment the customer on thier outfit or some
other in-character smalltalk that references their appearance.

The fortune teller's own portrait can also be used as input to the image-to-text
system for any given portait image so that any reference made to their
appearance can be responded to naturally and in-character. The same system might
also be used to evaluate the dynamic generation of a fresh fortune-teller
portrait.

The physical deployment scenario can also be fed to the image-to-text system and
it's possible that the LLM is provided the resulting description to better
understand what the customer might be referring to in conversation or to, for
example, invite the customer to help themselves to tea or snacks.

## Non-verbal Animation

Video sequences may be generated to make the character more life-like when it
is not speaking. These can be categorised and used appropriately.

* Q: How to generate gesture animations for the character?
* Q: Could these videos be used as additional video input to lipsync?

## Expert System

A traditional expert system can be used to get very low-latency intepretation of
what to do under a moderate set of anticipated situations and to choose from a
variety of pregenerated "canned" introductory video outputs. These can be used
ot hide latency in the full interactive workflow along with various in-character
stalling behaviours that likewise do not depend on user input.

# System Design

Currently only operated in devmode on MacOS. It should work on any system but
`MacOsSpeech` will likely fail to execute the child process. Native subsystem
implementations should detect missing system requirements at boot and show
up disabled. 

Database is postgres. `node-pg-migrate` scripts defined in `server/package.json`
to create tables etc. Production deployment process is yet to be defined.

Current boot-time check of git hash will fail if git is absent. Production
deployment will have a configured version tag instead.
 

## Dependencies

Each service component listed above can have different back end implementations,
both local and as online API services.

* LM-Studio for the LM-Studio back end
* OpenAI account for the ChatGPT back end
* ElevenLabs account for the ElevenLabsVoice, and `brew install mpv`
* For SystemVoice on `macos`, system command `say` is used. Various voices
  are assumed to exist
* `git` assumed on `$PATH` for devmode version definition. Database tracks each
  boot and run independently
* SadTalker has been tested for speech audio and image to lip sync video and its
  dependencies are a bit wild and hairy. Installing it on a capable MacBook Pro
  required `Anaconda`, `ffmpeg` and various python packages. Instructions in the
  SadTalker repo are terse and insufficient as a small custom patch to one of
  the Python package's source code was required after some googling.

## Features

* shows image of character
* can choose a different character image from set found on disk
* text input
* text output
* speech output
* settings panel
* lip sync video output usually works but only for human faces

## TODO

* [ ] settings panel
    * [x] show current main llm/model
    * [x] show current speech system and voice option
    * [x] show other main llm/model options
    * [x] show other speech/voice options
    * [ ] make settings dynamically editable
* [x] identify which LLM and model was used for the text
* [x] store all interactions in database
* [ ] design for possible workflow that produces spoken audio in lipsync video
      directly from text message without intermediate speech audio
* [x] data file tree for generated media assets:
    * `<base>/<type>/<system>/<option>/<tag>_<db-id>.<format>`
    * type: tts, ttt, stv (speech to video), etc.
    * e.g. `data/tts/elevenlabs/beatrice/xyz_12345.mp3`
    * db-id: the record that traces the input, system and parameters to other
      records such as session, timestamps, user prompt, modestate etc.
* [ ] check out [d-id.com](http://d-id.com) API for lipsync video generation
  [streaming API](https://docs.d-id.com/reference/talks-streams-overview)
  could also be proxied and saved to disk. It also claims to support direct
  elevenlabs integration so could do speech and lipsync video in one API call.
* [ ] check [Synthesia](https://www.synthesia.io/features/avatars) for lip sync
* [ ] check [Hey Gen](https://www.heygen.com/interactive-avatar) for lip sync
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
* [x] spike fal sadtalker to generate video from picture and speech file
  https://fal.ai/models/fal-ai/sadtalker/api
* [x] Q: does it make sense to inform llm in system prompt that output is
  spoken with a specific system and all formatting should be appropriate
  for input into that speech system? i.e. no emojis, stage direction etc.
* [x] get local sadtalker running with conda per github
* [x] basic database schema
* [ ] check out multimodal models like LLaVA 1.5 and LLaVA 1.6
    * may work to do both text and vision with the same model?
* usable cached generated output
* [ ] pose estimation plan
* [ ] ping-pong chat sequence
* [x] check how it works on mobile web - sketchy embedded video
* [x] enumerate LLM backends
* [ ] show chat history (including cached audio)
* [ ] evaluate local AI TTS (better than macos?)
* [ ] evaluate local speech recognition: e.g. whisper
* [ ] evaluate elevenlabs websocket "realtime" streaming:
  https://elevenlabs.io/docs/api-reference/websockets
* [ ] generalise backend config options:
    * type: e.g. text-to-text
    * role: e.g. deciding what to say. future features like interpreting
      image-to-text output to build a system prompt which includes self-image
      might be best done by running a smaller/faster model that isn't good
      enough
      to define fortune-teller responses
    * workflow graph: network of each model in a role as nodes with edges
      indicating flow of input and output to another model or audio/video output
* [ ] identify terminal input and output nodes for whole system workflow graph:
    * audio out
    * video out (should have embedded video)
    * stitched together multiple video outs depending on behaviour graph,
      probably streaming to web client is the best idea
        * how to handle interruptive transitions?
    * reference self image(s)
    * (optional) reference motion video to drive animated video out
    * user audio in, direct user text in
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
      words)
* asking name flow
    * flexible level of persistance about wanting to know a person's name
    * calling by name if available
    * calling by pet names "sweetheart", "darling" etc. - add to system prompt
* fault detection
* individual person recognition (using only recent interactions)
* functions to know what is happening, what has happened before, state of
  system, configuration etc.
* attract mode
    * before fortune-teller sees an approaching person
    * detect when a person tentatively appraoches but does not trigger start
    * detect when multiple people stand gingerly nearby
    * consider second camera trained on entrance
* using pose-estimation, detect when a person approaches, describe what they
  look like etc.
    * detect if they are in an engaged mode or just looking
    * invite them to sit down and chat
    * enter introductory mode
    * on-demand camera contents description
        * how many fingers am I holding up?
        * this is my friend jane
        * does my ass look big in this
    * periodic pose estimation to detect mode state transitions
    * pose estimation calibration
        * if camera moves or scene changes, need to mark engagement zone in
          camera
          field
        * lighting
        * pose estimation and video frame grab integration
    * possible whole-scene photo input
        * it may help the LLM if it can see not only what it looks like but what
          the
          actual current deployment scene looks like?
* Per-deployment configuration needs to know:
    * event details, maybe including whole schedule of events
    * VIPs
    * permanent physical layout and scene design details (red tablecloth,
      crystal
      ball, vase of flowers etc.)
    * if a person asks about an event coming up, we could quip about telling
      their
      future: that they will go to that event
* file save disk cache
    * model-specific text in, text out
* db logging
* [ ] aggregated system logs
* [ ] usage stats
* [ ] performance log
    * [ ] recent performance, best, worst, 80th percentile
* [ ] attempt to read body language and facial expressions
    * stands as if to leave
    * expresses emotion
        * evaluate if it may have been in response to something that was said
* [ ] authenticated web user with http session
* [ ] multiple concurrent sessions

### Test Suite

Currently zero tests!

* Component tests
* Full session log (replayable interactions)
* integration tests
* metrics and comparisons to alternate components (i.e. evaluating text form of
  responses to a suite of questions for each LLM)
* abuse cases
* LLM evaluation of response to test inputs looking for specific features or to
  ensure certain absences (manually review these assessments)

### Modes

* Attract Mode - Nobody is engaged, but someone might see us before we see them
* Invite Mode - Somebody is detected but they have not engaged. They can
  probably see and hear but no fortune-telling session has started. They should
  be encouraged and invited to engage.
* Introduction Mode - A person has initiated a session but we don't know their
  name and we haven't established the pretext for the interaction
* Chat Mode - we are now engaged in a conversation
* Chat Completion - we have finished a chat
* Pause Mode - something necessitates a short pause shortly. Not considered an
  unresponsive interlocutor. Polite waiting behaviour is expected.
* Interruption Mode - user wants to interject for correction or to skip. Handle
  interaction by giving control to user to set corrective context.
* Recover Mode - one of the above modes was interrupted or did not end cleanly,
  behaviour might include some talking to self, musing or other.
* Identify Return mode - detect that a person is one we have talked to before.
  If the person was detected very recently, recover workflow to pick up any
  unfinished interaction. Or if the person completed a chat, ask about having
  another chat.
* Resume mode - after an interruption, pick up the thread.
* Tangent mode - might get off on a tangent and come back to previous "stack
  frame"
* Admin Mode - various system changes can be made
* Break Character Mode - where it can discuss itself, how it works, who made it
  see also "creator clone" scene idea.
* Reset - manual user-directed request to reset to some other mode (i.e. to
  show others - it should be smooth to chat as if it were fresh without past
  interactions informing current one (though next time they could be
  aggregated))

### Scene Ideas

* fortune teller
    * crystal ball, scrying bowl, casting bones, tarot cards
    * circus variant
* character from ancient mythology
* philosopher child
* buddha kitten (animating animal faces doesn't work on sadtalker)
* creator clone - self description and explanation of how it works
    * expert on self and how it works
    * can converse in this mode as a general assistant but with identity stuff
      in system prompt
    * clone my voice
    * use my image to drive animation

### Deployment Targets

* dev mode laptop-only
    * use laptop camera, mic, speakers etc.
* [ ] macos comparison test: chrome, chromium, safari, firefox
    * camera audio/video capture codec support
    * consider non-web components for production installation (tradeoffs?)
* [ ] what about full mobile web app with mic & camera?
    * [x] basic feasibility - works ok but testing is horrible
    * [ ] how to get dev console or logs etc. from ios chrome
    * [ ] might ios safari work better than ios chrome?
    * [ ] test android chrome
* specific mic and speaker alternative
* docker containers with underlying GPU resource detection
* remote API configuration
    * local replacements on case-by-case
    * multi-machine Deployment
    * fully hosted online variant
* external effect control additions - physical lighting in theatrical scene for
  extra drama (e.g. flickering lamps)
* full production deployment design:
    * needs to be described in system prompt
    * could it be a zoltar like booth, hamming up the artificiality of the
      fortune teller?
    * vertical TV?
    * could it be a traditional fortune-teller table setting?
* maybe make it like it's a video call to a real person?

### Character Definition Workflow

The following data structure needs to be seeded, expanded, augmented and merged
in various ways.

* reference portrait
* reference pose video graph
    * interconnected animations are edges, fixed poses are nodes
    * a graph may give nonlinear, realistic animations that are sufficiently
      polished
* voice model
* vocal fx chain
    * pre-lip sync (e.g. speaking speed)
    * post-lip sync (e.g. reverb, re-pitch)

For pose variations for example, the tweening between each pose may need to be
precomputed so that a generated pose reference video can be fed to a lip-sync
model such as sadtalker. Various generated animation tweens may not be good.
These can be ai-generated at a kind of character-compile time. From a graph of
generated tweening animations, composite animations can be achieved by simple
video playback. These do not need to be skinned and may be skeletal animations,
recorded video, synthesized animations or acquired by third-party library. In
each case they can be used as input for pose animation during lip sync.

### User Vision

A camera on the user can be used to feed visual description to an orchestration
model. Their appearance can be used as a talking point delivered as an aside,
prepared ahead of time to cover latency gaps.

Various uses for pose-estimation include: User arrival, departure, changes in
the number of people present, attention changes, observing compliance or
non-compliance with any requested interactions.

Recording of user behaviour for later quality control review, automated testing
and possible future training.

### Self Image

Use image-to-text to describe the character's self-image and construct a story
and some comments about it.

### Sentiment Analysis

* From pose-estimation
* From face interpretation
* From paraverbal vocalisation

### Exception Flows

* Corrections / misunderstandings
* Failure to hear
* Interruptions and continuations
* Being spoken about vs being spoken to
* System failure requiring operator intervention

### Memory and Local Knowledge

* What is the physical deployment scenario
    * festival
    * party/event
* Reference material for important people known to all at event
    * Host / hostess
    * Schedule of events
* Memory of people seen in previous sessions
* Self-knowledge narrative
* Meta-understanding
    * does not break character or betray that it is an AI
    * is not willing to break character by sharing unlikely expert knowledge
    * if, say, asked about quantum physics, summarily describes vague references
      remaining in character

### Text to Speech

* elevenlabs
* voice clone
* what is the best tts that can run locally?

### Latency hiding

* slow speech cadence
* canned smalltalk
* pregenerated output for response graph driven by expert system and elaborated
  by LLM for variety. 
  * LLM can detect equivalence of phrases and help choose a
    pregenerated response.
* chunked TTS producing chunked lipsync video
  * cut LLM output text into paragraphs or sentences
  * generate individual voice for each fragment
  * elevenlabs API supports providing preceding and proceeding context
  * feed multiple speech audio chunks to lipsync in parallel
  * modify front-end to work with a dynamic queue of video streams played
    sequentially
* environmental theatrics - externally controlled sound effects, crystal ball,
  etc.
* crafted stalling and in-character ceremony - e.g. reading tarot cards or "gaze
  into my eyes while I consider your question" consult the spirits of the
  ancestors" streaming - every stage should stream
* chunk feeding of part of input may enable preemptive response parts, e.g.
  Prepare a restatement of initial part of input while rendering full response.
  May need to break response into consideration/reflection/contemplation segment
  which is calculated not to depend on the real response and the stripped-back
  core response which does.

### Speech to Text

* options?
* test native OS speech recognition
* low latency
* sentiment, emotion detection etc.
