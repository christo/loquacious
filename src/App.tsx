import {ArrowCircleLeft, ArrowCircleRight, Error, QuestionAnswer, School, Settings} from "@mui/icons-material";
import {Box, Drawer, IconButton, Typography} from "@mui/material";
import {marked} from 'marked';
import OpenAI from "openai";
import React, {type MutableRefObject, useEffect, useRef, useState} from 'react';
import "./App.css";
import type {ImageInfo} from "../server/src/ImageInfo.ts";
import type {HealthError, System} from "./types";
import Model = OpenAI.Model;

type ChatResponse = {
  message: string | undefined;
  speech: string | undefined;
  backend: string | undefined;
  model: Model | undefined;
  lipsync: {
    url: string;
    content_type: string;
    file_name: "string";
    file_size: number,
    videoPath: string;
  } | undefined;
}

function markdownResponse(message: string | undefined) {
  if (message) {
    return marked.parse(message);
  } else {
    return "";
  }
}

function ShowError({error}: { error: HealthError }) {
  return (<Typography color="error"><Error fontSize="large"/>{error.message}</Typography>);
}

function SpeechSettings({speechSettings}: any) {
  return <Box>SPEECH: {speechSettings.current.system}/{speechSettings.current.option}</Box>;
}

function SettingsDetail({system}: { system: System }) {
  if (system == null) {
    return "";
  } else {
    return <Box sx={{display: "flex", flexDirection: "column", alignItems: "start"}}>
      <Typography>Mode: {system.mode.current}</Typography>
      {system.mode.options.map((m: string) => (<Typography key={`mode_${m}`}>{m}</Typography>))}
      <Typography><QuestionAnswer
        fontSize="small"/> {system.llmMain.name} (models: {system.llmMain.models.length})</Typography>
      <Typography><School fontSize="small"/> {system.llmMain.models[0].id}</Typography>
      <SpeechSettings speechSettings={system.speech}/>
    </Box>
  }
}

function Status({system}: { system: System }) {
  if (system == null) {
    return <p>...</p>
  } else {
    const health = system.health;
    return (<Box>
      {health.error ? <ShowError error={health.error}/> : ""}
      <p>{health.message}</p>
      <p>{health.freeMem.formatted} RAM unused</p>
      <p>{health.totalMem.formatted} total</p>
    </Box>);
  }
}

function ImageChooser({images, imageIndex, setImageIndex}: SettingsProps) {
  const imgShift = (delta: number) => {
    return () => {
      if (images.length === 0) {
        return;
      }
      let newValue = (imageIndex + delta + images.length) % images.length;
      setImageIndex(newValue);
    };
  }

  return <Box sx={{display: "flex", flexDirection: "column", gap: 1}}>
    <Box sx={{display: "flex", gap: 2, mt: 2, alignItems: "center"}}>
      <IconButton aria-label="previous" size="large" onClick={imgShift(-1)}>
        <ArrowCircleLeft fontSize="inherit"/>
      </IconButton>
      <Typography fontWeight="700">Image {imageIndex + 1} of {images.length}</Typography>
      <IconButton aria-label="next" size="large" onClick={imgShift(1)}>
        <ArrowCircleRight fontSize="inherit"/>
      </IconButton>
    </Box>
    <Box>
      <Typography>{images[imageIndex].w} x {images[imageIndex].h}</Typography>
    </Box>
  </Box>
}

interface SettingsProps {
  images: ImageInfo[];
  imageIndex: number;
  setImageIndex: (i: number) => void;
}

function SettingsPanel({images, imageIndex, setImageIndex}: SettingsProps) {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    try {
      fetch("http://localhost:3001/system").then(result => {
        result.json().then(data => {
          setSettings(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  return <Box sx={{p: 2, display: "flex", flexDirection: "column", gap: 2, mt: 2, alignItems: "center"}}>
    <Typography variant="h4">Settings</Typography>
    <ImageChooser images={images} imageIndex={imageIndex} setImageIndex={setImageIndex}/>
    <SettingsDetail system={settings}/>
    <Typography variant="h4">System</Typography>
    <Status system={settings}/>
  </Box>
}

function Portrait({src, imgRef, videoRef, videoSrc}: { src: string, imgRef: MutableRefObject<HTMLImageElement | null>, videoRef: MutableRefObject<HTMLVideoElement | null>, videoSrc: string | undefined }) {

  return <Box className="portraitContainer">
    <video className="portrait" ref={videoRef} src={videoSrc} preload="auto"/>
    <img className="portrait" ref={imgRef} alt="portrait of a fortune teller" width="100%" src={src}/>
  </Box>

}

type CompResponseProps = {
  response: ChatResponse,
  loading: boolean,
  videoRef: MutableRefObject<HTMLVideoElement | null>,
  hideVideo: () => void;
  showVideo: () => void;
}

function CompResponse({response, loading, videoRef, hideVideo, showVideo}: CompResponseProps) {
  const video = response.lipsync?.videoPath;

  useEffect(() => {
    if (video) {
      const url = `http://localhost:3001/video?file=${video}`;
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw "network response for audio was crap";
          } else {
            return response.blob();
          }
        })
        .then(blob => {

          console.log(`got blob size ${blob.size}`);
          videoRef.current!.src = URL.createObjectURL(blob);
          showVideo();
          videoRef.current!.play().then(() => {
            hideVideo();
          });
        })
        .catch(error => {
          console.error('Fetch-o-Error:', error);
        });
    } else {
      hideVideo();
    }
  })

  return <Box className="controls">
    {(
      loading ?
        <Typography>Loading...</Typography>
        : !response
          ? ""
          : (<Box>
              <Typography dangerouslySetInnerHTML={{__html: markdownResponse(response.message)}}/>
            </Box>
          )
    )}
  </Box>;
}


const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<ChatResponse>({} as ChatResponse);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);

  useEffect(() => {
    try {
      fetch("http://localhost:3001/portraits").then(result => {
        result.json().then(data => {
          setImages(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }

  }, []);

  const [imageIndex, setImageIndex] = useState(49);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }
    setLoading(true);

    try {
      const result = await fetch('http://localhost:3001/api/chat', {
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
      setResponse(data.response || {} as ChatResponse);
    } catch (error) {
      // TODO signal error in frontend
      console.error('Error fetching chat response:', error);
      setResponse({} as ChatResponse);
    } finally {
      setLoading(false);
    }
  };

  // submit on enter
  const handleSubmitKey = async (e: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)

      await handleSubmit(); // Submit the form
    }
  };

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setDrawerOpen(newOpen);
  };

  // ESC toggles drawer
  useEffect(() => {
    let handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrawerOpen((o: boolean) => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

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

  return (
    <Box className="primary" component="div">
      {images.length > 0 && (<Portrait videoRef={videoRef} imgRef={imgRef} videoSrc={undefined} src={`/img/${images[imageIndex].f}`}/>)}
      <Box sx={{m: 2, position: "absolute", top: 0, left: 0, p: 0, zIndex: 200}}>
        <IconButton aria-label="delete" size="large" onClick={toggleDrawer(true)}>
          <Settings fontSize="inherit" sx={{opacity: 0.2}}/>
        </IconButton>
        <Drawer sx={{opacity: 0.9}} open={drawerOpen} onClose={toggleDrawer(false)}>
          <SettingsPanel images={images} imageIndex={imageIndex} setImageIndex={setImageIndex}/>
        </Drawer>

      </Box>
      <Box id="promptInput" sx={{zIndex: 200}}>
        <form id="prompt">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleSubmitKey}
          rows={10}
          cols={80}
          placeholder="welcome, seeker"

        />
        </form>
        <CompResponse response={response} loading={loading} videoRef={videoRef} showVideo={showVideo} hideVideo={hideVideo}/>
      </Box>
      {/*<Button aria-label="img" size="large" onClick={imgRef.current?.style.}>*/}
      {/*  <Settings fontSize="inherit" sx={{opacity: 0.2}}/>*/}
      {/*</Button>*/}
    </Box>
  );
};

export default App;