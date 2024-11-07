import Box from "@mui/material/Box";
import {PoseSystem} from "./PoseSystem.ts";
import {MutableRefObject, useEffect, useRef, useState} from "react";
import {Typography} from "@mui/material";

interface VideoCameraProps {
  poseSystem: PoseSystem
}

let lastVideoTime = -1;


function VideoCamera({poseSystem}: VideoCameraProps) {
  const [numPeople, setNumPeople] = useState(0);
  const camRef: MutableRefObject<HTMLVideoElement | null> = useRef(null);
  useEffect(() => {
    console.log("VideoCamera calling useEffect()")
    poseSystem.personDetect("VIDEO").then(od => {
      if (camRef.current !== null) {
        async function predictWebcam() {

          let startTimeMs = performance.now();

          if (camRef.current!.currentTime !== lastVideoTime) {
            lastVideoTime = camRef.current!.currentTime;
            const detections = od.detectForVideo(camRef.current!, startTimeMs);
            //console.log(detections.detections.length);
            const close = detections.detections.filter((d) => {
              // Temporarily use width of bounding box as approximation of proximity
              // due to landscape cropping in camera frustrum with expected orientation,
              // height is less likely to be indicative. Can get fancier as required.
              // TODO get rid of hard-coded width here - autocalibrate with full vision model
              return d.boundingBox && d.boundingBox.width > 160;
            });
            setNumPeople(close.length);
          }
          window.requestAnimationFrame(predictWebcam);
        }

        navigator.mediaDevices.getUserMedia({video: true})
            .then(function (stream) {
              camRef.current!.srcObject = stream;
              camRef.current!.addEventListener("loadeddata", predictWebcam);
            })
            .catch((err) => {
              console.error(`webcam error: `, err);
            });
      }
    });
  }, []);

  return <Box sx={{mb: 150, justifyItems: "center", flexDirection: "column"}}>
    {numPeople > 0 && <Typography variant="h1" sx={{fontWeight: 800}}>HELLO</Typography>}
    <Box sx={{visibility: "hidden"}} ><video ref={camRef} autoPlay playsInline></video></Box>
  </Box>
}

export {VideoCamera};