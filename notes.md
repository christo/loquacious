# General Notes

## Key Interfaces

## Loquacious

Stateful system configuration with various domain services configured and contained.

All system and domain logic should live under here. Server endpoints should be constrained to
dealing with the HTTP domain.

Each interactive session should have its own instance of this.

## LoqModule

Interface with parametised types for input and output high level interaction types.

Integration point between db and possibly multiple domain service instances.

## CreatorService

* Responsible for db creation of domain objects, one for each domain category
* 


## LIP SYNC

Q: What is the best lip-sync system/service. What inputs/workflow? 

Some seem to be geared towards "offline" processes that produce assets for rigged 3d or keyframed video outputs that are designed to fit into an animator's workflow.

Some require video input as a kind of setup-time calibration of how the lips should move. I wouldn't be surprised if this results in better quality. Sometimes mere image+speech to video will render horrific teeth and obvious morphing/tearing at the edge of the rectangular peephole inside which the face alone is animated. I'm prepared to be practical on this.

My testing suggests that lip sync is possibly the slowest part so far. I'm testing with a single portrait image and an audio file containing only speech. Depending on the resolution of the image, the length of the speech and the quality settings, using the open source "sadtalker" model running on [fal.ai](http://fal.ai/) it can take up to a minute to generate 10-20s of video and it costs about 1-10c. I'm confident I can probably speed that up by 10x with some tricks but that is still way off ideal figures of 1-1.5s end to end turnaround. Not to mention those tricks may amount to weeks of coding and testing.

## QUALITY & LATENCY EXPECTATIONS

The LLMs tested so far generate text in 1-5s depending on the model - GPT 4o does seem pretty high quality but GPT 4o-mini is noticeably faster. Unfortunately it's a bit more unpredictable and occasionally insists on offering tea even though I have strict instructions about not offering anything that requires physical movement nor to make reference to items it imagines might typically be physically present in the stated scenario unless they are explicitly itemised.

The speech generation seems to also take about 1-5s although I haven't finished the performance statistics tracking yet.

I haven't tested speech-to-text yet but I am expecting similar tradeoffs.

## MEDIA PRODUCTION WORKFLOW CHAIN

The first thing to acknowledge is that the end-to-end voice to video system is pathologically serial. Each component feeds into the next and the chain is long. There may be no parts that can be done in parallel to others. The punter will be waiting from the moment they believe they have finished speaking until the first frame of video response. Here's the end-to-end workflow, pretty much as you said:

1. maybe some kind of video input to trigger transition from "attract mode" to "conversation mode" (I think this could be relatively easy to hack together and should be fast)
2. speech detection of start and stop (environment could be noisy, might want to support interruption and talking-over, how to handle unanticipated follow-on input, maybe audio pre-processing and microphone calibration) STT models do not necessarily do this themselves.
3. speech to text
4. text to text LLM chat (given a character definition system prompt, generic system prompt, conversation history, embedded situational knowledge about time of day, what event am I at etc.)
5. text to speech (eleven labs is best quality by far) 
6. lip sync: speech + image to video (optionally also feeding reference video for gesturing?)
7. Possible video post-processing such as compositing or concatenating sequences

## STREAMING

While most links in the workflow chain can in-principle be streamed such that they don't need to finish producing their output before feeding it onward, the sequence is quite fixed. Text chat feels hard to stream. The text input to chat could in-theory be chunked or streamed but subsequent input could invalidate any preemptive response to the partial input. Imagine someone says "I have always loved to walk in the rain... but ever since I caught pneumonia I have given that up.". Any response preemptively generated in response to the first part alone would have to be ditched in cases like these. It is possible that such a judgement to ditch the preemptively generated first part can also be made by an LLM, possibly a smaller, faster one, but you can imagine the potential complexity explosion here and in the end it may not feel faster.

While I'm optimistic about streaming, especially for STT and TTS, even these benefit from having a trailing context window that produces better results depending on what comes after. Sometimes a STT system will revise its interpretation once it hears subsequent audio. The iconic "this computer can wreck a nice beach if you speak clearly enough and have a good microphone". The first part would be revised in modern systems once it hears the second part of the sentence. Conversely "This computer can recognise speech if it leaves enough garbage on the sand."

I've found a big variation in quality and performance with models for each job (LLM chat, TTS, lip sync etc.) not only between different models but among the responses of a single model. I guess this is expected but my takeaway is that an extended testing and tweaking phase for a basically working system will make all the difference. Ideally this could be made convenient for a small gang of non-technical collaborators to do. Imagine a training mode, say, with a carrot button and a stick button to help explore the settings and model choices that produce the best bang for buck. There is a galaxy of options, parameters and ways to instruct the system to be more fun and these would benefit from exploration and human assessment.

Also worth exploring is a low-latency helper subsystem implemented as a classical "expert system" ("artificial stupidity") to handle situations like unprompted openings, canned responses and interruption workflows. Many equivalent variations of each could be generated and rendered ahead of time for quick access so punters could get a quick video response that they haven't seen before. We could make sure not to repeat any canned response that was already played to this punter so long as we have enough takes in the bag ready to go.

There are also non-technical design choices that can be made which help hide latency like in-character theatrical stalling behaviour. If the persona is an all-powerful goddess, she is expected to demand patience, ignore interruption and engage in more "high ceremony" sequences which could hide end-to-end delays. Likewise, shepherding the punter to focus on deep questions that deserve careful consideration, gazing into one's crystal ball for the answer etc. rather than let people expect fast banter and chit-chat. We don't want a system that takes a minute to answer "what's your name?". Another alternative persona is an absent-minded old lady who can be expected to say "now hold your horses..." types of things a lot. Careful design of stalling should avoid assumptions about what might have been said. If someone says "OK I'm ready" it might make more sense to say something like "just a moment sweetie" rather than "hmmm... that's interesting".

## GESTURE SYNTHESIS 

It's not strictly necessary but even a bunch of manually shot gesture sequences that each return to a home pose could liven up the final output video if used to drive larger-scale body gestures for a reference image. Sadtalker does accept this as optional input. There are alternative ways of designing around lip sync constraints are also worth considering if we only have an animated face and head. We can frame the character's very closely (like a goddess portal) or we can choose a full portrait in a pose that looks naturally still (think hands on crystal ball or some kind of meditation-trance posture) but if the video shows an elaborate furnished scene, we don't want to break the spell by having the character come across stiff because it is fixed in some weird posture. There may also be room for some video compositing of something like a flickering candle or swirling mist inside the crystal ball to help make the scene feel more alive.



