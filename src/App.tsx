import {Box} from "@mui/material";
import React, {type MutableRefObject, useEffect, useRef, useState} from 'react';
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
import {io} from "socket.io-client";
import {WorkflowStep} from "../server/src/system/WorkflowStep.ts";
import {Sigils} from "./Sigils.tsx";

let APP_TITLE ="Loquacious";

const DEFAULT_PORTRAIT = 16;
const SERVER_PORT = 3001;
const poseSystem = new PoseSystem();

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
 * @param response from server
 * @param videoRef ref to animation video element
 * @param hideVideo function to hide video, revealing portrait image
 * @param showVideo function to reveal and play video
 * @param showChat whether or not to show chat
 */
function CompResponse({response, videoRef, hideVideo, showVideo, showChat}: CompResponseProps) {
  const video = response.lipsync?.videoPath;
  const speech = response.speech;
  const fetchMedia = (av: "audio" | "video", handleBlob: (blob: Blob) => void) => {
    const url = `//${location.hostname}:${SERVER_PORT}/${av}?file=${video}`;
    fetch(url).then(response => {
      if (!response.ok) {
        throw `${av} network response status ${response.status}`;
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
          const audio = new Audio(URL.createObjectURL(blob));
          audio.play().catch(reason => {
            console.error("Audio play failure", reason)
          });
        });
      } else if (response.llm) {
        console.log("no speech or video in response");
      }
    }
  }, [response]);
  if (showChat) {
    return <ChatContainer messages={response.messages}/>;
  } else {
    return null;
  }
}

;

const EMPTY_RESPONSE: ChatResponse = {
  messages: [],
  speech: undefined,
  llm: undefined,
  model: undefined,
  lipsync: undefined,
};

const App: React.FC = () => {

  const [workflow, setWorkflow] = useState<WorkflowStep>("idle");
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {

    const socket = io("ws://localhost:3002");
    socket.on("connect", () => {
      setSocketConnected(true);
      console.log(`socket connect id ${socket!.id}`);
    });
    socket.on("disconnect", () => {
      setSocketConnected(false);
      console.log(`socket DISconnect`);
    });
    socket.on("connect_error", (error) => {
      setSocketConnected(socket.active);
      if (socket.active) {
        //console.log(`socket ${socket.id} connect error, not dead yet`);
      } else {
        console.log(`socket connection denied by server, requires manual reconnection: ${error.message}`);
      }
    });
    socket.on("workflow", (args: any) => {
      setSocketConnected(true);
      setWorkflow(args as WorkflowStep);
    });
    socket.on("loq_error", (args: any) => {
      setWorkflow("idle");
      console.log(`loq error ${args}`);
    });

  }, []);

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
      // no prompt, do nothing
      return;
    }
    // clear the face overlay before video plays
    poseSystem.resetCanvas();
    const anticipatedMessg = new Message(-1, new Date(), prompt, -1, true);
    const anticipatedResponse: ChatResponse = {
      messages: [...response.messages, anticipatedMessg],
      speech: undefined,
      llm: undefined,
      model: undefined,
      lipsync: undefined,
    };
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

  const resetResponse = () => setResponse(EMPTY_RESPONSE);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef: React.MutableRefObject<HTMLImageElement | null> = useRef<HTMLImageElement | null>(null);

  const showVideo = () => {
    if (videoRef.current) {
      videoRef.current.style.opacity = "1";
      videoRef.current.style.transition = "none";
    } else {
      hideVideo();
    }
  };
  const hideVideo = () => {
    if (videoRef.current) {
      videoRef.current.style.transition = "opacity: 1.5s ease-in-out"; // TODO why not works!
      videoRef.current.style.opacity = "0";
    }
    setWorkflow("idle");
  };

  // SubsystemOptions
  const [debugOverlay, setDebugOverlay] = useState(true);
  const [punterDetection, setPunterDetection] = useState(true);
  const [punterVision, setPunterVision] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [autoCalibration, setAutoCalibration] = useState(true);
  const [workflowSigils, setWorkflowSigils] = React.useState(true);

  const [people, setPeople] = useState<Detection[]>([]);

  const tempVc: VisionConsumer[] = [];
  if (punterDetection) {
    tempVc.push(poseConsumer(poseSystem, setPeople));
  }
  // TODO add audio level monitor VisionConsumer
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
            <Portrait videoRef={videoRef} imgRef={imgRef} src={imageUrl()} hideVideo={hideVideo}/>)
        }
        <SystemPanel appTitle={APP_TITLE} images={images} setImageIndex={setImageIndex} imageIndex={imageIndex}
                     serverPort={SERVER_PORT} poseSystem={poseSystem} imgRef={imgRef}
                     resetResponse={resetResponse} dimension={dimension}
                     punterDetection={punterDetection} setPunterDetection={setPunterDetection}
                     debugOverlay={debugOverlay} setDebugOverlay={setDebugOverlay}
                     showChat={showChat} setShowChat={setShowChat}
                     punterVision={punterVision} setPunterVision={setPunterVision}
                     autoCalibration={autoCalibration} setAutoCalibration={setAutoCalibration}
                     workflowIcons={workflowSigils} setWorkflowIcons={setWorkflowSigils}
        />
        <Sigils workflowSigils={workflowSigils} socketConnected={socketConnected} debugOverlay={debugOverlay} workflow={workflow} people={people} loading={loading} punterDetection={punterDetection}/>

        <VideoCamera consumers={visionConsumers}/>
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
          <Box component="form" sx={{
            position: "sticky",
            bottom: 0,
            left: 0,
            zIndex: 100
          }}>
            {showChat && <ChatInputComponent inputRef={inputRef} prompt={prompt} loading={loading}
                                             handleSubmit={handleSubmit} setPrompt={setPrompt}/>}

          </Box>
        </Box>
      </Box>
  );
};

export default App;