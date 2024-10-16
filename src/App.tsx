import {ArrowCircleLeft, ArrowCircleRight, Error, QuestionAnswer, School, Settings} from "@mui/icons-material";
import {Box, Drawer, IconButton, Typography} from "@mui/material";
import {marked} from 'marked';
import OpenAI from "openai";
import React, {useEffect, useState} from 'react';
import "./App.css";
import type {HealthError, System} from "./types";
import Model = OpenAI.Model;

type ChatResponse = {
  message: string | undefined;
  speech: string | undefined;
  backend: string | undefined;
  model: Model | undefined;
}

const responseError = (e: any): ChatResponse => ({
  message: `Error fetching response: ${e}`,
  speech: undefined,
  backend: undefined,
  model: undefined,
});

const RESPONSE_NULL: ChatResponse = {
  message: "",
  speech: undefined,
  backend: undefined,
  model: undefined,
}

const RESPONSE_NONE: ChatResponse = {
  message: "No response from LLM",
  speech: undefined,
  backend: undefined,
  model: undefined,
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

  return <Box sx={{display: "flex", gap: 2, mt: 2, alignItems: "center"}}>
    <IconButton aria-label="previous" size="large" onClick={imgShift(-1)}>
      <ArrowCircleLeft fontSize="inherit"/>
    </IconButton>
    <Typography fontWeight="700">{imageIndex + 1} of {images.length}</Typography>
    <IconButton aria-label="next" size="large" onClick={imgShift(1)}>
      <ArrowCircleRight fontSize="inherit"/>
    </IconButton>
  </Box>
}

interface SettingsProps {
  images: string[];
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

function Portrait({src}: { src: string }) {
  return <img alt="portrait of a fortune teller" width="100%" className="seer" src={src}/>
}

function CompResponse({response, loading}: { response: ChatResponse, loading: boolean }) {
  const speech = response.speech;

  useEffect(() => {
    if (speech) {
      const url = `http://localhost:3001/audio?file=${speech}`;
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw "network response for audio was crap";
          } else {
            return response.blob();
          }
        })
        .then(blob => {
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.play();
        })
        .catch(error => {
          console.error('Fetch-o-Error:', error);
        });
    }
  })

  return <Box className="controls">
    {(
      loading ?
        <Typography>Loading...</Typography>
        : response === RESPONSE_NULL || !response
          ? ""
          : (<Box>
              <Typography variant="body2" color="textSecondary">{speech}</Typography>
              <Typography dangerouslySetInnerHTML={{__html: markdownResponse(response.message)}}/>
            </Box>
          )
    )}
  </Box>;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<ChatResponse>(RESPONSE_NULL);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

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

  const [imageIndex, setImageIndex] = useState(34);

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
      setResponse(data.response || RESPONSE_NONE);
    } catch (error) {
      console.error('Error fetching chat response:', error);
      setResponse(responseError(error));
    } finally {
      setLoading(false);
    }
  };

  // submit on enter
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  return (
    <Box className="primary" component="div">
      <Box sx={{m: 2, position: "absolute", top: 0, left: 0, p: 0}}>
        <IconButton aria-label="delete" size="large" onClick={toggleDrawer(true)}>
          <Settings fontSize="inherit" sx={{opacity: 0.2}}/>
        </IconButton>
        <Drawer sx={{opacity: 0.9}} open={drawerOpen} onClose={toggleDrawer(false)}>
          <SettingsPanel images={images} imageIndex={imageIndex} setImageIndex={setImageIndex}/>
        </Drawer>

      </Box>
      {images.length > 0 && (<Portrait src={`/img/${images[imageIndex]}`}/>)}
      <Box id="promptInput">
        <form id="prompt">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={10}
          cols={80}
          placeholder="welcome, seeker"
        />
        </form>
        <CompResponse response={response} loading={loading}/>
      </Box>

    </Box>
  );
};

export default App;