import Box from "@mui/material/Box";
import {PoseSystem} from "./PoseSystem.ts";
import {MutableRefObject, useEffect, useRef, useState} from "react";
import {Detection} from "@mediapipe/tasks-vision";

/**
 * A predicate for a {@link Detection} that return true iff the
 * @param d
 */
// @ts-ignore
const isClose = (d: Detection): boolean => {
  // Temporarily use width of bounding box as approximation of proximity
  // due to landscape cropping in camera frustrum with expected orientation,
  // height is less likely to be indicative. Can get fancier as required.
  // TODO get rid of hard-coded width here - autocalibrate with full vision model
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

TODO: set up an empirical test suite to find coefficients for flexible approach and departure detection;
  use the assumption that approach vector is colinear with the centroid of the camera frustrum
TODO: investigate "scene change" and "camera move" detection using vision-enabled LLM
 */

type VisionConsumer = {
  consumeVideo: (video: HTMLVideoElement, startTimeMs: number, deltaMs: number) => Promise<void>,
  consumeImage: (image: HTMLImageElement) => Promise<void>,
}

/**
 * Single on-page video camera component that subscribed to by the given consumers.
 * @param consumers each will be passed the video on each frame update.
 */
function VideoCamera({consumers}: { consumers: VisionConsumer[] }) {
  const camRef: MutableRefObject<HTMLVideoElement | null> = useRef(null);
  const [lastVideoTime, setLastVideoTime] = useState(-1);

  useEffect(() => {
    if (camRef.current !== null) {

      async function readVideoFrame() {
        let startTimeMs = performance.now();
        if (camRef.current!.currentTime !== lastVideoTime) {
          setLastVideoTime(camRef.current!.currentTime);
          await Promise.all(consumers.map(c => c.consumeVideo(camRef.current!, startTimeMs, startTimeMs - lastVideoTime)));
        }
        window.requestAnimationFrame(readVideoFrame);
      }

      // seemingly need to attach video stream to an html element which probably binds to gpu context
      // and enables gpu model to access the video frame
      navigator.mediaDevices.getUserMedia({video: true})
          .then(function (stream) {
            camRef.current!.srcObject = stream;
            camRef.current!.addEventListener("loadeddata", readVideoFrame);
          })
          .catch((err) => {
            // camRef will simply not be set
            console.error(`webcam error: `, err);
          });
    }
  }, []);

  return <Box sx={{mb: 150, justifyItems: "center", flexDirection: "column"}}>
    <Box sx={{visibility: "hidden"}}>
      <video ref={camRef} autoPlay playsInline></video>
    </Box>
  </Box>
}

function poseConsumer(poseSystem: PoseSystem, setPeople: (d: Detection[]) => void) {
  return {
    async consumeImage(image: HTMLImageElement): Promise<void> {
      const od = await poseSystem.personDetect("VIDEO");
      const detections = od.detect(image)
      const ds = detections.detections;
      setPeople(ds);
      return Promise.resolve();
    },
    async consumeVideo(video: HTMLVideoElement, startTimeMs: number, _deltaMs: number): Promise<void> {
      const od = await poseSystem.personDetect("VIDEO");
      const detections = od.detectForVideo(video, startTimeMs);
      const ds = detections.detections;
      setPeople(ds);
    }
  } as VisionConsumer;
}

export {VideoCamera, poseConsumer, type VisionConsumer};
