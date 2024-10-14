# Loquacious

LLM chat application experiment.

## Dependencies

* LM-Studio for the LM-Studio back end
* OpenAI account for the ChatGPT back end
* ElevenLabs account for the ElevenLabsVoice, and `brew install mpv`
* For SystemVoice on `macos`, system command `say` is used.


## TODO

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
  * reference self image(s)
  * reference motion video to drive animated video out
  * audio in, text in
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
* file save disk cache
  * model-specific text in, text out
  * 
* db logging
* [ ] basic admin page
* [ ] settings panel
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
  * listening
* [ ] aggregated system logs
* [ ] usage stats
* [ ] performance log
  * [ ] recent performance, best, worst, 80th percentile 

### Test Suite

* Component tests
* Full session log (replayable interactions)
* integration tests
* metrics and comparisons to alternate components (i.e. evaluating text form of
responses to a suite of questions for each LLM)
* abuse cases
* LLM evaluation of response to test inputs looking for specific features or to
  ensure certain absences (manually review these assessments)

### Scene Ideas

* fortune teller
  * crystal ball, scrying bowl, casting bones, tarot cards
  * circus variant
* ancient mythology
* philosopher

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
