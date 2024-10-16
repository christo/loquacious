# Loquacious

LLM chat application experiment.

## Dependencies

* LM-Studio for the LM-Studio back end
* OpenAI account for the ChatGPT back end
* ElevenLabs account for the ElevenLabsVoice, and `brew install mpv`
* For SystemVoice on `macos`, system command `say` is used. Various voices
  are assumed to exist

## Features

* shows image of character
* can choose a different character image
* text input
* text output
* speech output
* basic settings panel

## TODO

* [x] save generated voice to file
* [ ] db schema
  * system prompt versions
  * modestates
  * text-to-text: prompts, output, modestate, system, model, datetime, system-parameters
  * text-to-speech: input, system, options
  * speech-to-video: input speech, input video (optional), system, options
  * performance stats
  * image-to-text: image-ref, image-hash, system, text, system-prompt?, timestamp,
* [ ] test reference data filetree (better for version control not to require
      database so it can be version controlled)
* [ ] save generated text to db
* [ ] identify which model was used for the text
* [ ] decide data file tree, maybe this:
  * `<base>/<category>/<system>/<option>/<tag>_<db-id>.<format>`
  * category: tts, ttt, stv (speech to video), etc.
  * db-id: the record that connects the input, system and parameters to other records 
* [ ] spike fal sadtalker to generate video from picture and speech file
  https://fal.ai/models/fal-ai/sadtalker/api
* [ ] Q: does it make sense to inform llm in system prompt that output is
      spoken with a specific system and all formatting should be appropriate
      for input into that speech system? i.e. no emojis, stage direction etc.
* [ ] get local sadtalker running with conda per github
* [ ] settings panel
  * [ ] show current main llm/model
  * [x] show current speech system and voice option
  * [ ] show other main llm/model options
  * [ ] show other speech/voice options
* [ ] basic database schema
* [ ] check out multimodal models like LLaVA 1.5 and LLaVA 1.6
* store interactions in database
* usable cached generated output
* [ ] dynamic configuration from settings panel
  * response length
  * system prompt builder
  * back-ends
    * LLM service, model
    * image-to-text
    * lip sync
    * text-to-speech
    * speech-to-text
      * character voice
  * speaking
    * installed MacOS voice list
  * listening
  * server-side image configuration
* [x] rename `server/index.ts` to `server/server.ts`
* [ ] pose estimation plan
* [ ] ping-pong chat sequence
* [ ] check how it works on mobile web
* [ ] enumerate LLM backends
* [ ] show chat history (including cached audio)
* [ ] plan to evaluate local system speech recognition option
* [ ] plan to evaluate local whisper speech recognition option
* [ ] evaluate elevenlabs websocket "realtime" streaming:
  https://elevenlabs.io/docs/api-reference/websockets
* [ ] generalise backend config options:
  * type: e.g. text-to-text
  * role: e.g. deciding what to say. future features like interpreting
    image-to-text output to build a system prompt which includes self-image
    might be best done by running a smaller/faster model that isn't good enough
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
  * the greeting is normalised ("hello there" is the same as "well hello" etc.)
  * possibly split off from subsequent speech, such as "hello ... what is your
    name?", each could be separately cached, maybe recognition and normalisation
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
    * if camera moves or scene changes, need to mark engagement zone in camera
      field
    * lighting
    * pose estimation and video frame grab integration
  * possible whole-scene photo input
    * it may help the LLM if it can see not only what it looks like but what the
      actual current deployment scene looks like?
* Per-deployment configuration needs to know:
  * event details, maybe including whole schedule of events
  * VIPs
  * permanent physical layout and scene design details (red tablecloth, crystal
    ball, vase of flowers etc.)
  * if a person asks about an event coming up, we could quip about telling their
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

### Test Suite

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
* Admin Mode - various system changes can be made
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
* buddha
* creator clone - self description and explanation of how it works
  * expert on self and how it works
  * can converse in this mode as a general assistant but with identity stuff
    in system prompt

### Deployment Targets

* dev mode laptop-only
  * use laptop camera, mic, speakers etc.
* what about full mobile web app with mic & camera?
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

* Corrections
* Interruptions

### Memory and Local Knowledge

* What is the physical deployment scenario
  * festival
  * party/event
* Reference material for important people known to all at event
* Memory of people seen in previous sessions
* Self-knowledge narrative
* Meta-understanding
  * does not break character or betray that it is an AI
  * is not willing to break character by sharing unlikely expert knowledge
  * if, say, asked about quantum physics, summarily describes vague references
  remaining in character

### Text to Speech

* elevenlabs?
* voice clone
* what is the best tts that can run locally?

### Latency hiding

* slow speech cadence
* canned smalltalk
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

* low latency
* sentiment, emotion detection etc.
