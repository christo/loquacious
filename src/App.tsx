import {Box, CircularProgress, Stack} from "@mui/material";
import React, {KeyboardEventHandler, type MutableRefObject, useEffect, useRef, useState} from 'react';
import "./App.css";
import {Message} from "../server/src/domain/Message";
import {type ImageInfo} from "../server/src/image/ImageInfo";
import {SystemPanel} from "./SystemPanel.tsx";
import {ChatContainer, ChatResponse} from "./ChatHistory.tsx";
import {ChatInputComponent} from "./ChatInput.tsx";
import type {Dimension} from "../server/src/image/Dimension"
import {Portrait} from "./Portrait.tsx";
import {PoseSystem} from "./PoseSystem.ts";
import {poseConsumer, VideoCamera, VisionConsumer} from "./VideoCamera.tsx";
import {Detection} from "@mediapipe/tasks-vision";
import {Boy} from "@mui/icons-material";
import { io } from "socket.io-client";


const DEFAULT_PORTRAIT = 0;
const SERVER_PORT = 3001;
const poseSystem = new PoseSystem();
const socket = io("ws://localhost:3002");

type CompResponseProps = {
  response: ChatResponse,
  loading: boolean,
  videoRef: MutableRefObject<HTMLVideoElement | null>,
  hideVideo: () => void;
  showVideo: () => void;
  showChat: boolean;
}

/**
 * Composite response component. Includes chat history, and either audio or video.
 * @param response
 * @param videoRef
 * @param hideVideo
 * @param showVideo
 * @param showChat
 * @constructor
 */
function CompResponse({response, videoRef, hideVideo, showVideo, showChat}: CompResponseProps) {
  const video = response.lipsync?.videoPath;
  const speech = response.speech;
  // TODO test lipsync and speech without video
  const fetchMedia = (av: "audio" | "video", handleBlob: (blob: Blob) => void) => {
    const url = `//${location.hostname}:${SERVER_PORT}/${av}?file=${video}`;
    fetch(url).then(response => {
      if (!response.ok) {
        throw `network response for ${av} was crap`;
      } else {
        return response.blob();
      }
    }).then(handleBlob).catch(error => {
      console.error('Fetch-o-Error:', error);
    });
  };
  useEffect(() => {
    if (video) {
      fetchMedia("video", blob => {
        videoRef.current!.src = URL.createObjectURL(blob);
        showVideo();
        // noinspection JSIgnoredPromiseFromCall
        videoRef.current!.play();
      });
    } else {
      hideVideo();
      if (speech) {
        // no video, only speech
        fetchMedia("audio", blob => {
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.play().catch(reason => {
            console.error("Audio play failure", reason)
          });
        });
      } else if (response.llm) {
        // no llm no response at all
        console.log("no speech or video in response");
      }
    }
  }, [response])
  if (showChat) {
    return <ChatContainer messages={response.messages}/>;
  } else {
    return null;
  }
}

const Spinner = () => {
  return <CircularProgress size="3rem" color="secondary"
                           sx={{
                             position: "absolute",
                             zIndex: 500,
                             top: "2rem",
                             right: "2rem",
                             p: 1,
                             borderRadius: "100%",
                             backgroundColor: "rgba(0, 0, 0, 0.25)",
                             boxShadow: "0 0 9px 9px rgba(0, 0, 0, 0.25)",
                           }}/>;
}

function PunterDetectIcons({people}: { people: Detection[] }) {
  return <Stack sx={{justifyItems: "end"}}>
    {people?.map((_: Detection, i: number) => {
      return <Boy
          key={`dpersoni_${i}`}
          color="warning"
          fontSize="large"
          sx={{p: 0, m: 1, backgroundColor: "#000", borderRadius: "100%"}}
      />;
    })}
  </Stack>
      ;
}

const EMPTY_RESPONSE: ChatResponse = {
  messages: [],
  speech: undefined,
  llm: undefined,
  model: undefined,
  lipsync: undefined,
}

const App: React.FC = () => {

  socket.on("connect", () => {
    console.log(`socket connect id ${socket.id}`); // x8WIv7-mJelg7on_ALbx
  });

  socket.on("disconnect", () => {
    console.log(`socket DISconnect`); // undefined
  });

  socket.on("connect_error", (error) => {
    if (socket.active) {
      console.log(`socket ${socket.id} connect error, not dead yet`);
    } else {
      console.log(`connection denied by server, requires manual reconnection: ${error.message}`);
    }
  });

  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<ChatResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [dimension, setDimension] = useState<Dimension | null>(null);
  const [portraitBaseUrl, setPortraitBaseUrl] = useState<string | null>(null);
  const inputRef: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      fetch(`//${location.hostname}:${SERVER_PORT}/portraits`).then(result => {
        result.json().then(data => {
          setImages(data?.images || null);
          setDimension(data?.dimension || null);
          setPortraitBaseUrl(data?.portraitBaseUrl || null);
        });
      });
    } catch (e) {
      console.error('Error fetching portraits', e);
    }
  }, []);

  const [imageIndex, setImageIndex] = useState(DEFAULT_PORTRAIT);

  const handleSubmit = async (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      return;
    }
    poseSystem.resetCanvas();
    const anticipatedMessg = new Message(-1, new Date(), prompt, -1, true);
    const anticipatedResponse: ChatResponse = {
      messages: [...response.messages, anticipatedMessg],
      speech: undefined,
      llm: undefined,
      model: undefined,
      lipsync: undefined,
    }
    setResponse(anticipatedResponse);
    setLoading(true);
    setPrompt("");
    const input = inputRef.current?.querySelector('textarea');
    if (input) {
      input.blur();
    }
    try {
      const result = await fetch(`//${location.hostname}:${SERVER_PORT}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          portrait: images[imageIndex],
        }),
      });

      const data = await result.json();
      setResponse(data.response || EMPTY_RESPONSE);
    } catch (error) {
      console.error('Error fetching chat response:', error);
      setResponse(EMPTY_RESPONSE);
    } finally {
      setLoading(false);
    }
  };

  const resetResponse = () => setResponse(EMPTY_RESPONSE)

  // submit on enter
  const handleSubmitKey: KeyboardEventHandler<HTMLElement> = async (e) => {
    // shift enter is newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)
      await handleSubmit(e); // Submit the form
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef: React.MutableRefObject<HTMLImageElement | null> = useRef<HTMLImageElement | null>(null);

  const showVideo = () => {
    if (videoRef.current) {
      videoRef.current.style.opacity = "1";
      videoRef.current.style.transition = "none";
    } else {
      hideVideo();
    }
  }
  const hideVideo = () => {
    if (videoRef.current) {
      videoRef.current.style.transition = "opacity: 1.5s ease-in-out"; // does not work
      videoRef.current.style.opacity = "0";
    }
  }

  // SubsystemOptions
  const [debugOverlay, setDebugOverlay] = useState(true);
  const [punterDetection, setPunterDetection] = useState(true);
  const [punterVision, setPunterVision] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [autoCalibration, setAutoCalibration] = useState(true);
  const [workflowIcons, setWorkflowIcons] = React.useState(true);

  const [people, setPeople] = useState<Detection[]>([]);

  const tempVc: VisionConsumer[] = [];
  if (punterDetection) {
    tempVc.push(poseConsumer(poseSystem, setPeople));
  }
  // TODO add each consumer based on config

  // @ts-ignore
  const [visionConsumers, setVisionConsumers] = useState<VisionConsumer[]>(tempVc);

  const imageUrl = () => `${portraitBaseUrl!}/${images[imageIndex].f}`;
  return (
      <Box sx={{
        padding: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "end",
        width: "100dvw",
        height: "100dvh"
      }} component="div">

        {images.length > 0 && (
            <Portrait videoRef={videoRef} imgRef={imgRef} videoSrc={undefined} src={imageUrl()}
                      hideVideo={hideVideo}/>)
        }
        <SystemPanel appTitle="Loquacious" images={images} setImageIndex={setImageIndex} imageIndex={imageIndex}
                     serverPort={SERVER_PORT} poseSystem={poseSystem} imgRef={imgRef}
                     resetResponse={resetResponse} dimension={dimension}
                     punterDetection={punterDetection} setPunterDetection={setPunterDetection}
                     debugOverlay={debugOverlay} setDebugOverlay={setDebugOverlay}
                     showChat={showChat} setShowChat={setShowChat}
                     punterVision={punterVision} setPunterVision={setPunterVision}
                     autoCalibration={autoCalibration} setAutoCalibration={setAutoCalibration}
                     workflowIcons={workflowIcons} setWorkflowIcons={setWorkflowIcons}
        />
        {loading && <Spinner/>}
        <Box sx={{
          position: "absolute",
          width: "100%",
          zIndex: 200,
          maxHeight: "36em",
          bottom: 0,
          left: 0,
          overflow: "clip"
        }}>
          <CompResponse response={response} loading={loading} videoRef={videoRef} showVideo={showVideo}
                        hideVideo={hideVideo} showChat={showChat}/>

          {(punterDetection && debugOverlay && <PunterDetectIcons people={people}/>)}

          <VideoCamera consumers={visionConsumers}/>

          <Box component="form" sx={{
            position: "sticky",
            bottom: 0,
            left: 0,
            zIndex: 100
          }}>
            {showChat && <ChatInputComponent inputRef={inputRef} prompt={prompt} loading={loading}
                                             handleSubmitKey={handleSubmitKey} setPrompt={setPrompt}/>}

          </Box>
        </Box>
      </Box>
  );
};

export default App;