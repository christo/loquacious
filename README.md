# Loquacious

AI face-to-face fortune teller chat experiment.

![Fortune Teller Portrait](public/img/syprium_una_bruja_haciendo_un_conjuro._A_old_fat_woman._Realist_9ad8fdcc-55ac-4852-93e7-d6e3677f3b94.png)

## Project Status

* Supports multiple characters defined solely by portrait image and voice selection.
* Minimal web application front-end, REST back end
* LLM integration for reasonable fortune teller interaction text,
  implementations:
  * OpenAI / ChatGPT
  * [llama.cpp](https://github.com/ggerganov/llama.cpp) (open source)
  * [lm-studio](https://lmstudio.ai/) (lovely open source UI wrapper for
    llama.cpp)
* Text To Speech (TTS) integration with [ElevenLabs](https://elevenlabs.ai/) and
  MacOS native speech synthesis.
* Lip sync animated video generation from single portrait image and speech audio
  with [sadtalker](https://github.com/OpenTalker/sadtalker) (open source)
  __CURRENTLY WAY TOO SLOW__ running either on 1x H100 at
  [fal.ai](https://fal.ai/) or MacOS running 64Gb M1 Max Apple Silicon.
* Client-side face and pose estimation to:
  * Detect user approach to camera
  * (WIP) analyse self-portrait for lipsync suitability i.e. dimensions, framing
* Postgres database for storing and tracing all interactions and intermediate
  media assets.
* Video capture is __in progress__
  * client-side object detection and pose estimation is used to detect
    approaching users
  * Fortune teller self-portrait is mapped for facial landmarks to enable
    scaling and reframing portraits to be better suited for lipync video
    generation. These portraits will be uploadable or integrated with gen-ai
    at some point so it's important that any anticipated problems with a portrait
    such as face framing can be reported to the user, even potentially fixed automatically
    with a suitable image model.
* Audio input streaming is not currently implemented, nor is Speech To Text
  (STT), vision via image-to-text. This is considered a basic engineering exercise with
  few non-trivial problems.
* The user can currently type text into a chat-like text box and the
  conversation history is shown in the UI.
* Basic system admin panel is revealed by clicking a subtle sprocket icon near
  the top left corner of the main view.
* Desktop Chrome is the only browser currently used in testing. Mobile browsers
  are kept in mind and might even mostly work.

See the separate [TODO list](TODO.md) for fine-grained planning.

At this _proof-of-concept_ stage, the project is a feasibility study to see how
a face-to-face video chat can be assembled using various AI models. It is
architected so that components can be swapped for alternatives which is especially
useful for comparison evaluation as well as integration-isolation for focused
quality and performance testing.

This application is proving to be a usable tech demo but equally likely may
be abandoned if heavy engineering or custom model training is required to make
it fun to use.

The prototype scenario is a fortune teller character, envisioned to be a
physical interactive installation, decorated like a fortune teller's booth or
tent. The key hardware is focused on a computer with a webcam or potentially any
device capable of doing a video call. 

Adjacent variations on the fortune teller theme are equally likely: tarot reader,
philosopher, clairvoyant, astrologer, raconteur, even a kind of concierge for the
specific event it is set up for.

The idea is that punters come to interact with the fortune teller in a natural
conversation workflow.

The fortune teller character is entirely automatic, built from components
relying on available machine learning models and/or online services. A
fully-offline option is a stretch goal although it seems likely to require
unjustified additional engineering and an unfortunate quality compromise.
This is mostly because of the GPU compute demands of the models.

While there are several design choices that are tuned for something like the
fortune teller character, systems and configuration are intended to work the
same for a very different character scenario. Most product engineering engaged
with this feature set seems focused on customer service use cases or pumping
out explainer videos. I'm not that guy. At the moment animals or cartoon
characters are out of scope since the lipsync video models currently under
consideration were not trained on these faces and the result is a blurry mess. A
simpler, traditional animation framework may be more suitable for animating
these. Semi-realistic painterly human portraits do work OK.

The documents here are a bit disorganised and quite verbose. See also:

* [general notes](notes.md)
* [database schema notes](db-schema.md)
* [build and run](build.md)

## Design Principles

It is hoped that this system can work without a traditional human-operated
media production toolchain or pipeline. No video shooting or editing. So far all
media assets are driven by code and AI prompts. Adding video production,
illustration or any other kind of media editing may offer quality benefits or
potential time or money savings. Nevertheless, exclusively constraining all
human development-time input to text from a keyboard makes for an interesting
exploration and at the moment is adopted as a defining feature of this research
project.

Non-verbal portrait animation (such as when listening or thinking) is apparently
achievable by using reference video. This may violate the above design constraint.
Maybe this video could be captured from user input - maybe even system-operator
user input? Given that user video capture is intended for core functionality, it
may be interesting to provide gesture demonstration input as a runtime feature.
Character design could be more independent of system code.

## Character Portrait

The first thing a user sees when interacting with the system is a still portrait of
the fortune teller. It's also feasible to generate subtle pose animation to portray
a contemplative, waiting animation. Various text-to-image generative systems have
been used to create these characters before the system boots although this could
easily be generated, uploaded or captured from a camera.

Various design alternatives include making the installation like a portal or
magic mirror through which the character could be summoned, akin to a kind of
cosmic zoom call.

Suitable character portraits seem to have the following features:

* Portrait aspect ratio is the focus of testing and design but landscape should
  probably work just fine.
* Proportion of the frame that is occupied by the head is between 10% and 30% of
  the shortest edge of the image. This includes headware and hair.
* Background of head region is relatively uniform. Any detail here may be subject
  to warping or tearing.
* No foreground objects or obstructions should be near the head or face square,
  otherwise they will be warped.
* Body position ideally should look natural if held still indefinitely. Having
  the character's hands on a crystal ball or be hidden somehow makes the
  absence of hand gestures less conspicuous. Hand gestures add significant
  compute demand as many animation models focus exclusively on face and head.
* Face lighting and colour should be most like the training data. Face paint,
  extreme wrinkles, exaggerated features, excessive shadows or extreme postures
  all seem to result in pathalogically bad lip sync results.
* Long hair is sometimes problematic because the head and face are animated
  exclusively inside an inset rectangle which will tear at the edge rather than
  simulate the physics of natural movement in long hair. Jewellery or headware 
  that extends beyond the animated inset frame cause similar problems. Compact
  hairstyles rigidly fixed to the head will work best.
* Image resolution has a dramatic effect on lipsync latency and final quality
  but more experimentation is required to determine sweet spots. Source images
  for portraits can be any size as they are dynamically resized by the system.

Face detection and image-to-image models have been evaluated to modify
user-provided portraits and this is deemed feasible.

## Speech to Text

(STT) Listens to audio and transcribes audible speech to text that is fed to the
LLM. Currently available models are anecdotally very good, depending on audio
quality.

Interesting problems:

* Voice isolation
* Distinguishing ambient speech from conversational address. A good mic and
  careful speaker placement would go a long way here. A second microphone could
  be used to add the ability to react to realistic (ethical) eavesdropping.
* Interruption and speaking over.
* Collaborative handling of transcription errors within the conversation just
  like people do when they mishear or misunderstand.
* Accent tuning.
* Round-trip pronunciation metadata. The LLM can't hear the speech, only read
  the transcription. This may make some interactions terrible unless there is
  some metadata that the STT and TTS can share around pronunciation. Worst case
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
could also be used but both design-time and runtime components would be
divergent from the current plan. The generated video is sent to the screen to
present to the user as final output.

## Session Modes

The fortune teller would initially be in a waiting state until a customer
arrives. Their arrival would trigger an introductory mode of interaction with a
distinct system prompt. The fortune teller would invite the customer to sit down
and they would introduce themselves. Once this is done, the primary chat
interaction can start. The session could be interrupted somehow and a return to
the waiting state is expected until a new customer arrives. These sessions
should maintain a history of the interactions, tracking the customer's name and
chat history. Detection of mode transitions and the establishment of a new
session with a new empty chat history can be done in part with pose estimation
of video input.

## Pose Estimation for Scenario Awareness

In addition to the core workflow outlined above, models trained to interpret
video as estimated human poses can be used to detect an approaching customer for
the fortune teller or to detect untimely interruptions to a session. Hand-coded
heuristics could be used for detecting approach and sitting behaviour and each
would need some kind of calibration depending on the physical layout of the
booth with respect to the camera position. Alternately, a setup mode could have
a target zone overlay within which the customer chair is positioned. Some kind
of autocalibration could be acomplished by correlating measured pose positions
when addressed speech is detected.

## Image to Text

In order to facilitate more life-like interactions of two humans who can see
each other and may naturally refer to each other's appearance, a model that can
describe the contents of an image can be used to provide the fortune teller a
description of the person she is speaking to. During the introductory mode the
fortune teller might compliment the customer on thier outfit or some other
in-character smalltalk that references their appearance.

The fortune teller's own portrait can also be used as input to the image-to-text
system for any given portait image so that any reference made to their own
appearance can be responded to naturally and in-character. The same system might
also be used to evaluate the dynamic generation of a fresh fortune-teller
portrait.

The physical deployment scenario captured by a third-person camera, set back
from the booth can also be fed to the image-to-text system and it's possible
that the LLM is provided the resulting description to better understand what the
customer might be referring to in conversation or to, for example, invite the
customer to help themselves to tea or snacks.

## Non-verbal Animation

Video sequences may be generated to make the character more life-like when it
is not speaking. These can be categorised and used appropriately.

* Q: How to generate gesture animations for the character?
* Q: Could a character-design mode be worth adding where image, voice and
  gesture capture is configured?
* Q: Could these videos be used as additional video input to lipsync?
* Q: Can a parametric animated character render be used as reference video for gesture animation?

## Expert System

A traditional expert system can be used to get very low-latency intepretation of
what to do under a moderate set of anticipated situations and conversational
openers, to choose from a variety of pregenerated "canned" introductory video
outputs. These can be used to hide latency in the full interactive workflow
along with various in-character stalling behaviours that likewise do not depend
on user input.

# System Design

Currently only operated in devmode on MacOS. It should work on any operating system
but `MacOsSpeech` will only show up on MacOS. Native subsystem implementations
should detect missing system requirements at boot and show up disabled. Likewise,
if a component implementation is missing a required API key set in the `.env` file,
this component will not be registered at boot time.

Database is postgres. `node-pg-migrate` scripts defined in `server/package.json`
to create tables etc. Production deployment process is yet to be defined.

Current boot-time check of git hash will fail if git is absent. Production
deployment is expected to have a configured version tag instead.

## Dependencies

Each service component listed above can have different back end implementations,
both local and as online API services.

* Running on `macos` (primary devmode), `brew` is advised for installing deps.
* LM-Studio for the LM-Studio back end
* OpenAI account for the ChatGPT back end
* ElevenLabs account for the ElevenLabsVoice, and `brew install mpv`
* For SystemVoice on `macos`, system command `say` is used. Various voices
  are assumed to exist.
* For converting `aiff` output audio from the `macos` `say` command
  to `mp3`, `ffmpeg` is required: `brew install ffmpeg`
* `git` assumed on `$PATH` for devmode version definition. Database tracks each
  boot and run independently
* SadTalker has been tested for speech audio and image to lip sync video and its
  dependencies are a bit wild and hairy. Installing it on a capable MacBook Pro
  required `Anaconda`, `ffmpeg` and various python packages. Instructions in the
  SadTalker repo are terse and insufficient as a small custom patch to one of
  the Python package's source code was required after some googling.
* Whisper.cpp is currently being evaluated for user voice transcription.
  The plan is to stream all audio from the front-end to the server and pipe that
  into whisper. This enables use of the largest model with predicable performance
  and results in highest-accuracy transcription.

## Features

* shows image of character
* settings panel
* can choose a different character image from set found on disk
* text input
* text output
* speech output
* lip sync video output usually works but only for human faces
* chat history shown like conversation (will probably turn off for when speech
  input is implemented)

## Test Suite

Mostly nonexistent, basic scaffold:

`bun run test`

* Component tests
* Full session log (replayable interactions)
* integration tests
* metrics and comparisons to alternate components (i.e. evaluating text form of
  responses to a suite of questions for each LLM)
* abuse cases
* LLM evaluation of response to test inputs looking for specific features or to
  ensure certain absences (manually review these assessments)

## Modes

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

## Scene Ideas

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

## Deployment Targets

* dev mode laptop-only
  * use laptop camera, mic, speakers etc.
* [ ] macos comparison test: chrome, chromium, safari, firefox
  * camera audio/video capture codec support
  * consider non-web components for production installation (tradeoffs?)
* [ ] what about full mobile web app with mic & camera?
  * [x] basic feasibility - works OK but testing is horrible
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

## Character Definition Workflow

The following data structure needs to be seeded, expanded, augmented and merged
in various ways.

* reference portrait
* reference pose video graph
  * interconnected animations are edges, fixed poses are nodes
  * a graph may give nonlinear, realistic animations that are sufficiently
    polished
* reversible gesture animations
  * mocap animations don't necessarily return to origin pose,
  * experiment with boomerang video animation to return to origin
* voice model - makes sense to attach a voice to a portrait
* vocal fx chain
  * pre-lip sync (e.g. speaking speed, band-pass, noise reduction, comp)
  * post-lip sync (e.g. reverb, re-pitch)
  * define in-app audio fx vs external audio fx

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
  core response which does.¬

## Acknowledgements

* [google-webfont-helper](https://gwfh.mranftl.com/fonts) cool tool for downloading google fonts in
  `.woff2` format
