type WorkflowStep = (
    "idle" |
    "llm_request" |
    "llm_response" |
    "tts_request" |
    "tts_response" |
    "lipsync_request" |
    "lipsync_response"
    );

export {type WorkflowStep};