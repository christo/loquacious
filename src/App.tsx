import {ArrowCircleLeft, ArrowCircleRight, Error, QuestionAnswer, School, Settings} from "@mui/icons-material";
import {Box, Drawer, IconButton, Typography} from "@mui/material";
import {marked} from 'marked';
import React, {useEffect, useState} from 'react';
import "./App.css";

interface ChatResponse {
  message: string;
}

const responseError = (e: any): ChatResponse => ({
  message: `Error fetching response: ${e}`,
});

const RESPONSE_NULL: ChatResponse = {
  message: "",
}

const RESPONSE_NONE: ChatResponse = {
  message: "No response from LLM",
}

function markdownResponse(response: ChatResponse) {
  if (response !== null) {
    return marked.parse(response.message);
  } else {
    return "";
  }
}

type HealthError = {
  code: number,
  message: string;
  type: string;
}

type HealthStatus = {
  freeMem: {
    bytes: number,
    formatted: string,
  },
  totalMem: {
    bytes: number,
    formatted: string,
  },
  error: HealthError | null;
  message: string | null;
} | null;

function ShowError({error}: { error: HealthError }) {
  return (<Typography color="error"><Error fontSize="large"/>{error.message}</Typography>);
}

function SpeechSettings({speechSettings}: any) {
  return <Box>SPEECH: {speechSettings.current.system}/{speechSettings.current.option}</Box>;
}

function SettingsDetail({settings}: {settings: any}) {
  return <Box sx={{display: "flex", flexDirection: "column", alignItems: "start"}}>
    <Typography>Mode: {settings.mode.current}</Typography>
    {settings.mode.options.map((m: string) => (<Typography key={`mode_${m}`}>{m}</Typography>))}
    <Typography><QuestionAnswer fontSize="small"/> {settings.llmMain.name} (models: {settings.llmMain.models.length})</Typography>
    <Typography><School fontSize="small"/> {settings.llmMain.models[0].id}</Typography>
    <SpeechSettings speechSettings={settings.speech}/>
  </Box>
}

function FetchSettings() {
  const [settings, setSettings] = useState<HealthStatus>(null);

  function fetchData() {
    try {
      fetch("http://localhost:3001/settings").then(result => {
        result.json().then(data => {
          setSettings(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, 60000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);


  return settings === null ? "" : (
     <SettingsDetail settings={settings}/>
  );

}

function Status() {
  const [status, setStatus] = useState<HealthStatus>(null);

  function fetchData() {
    try {
      fetch("http://localhost:3001/health", {
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(result => {
        result.json().then(data => {
          setStatus(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, 60000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);


  return status === null ? <p>...</p> : (
    status?.error ? <ShowError error={status.error}/>
      : (
        <Box><p>{status.message}</p>
        <p>{status.freeMem.formatted} RAM unused</p>
        <p>{status.totalMem.formatted} total</p>
        </Box>
      )
  );

}

function ImageChooser({images, imageIndex, setImageIndex}: SettingsProps) {
  const prevSeer = () => {
    if (images.length === 0) return;
    let newValue = (imageIndex - 1 + images.length) % images.length;
    setImageIndex(newValue);
  };
  const nextSeer = () => {
    if (images.length === 0) return;
    let newValue = (imageIndex + 1 + images.length) % images.length;
    setImageIndex(newValue % images.length);
  };
  return <Box sx={{display: "flex", gap: 2, mt: 2, alignItems: "center"}}>
    <IconButton aria-label="previous" size="large" onClick={prevSeer}>
      <ArrowCircleLeft fontSize="inherit"/>
    </IconButton>
    <Typography fontWeight="700">{imageIndex + 1} of {images.length}</Typography>
    <IconButton aria-label="next" size="large" onClick={nextSeer}>
      <ArrowCircleRight fontSize="inherit"/>
    </IconButton>
  </Box>
}

interface SettingsProps {
  images: string[];
  imageIndex: number;
  setImageIndex: (i: number) => void;
}

function SettingsPanel({images, imageIndex, setImageIndex}: SettingsProps ) {

  return <Box sx={{p: 2}}>
    <Status/>
    <Typography variant="h4">Settings</Typography>
    <ImageChooser images={images} imageIndex={imageIndex} setImageIndex={setImageIndex} />
    <FetchSettings/>
  </Box>
}

function Seer({src}: { src: string }) {
  return <img alt="portrait of a fortune teller" width="100%" className="seer" src={src}/>

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

  const [imageIndex, setImageIndex] = useState(37);

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
        body: JSON.stringify({"prompt": prompt}),
      });

      const data = await result.json();
      setResponse(data.response || RESPONSE_NONE);
    } catch (error) {
      console.error('Error fetching response:', error);
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

  const respText = (
    loading ?
      <Typography>Loading...</Typography>
      : response === RESPONSE_NULL
        ? ""
        : <Typography dangerouslySetInnerHTML={{__html: markdownResponse(response)}}/>
  );
  return (
    <Box className="primary">
      <Box sx={{m: 2, position: "absolute", bottom: 0, left: 0, p: 0}}>
        <IconButton aria-label="delete" size="large" onClick={toggleDrawer(true)}>
          <Settings fontSize="inherit" />
        </IconButton>
        <Drawer sx={{opacity: 0.9}}open={drawerOpen} onClose={toggleDrawer(false)}>
          <SettingsPanel images={images} imageIndex={imageIndex} setImageIndex={setImageIndex} />
        </Drawer>

      </Box>
      {images.length > 0 && (<Seer src={`/img/${images[imageIndex]}`}/>)}
      <Box>
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
        <Box className="controls">
          {respText}
        </Box>
      </Box>

    </Box>
  );
};

export default App;