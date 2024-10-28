import {Box, CircularProgress, Typography} from "@mui/material";
import {marked} from 'marked';
import OpenAI from "openai";
import React, {type MutableRefObject, type ReactNode, useEffect, useRef, useState} from 'react';
import "./App.css";
import {Message} from "../server/src/domain/Message.ts";
import {type ImageInfo} from "../server/src/image/ImageInfo.ts";
import {SystemPanel} from "./SystemPanel.tsx";
import Model = OpenAI.Model;

// TODO use current dimensions from server
const DEFAULT_PORTRAIT = 0;
// const BASE_URL_PORTRAIT = "/img/1080x1920";
const BASE_URL_PORTRAIT = "/img/608x800";
const SERVER_PORT = 3001;

type ChatResponse = {
  messages: Message[];
  speech: string | undefined;
  llm: string | undefined;
  model: Model | undefined;
  lipsync: {
    content_type: string;
    file_name: "string";
    file_size: number,
    videoPath: string;
  } | undefined;
}

/**
 * Converts Markdown to HTML.
 * @param markdown
 */
function mdToHtml(markdown: string | undefined) {
  if (markdown) {
    return marked.parse(markdown);
  } else {
    return "";
  }
}

function Portrait({src, imgRef, videoRef, videoSrc, hideVideo}: {
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
  return <Box className="portraitContainer">
    <video className="portrait" ref={videoRef} src={videoSrc} preload="auto"/>
    <img className="portrait" ref={imgRef} alt="portrait of a fortune teller" src={src}/>
  </Box>

}

function renderMessage(m: Message) {
  const sx = {
    fontFamily: '"Libre Baskerville", serif',
    fontWeight: 400,
    fontStyle: "normal"
  };

  if (m.isFromUser) {
    return <Typography sx={sx} key={`ch_${m.id}`} className="chat userchat">{m.content}</Typography>
  } else {
    return <Typography sx={sx} key={`ch_${m.id}`} className="chat systemchat"
                       dangerouslySetInnerHTML={{__html: mdToHtml(m.content)}}/>
  }
}

function ChatHistory({children, messages}: { children: ReactNode, messages: Message[] }) {
  const chatHistory = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (chatHistory.current) {
      chatHistory.current.scrollIntoView({behavior: "smooth", inline: "end"})
    }
  });
  return <Box ref={chatHistory} className="chathistory">
    {messages.map(renderMessage)}
    {children}
  </Box>;
}

type CompResponseProps = {
  response: ChatResponse,
  loading: boolean,
  videoRef: MutableRefObject<HTMLVideoElement | null>,
  hideVideo: () => void;
  showVideo: () => void;
}

function CompResponse({response, videoRef, hideVideo, showVideo}: CompResponseProps) {
  const video = response.lipsync?.videoPath;

  useEffect(() => {
    if (video) {
      const url = `//${location.hostname}:${SERVER_PORT}/video?file=${video}`;
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw "network response for video was crap";
          } else {
            return response.blob();
          }
        }).then(blob => {
        videoRef.current!.src = URL.createObjectURL(blob);
        showVideo();
        // noinspection JSIgnoredPromiseFromCall
        videoRef.current!.play();
      }).catch(error => {
        console.error('Fetch-o-Error:', error);
      });
    } else {
      // may be a success result with no lipsync
      hideVideo();
    }
  }, [response])

  return <Box className="controls">
    <ChatHistory messages={response.messages}>.</ChatHistory>
  </Box>;
}


const App: React.FC = () => {

  const EMPTY_RESPONSE: ChatResponse = {
    messages: [],
    speech: undefined,
    llm: undefined,
    model: undefined,
    lipsync: undefined,
  }

  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<ChatResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);

  useEffect(() => {
    try {
      fetch(`//${location.hostname}:${SERVER_PORT}/portraits`).then(result => {
        result.json().then(data => {
          setImages(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }

  }, []);

  const [imageIndex, setImageIndex] = useState(DEFAULT_PORTRAIT);

  const handleSubmit = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (!prompt.trim()) {
      return;
    }
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
    e.currentTarget.blur();
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
      // TODO signal error in frontend
      console.error('Error fetching chat response:', error);
      setResponse(EMPTY_RESPONSE);
    } finally {
      setLoading(false);
    }
  };

  const resetResponse = () => {
    setResponse(EMPTY_RESPONSE);
  }

  // TODO fix interruptive replay video on keystroke

  // submit on enter
  const handleSubmitKey = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)

      await handleSubmit(e); // Submit the form
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // TODO fade-in and fade out for video show and hide
  const showVideo = () => {
    if (videoRef.current) {
      videoRef.current!.style.visibility = "visible";
    } else {
      hideVideo();
    }
  }
  const hideVideo = () => {
    if (videoRef.current) {
      videoRef.current!.style.visibility = "hidden";
    }
  }
  const imageUrl = () => `${BASE_URL_PORTRAIT}/${images[imageIndex].f}`;
  return (
    <Box className="primary" component="div">
      {images.length > 0 && (
        <Portrait videoRef={videoRef} imgRef={imgRef} videoSrc={undefined} src={imageUrl()} hideVideo={hideVideo}/>)
      }
      <SystemPanel images={images} setImageIndex={setImageIndex} imageIndex={imageIndex} serverPort={SERVER_PORT} resetResponse={resetResponse}/>
      {loading && <CircularProgress size="2rem" color="secondary" className="loadingSpinner"/>}
      <Box className="ui">
        <CompResponse response={response} loading={loading} videoRef={videoRef} showVideo={showVideo}
                      hideVideo={hideVideo}/>
        <Box id="promptInput">
          <form id="prompt">
          <textarea value={prompt} placeholder="Welcome, seeker"
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleSubmitKey} {...{disabled: loading}}
          />
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default App;