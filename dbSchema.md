# Database Schema Design

* everything has a db id
* file references may be done in either direction; either the filename contains
  the database id or there is a column to capture filename. Large media files
  belong on the filesystem and ideally their content can be identified
  or categorised conveniently.
* consider everything making sense when:
  * sometimes different subsystems are disabled at runtime
  * physical kiosk deployment
  * online video call deployment
  * online audio-only call deployment
  * online remote deployment (e.g. staging/test)

## system_version

Need to reference code version somehow. Decide if it makes sense to make an
upgrade during a scenario or maybe it's fine to make a new scenario. Maybe
each scenario has a system_version?

* version tag - semver
* git hash - base hash
* modified - boolean (devmode)

## run

Created each time system is booted.

* started - datetime
* component - server/frontend/? they can have different lifecycles

## deployment_type

e.g. devmode, A/V production event, video/audio call setup

* descriptor
* configuration

## scenario

Represents a physical scenario

* created - datetime
* scenario
* configuration - various subsystems can be disabled
* deployment_type - fk

## user

Authenticated users can engage in training mode. Can have kiosk users who
equate to a deployment situation where multiple people interact under this
shared identity.

* username
* external identifier
* other relevant coordinates (if audio or video call, some identifier)
* permissions?
* email

## calibration settings

Because a camera can move, possibly even mid-session, some features might
need to have settings that change accordingly. Autonomous recalibration is
possible in-principle, but recording and capturing this change is necessary
for quality assurance and improving such automation in future. It might be
necessary to interpret pose estimation quality post-hoc and to preserve,
correlate or contextualise the information contained in judgements.

## session

Identifies a sequence of interactions by a user

* user - fk - system is used with relevant permissions
* startTime
* finishTime
* timezone - punter timezone (system timezone could be different)
* clientsystem - fk
* initiator (workflow trigger mechanism, implicit, explicit etc.)
* deployment - a session always has a containing deployment

## mode_state

During a session, the system will change mode states, these entries record
specific state transitions.

* session - fk
* start - datetime
* mode - fk/enum - which mode is this?

## client_system

Capture details about the client runtime and hardware if known, alternately
capture relevant details if is an online voice or video call

* browser details
* camera
* microphone
* speakers
* resolution
* external account references - if online through some call channel
* ... etc.

## portrait

Character portrait to use for showing and to use for driving lipsync video.
May need to do format conversion, resizing etc. Probably best to have one
master image and derivatives refer back to original. Consider same idea for
other media assets and their transformation pipelines.

* file ref - need to know which is master image, which are post-processed?
* image hash
* width
* height
* filesize
* format
* other image metadata (bit depth yada)
* provenance - where did this come from?

## video

Could be captured input for pose estimation, generated output from
lipsync, used as input for gesture reference etc.

* created - timestamp
* video file reference
* length
* format
* post-processing
* type - input/output
* provenance - ?

## pose

* video file reference
* provenance (synthesised, from a session/deployment?)
* pose system parameters
* captured pose coordinates?
* interpretation by system

## pose_sequence

Some kind of chain of poses captured in sequence

* index
* pose - fk

## audio

Smallest unit of stored audio

* created - timestamp
* length
* format
* audio_filter - fk, optional only if applied
* type - raw input, tts output
* provenance - where did this come from?

## audio_filter

Some small number of audio processing definitions to help categorise different
pre-processing methods and distinguish rows in audio_recording

* name
* implementation - code ref?

## stt

Speech to text

* created - timestamp
* system
* parameters
* audio_recording - input
* text - output

## prompt_template

Forms a graph but how to resolve/store value references for usage instances?

Templates for producing system prompt text with named holes for parameters that are dynamically filled (e.g. current time, another prompt template)

What format to use?

* text

## prompt_parameter

* unique_name
* function_reference - code refe.g. current datetime refers to a function that always
  returns a different value or a prompt template?

## chat

Text to text

* created - timestamp
* system - could be composite, expert system, LLM etc.
* parameters - expert system should betray its options variant
* system_prompt - fk
* user_prompt - optional (could be initiator)

## mode

Workflow graph values may not belong in db but need to be referenced:
idle, attract, invite, chat, close etc..

These might be deployment specific and be implemented differently depending
on available subsystems. If no video, then triggering a mode state transition
needs to have an alternative defined mechanism than pose estimation.

## tts

* created - timestamp
* system
* parameters - ?
* audio_recording - fk
* text - input

## lipsync

Generated video from speech audio, portrait and maybe gesture reference

* created - timestamp
* system
* parameters
* audio_recording - fk - input
* portrait - fk - input
* gesture_reference - fk - optional input
* video

## judgement

Human judgement of a production artifact

* score - -1 to 1
* user - fk
* created - timestamp
* active - can deactivate
* comment - optional

## judgement joining tables

Also need joining tables for each type that can receive judgement, 
probably including other judgements, each looking similar.

* judgement - fk
* target id - fk specific to table type

## performance logs

similar to judgements, may need multiple tables or maybe stored in a different
db, in filesystem or some hybrid

* created - timestamp
* measure - string key identifying measured action 
* value - always a duration in ms?
* hardware - physical machine details if relevant to enable comparison
* system - service identifier
* parameters - might include model options etc.
* resource details - sometimes available ram is relevant 
* deployment - fk
* session - fk
* system version - fk

## faults

All runtime failures should be captured for later analysis and correlation with
judgements. Generally these are exception flows due to outages or bugs but can
also be detectable unwanted outputs (video format, length, size invariants 
can be broken). LLM refusal may or may not be considered a fault or a low
quality legitimate output?

* type - some short category (maybe also detect soft refusals by models)
* description - detail
* system_version - fk
* deployment - fk
* session - fk
* ... other details similar to performance logs

## precalculation metadata

Various artifacts should be generated either on-demand or preemptively.
We may want to automatically generate combinatoric versions of canned tts and
lipsync video automatically when portrait images update.

## test suite specific data

Hopefully this can be done independently of the database as much as possible,
but some warranted automated integration tests may generate production-like
