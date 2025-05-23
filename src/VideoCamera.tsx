import {PoseSystem} from "./PoseSystem.ts";
import {MutableRefObject, useEffect, useRef, useState} from "react";
import {Detection} from "@mediapipe/tasks-vision";
import {Stack} from "@mui/material";

// noinspection JSUnusedLocalSymbols
/**
 * A predicate for a {@link Detection} that return true iff the object is judged closer than a tuning threshold
 * @param d
 */
// @ts-ignore
const isClose = (d: Detection): boolean => {
  // Temporarily use width of bounding box as approximation of proximity
  // due to landscape cropping in camera frustrum with expected orientation,
  // height is less likely to be indicative. Can get fancier as required.

  // TODO get rid of hard-coded width here - autocalibrate with full vision model
  //   this is resolution dependent
  return (d.boundingBox !== undefined && d.boundingBox.width > 160);
};

/*
High level goal is to know when to act - either speak or transition to a new mode (e.g. from attract to invite).
This should include detecting when a person leaves when chatting (without triggering if the person changes posture)
and also if a person approaches and looks like they're beginning a session.

There may be many people milling around "out of range" and we want to know when to speak an invitation to approach.
We also want to detect an approach. If there are multiple person objects detected, we need to guess object persistence
across video frames.

One heuristic might be to compare objects from one frame to the next (so long as the time delay is below some
threshold), calculate difference: k*abs(centroid-delta) + j*abs(size-delta) where k and j are tuning coefficients.
It follows that the optimal inter-frame object constancy map minimises the aggregate difference. Gut says this should
be a RMS function.

Q: how many frames do we need to keep?
If we just want to take jitter out of the detected object map by adding hysteresis we only need to modify current
detections? This should prevent false positive triggering due to momentary noisy detections. A simpler way might be
to just require n frames of trigger condition in a row.
Q: do we need to estimate velocity over n frames in order to make assertions about approach or departure motion?
Q: how relevant is object constancy at all? We want a new session if the user swaps with another.
Q: what time parameters should we use? Frame times are not guaranteed to be consistent.

TODO: flexible approach and departure detection using vision and pose estimation
TODO: investigate "scene change" and "camera move" detection using vision-enabled LLM
  can a vision-enabled LLM tell if two images are "the same scene"? Can a delta on edge-detect kernel filter do this?
 */

type VisionConsumer = {
  video: (video: HTMLVideoElement, startTimeMs: number, deltaMs: number) => Promise<void>,
  image: (image: HTMLImageElement) => Promise<void>,
}

/**
 * Single on-page video camera component subscribed to by the given consumers.
 * Expected consumers include client-side ai models for vision and streaming to server, depending on settings
 * and current state.
 * @param consumers each will be passed the video on each frame update.
 */
function VideoCamera({consumers}: { consumers: VisionConsumer[] }) {
  const camRef: MutableRefObject<HTMLVideoElement | null> = useRef(null);
  const [lastVideoTime, setLastVideoTime] = useState(-1);

  useEffect(() => {
    if (camRef.current !== null) {
      // TODO confirm the audio can be read by consumers but is simply not monitored to client
      camRef.current.volume = 0;

      async function readVideoFrame() {
        let startTimeMs = performance.now();
        if (camRef.current!.currentTime !== lastVideoTime) {
          setLastVideoTime(camRef.current!.currentTime);
          await Promise.all(consumers.map(c => c.video(camRef.current!, startTimeMs, startTimeMs - lastVideoTime)));
        }
        window.requestAnimationFrame(readVideoFrame);
      }

      navigator.mediaDevices.getUserMedia({video: true, audio: true})
          .then(function (stream) {
            if (camRef.current) {
              camRef.current.srcObject = stream;
              camRef.current.addEventListener("loadeddata", readVideoFrame);
            }
          })
          .catch((err) => {
            // camRef will simply not be set
            console.error(`webcam error: `, err);
          });
    }
  }, []);
  // we seemingly need to attach camera video stream to an on-page html element probably so it binds to gpu context
  // enabling gpu ai model direct access to the video frame, it can be hidden:
  // {display: none} breaks it but {visibility: hidden} does not
  return <Stack sx={{position: "absolute", top: 0, right: 0, visibility: "hidden"}}>
    <video ref={camRef} autoPlay playsInline></video>
  </Stack>;
}

/**
 * How long between person detections.
 */
const PERIOD_DETECT_PERSON_MS = 2000;

function poseConsumer(poseSystem: PoseSystem, setPeople: (d: Detection[]) => void) {
  let lastPeopleUpdate = 0;
  return {
    async image(image: HTMLImageElement): Promise<void> {
      const od = await poseSystem.personDetect("VIDEO");
      const detections = od.detect(image);
      const ds = detections.detections;
      setPeople(ds);
      return Promise.resolve();
    },
    async video(video: HTMLVideoElement, startTimeMs: number, _deltaMs: number): Promise<void> {
      if (Date.now() - lastPeopleUpdate > PERIOD_DETECT_PERSON_MS) {
        const od = await poseSystem.personDetect("VIDEO");
        const detections = od.detectForVideo(video, startTimeMs);
        const ds = detections.detections;
        setPeople(ds);
      }
    }
  } as VisionConsumer;
}

export {VideoCamera, poseConsumer, type VisionConsumer};
