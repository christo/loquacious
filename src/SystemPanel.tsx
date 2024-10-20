import {ArrowCircleLeft, ArrowCircleRight, Error, QuestionAnswer, School, Settings} from "@mui/icons-material";
import {Box, Drawer, IconButton, Typography} from "@mui/material";
import React, {useEffect, useState} from "react";
import type {ImageInfo} from "../server/src/image/ImageInfo.ts";
import type {HealthError, System} from "./types.ts";

function ShowError({error}: { error: HealthError }) {
  return (<Typography color="error"><Error fontSize="large"/>{error.message}</Typography>);
}

interface SettingsProps {
  images: ImageInfo[];
  imageIndex: number;
  setImageIndex: (i: number) => void;
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

interface SystemPanelProps {
  images: ImageInfo[],
  setImageIndex: (value: (((prevState: number) => number) | number)) => void,
  imageIndex: number
}

export function SystemPanel({images, setImageIndex, imageIndex}: SystemPanelProps) {
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
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setDrawerOpen(newOpen);
  };
  return <Box sx={{m: 2, position: "absolute", top: 0, left: 0, p: 0, zIndex: 200}}>
    <IconButton aria-label="settings" size="large" onClick={toggleDrawer(true)}>
      <Settings fontSize="inherit" sx={{opacity: 0.2}}/>
    </IconButton>
    <Drawer sx={{opacity: 0.9}} open={drawerOpen} onClose={toggleDrawer(false)}>
      <SettingsPanel images={images} imageIndex={imageIndex} setImageIndex={setImageIndex}/>
    </Drawer>
  </Box>
}