import {MutableRefObject, useEffect} from "react";
import {Box} from "@mui/material";

export function Portrait({src, imgRef, videoRef, videoSrc, hideVideo}: {
  src: string,
  imgRef: MutableRefObject<HTMLImageElement | null>,
  videoRef: MutableRefObject<HTMLVideoElement | null>,
  videoSrc: string | undefined,
  hideVideo: () => void
}) {
  useEffect(() => {
    videoRef.current!.addEventListener('ended', () => {
      hideVideo();
    });
  }, []);
  return <Box sx={{
    marginTop: 0,
    marginLeft: "auto",
    marginRight: "auto",
    objectFit: "cover",
    objectPosition: "top"
  }}>
    <video className="portrait" style={{zIndex: 3, transition: 'none'}} ref={videoRef} src={videoSrc}
           preload="auto"/>
    <img className="portrait" ref={imgRef} alt="portrait" src={src}/>
  </Box>
}