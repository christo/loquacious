import {
  AccountTree,
  ArrowCircleLeft,
  ArrowCircleRight,
  AspectRatio,
  Campaign,
  Close,
  Error, Face3,
  Memory, Mic,
  MonitorHeart, Portrait,
  QuestionAnswer, RemoveRedEye,
  School,
  Settings,
  type SvgIconComponent
} from "@mui/icons-material";
import {Box, Button, Chip, IconButton, Stack, SwipeableDrawer, Tooltip, Typography} from "@mui/material";
import React, {type ReactNode, useEffect, useState} from "react";
import  {type ImageInfo} from "../server/src/image/ImageInfo.ts";
import type {HealthError, System} from "./types.ts";

function ShowError({error}: { error: HealthError }) {
  return (<Typography color="error"><Error fontSize="large"/>{error.message}</Typography>);
}

interface SettingsProps {
  images: ImageInfo[];
  imageIndex: number;
  serverPort: number;
  setImageIndex: (i: number) => void;
}

function SpeechSettings({speechSettings}: any) {
  return <Box>
    <IconLabelled TheIcon={Campaign} tooltip="Speech System">
      <Typography>{speechSettings.current.system} {speechSettings.current.optionName}</Typography>
    </IconLabelled>
  </Box>;
}

function IconLabelled({TheIcon, tooltip, children}: {
  TheIcon: SvgIconComponent,
  tooltip: string,
  children: ReactNode
}): ReactNode {
  return <Stack direction="row" alignItems="center" spacing={1}>
    <Tooltip title={tooltip}><TheIcon fontSize="small" sx={{mr: 1}}/></Tooltip>
    <Box sx={{display: "flex", flexDirection: "row", alignItems: "center"}}>{children}</Box>
  </Stack>
}

function SettingsDetail({system}: { system: System}) {
  function modelist() {
    const currentMode = system.mode.current;
    return system.mode.options.map((m: string) => {
      return <Chip key={`mode_${m}`} label={m} size="small" variant={m === currentMode ? "filled" : "outlined"}
                   sx={{mr: 1}}/>
    });
  }

  if (system === null) {
    return "";
  } else {
    return <Box sx={{display: "flex", flexDirection: "column", alignItems: "start", width: "100%", gap: 1}}>
      <IconLabelled TheIcon={Mic} tooltip="Speech to Text">Unimplemented</IconLabelled>
      <IconLabelled TheIcon={RemoveRedEye} tooltip="Vision System">Unimplemented</IconLabelled>
      <IconLabelled TheIcon={Face3} tooltip="Self-image">Unimplemented</IconLabelled>
      <IconLabelled TheIcon={AccountTree} tooltip="Interaction Modes">{modelist()}</IconLabelled>
      <IconLabelled TheIcon={QuestionAnswer}
                    tooltip="LLM">{system.llmMain.name} (models: {system.llmMain.models.length})</IconLabelled>
      <IconLabelled TheIcon={School} tooltip="Model">
        <Typography>{system.llmMain.currentModel}</Typography>
      </IconLabelled>
      <SpeechSettings speechSettings={system.speech}/>
      <IconLabelled TheIcon={Portrait} tooltip="Lip Sync System">
        {system.lipsync.current}
      </IconLabelled>
    </Box>
  }
}

function Status({system}: { system: System }) {
  if (system == null) {
    return <p>...</p>
  } else {
    const health = system.health;
    return (<Box sx={{display: "flex", flexDirection: "column", alignItems: "start", width: "100%", gap: 1}}>
      {health.error ? <ShowError error={health.error}/> : ""}
      <IconLabelled TheIcon={MonitorHeart} tooltip="Health">{health.message || "Health unknown"}</IconLabelled>
      <IconLabelled TheIcon={Memory} tooltip="System RAM">
        {health.freeMem.formatted} free of {health.totalMem.formatted}
      </IconLabelled>
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
  const portraitWidth = images[imageIndex].w;
  const portraitHeight = images[imageIndex].h;
  return <Box sx={{display: "flex", flexDirection: "column", gap: 1}}>
    <Box sx={{display: "flex", gap: 2, alignItems: "center"}}>
      <IconButton aria-label="previous" size="large" onClick={imgShift(-1)}>
        <ArrowCircleLeft fontSize="inherit"/>
      </IconButton>
      <Typography fontWeight="700">Portrait {imageIndex + 1} of {images.length}</Typography>
      <IconButton aria-label="next" size="large" onClick={imgShift(1)}>
        <ArrowCircleRight fontSize="inherit"/>
      </IconButton>
    </Box>
    <Box>
      <IconLabelled TheIcon={AspectRatio} tooltip="Character Portrait Dimensions">
        {portraitWidth} x {portraitHeight}
      </IconLabelled>
    </Box>
  </Box>
}

function SessionControl() {
  return <Button onClick={() => {console.log("new session")}}>New Session</Button>;
}

function SettingsPanel({images, imageIndex, setImageIndex, serverPort}: SettingsProps) {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    try {
      fetch(`//${location.hostname}:${serverPort}/system`).then(result => {
        result.json().then(data => {
          setSettings(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  return <Box
    sx={{pt: 0, pl: 2, pr: 2, display: "flex", flexDirection: "column", width: "100%", gap: 1, alignItems: "left"}}>
    <Typography variant="h4">Loquacious</Typography>
    {images?.length > 0 && <ImageChooser images={images} imageIndex={imageIndex} setImageIndex={setImageIndex} serverPort={serverPort}/>}
    <SettingsDetail system={settings}/>
    <Status system={settings}/>
    <SessionControl/>
  </Box>
}

interface SystemPanelProps {
  images: ImageInfo[],
  setImageIndex: (value: (((prevState: number) => number) | number)) => void,
  imageIndex: number,
  serverPort: number
}

export function SystemPanel({images, setImageIndex, imageIndex, serverPort}: SystemPanelProps) {
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
  return <Box sx={{position: "absolute", top: 0, left: 0, p: 0, m: 2, zIndex: 200}}>
    <IconButton aria-label="settings" size="large" onClick={toggleDrawer(true)}>
      <Settings fontSize="inherit" sx={{opacity: 0.2}}/>
    </IconButton>
    <SwipeableDrawer sx={{opacity: 0.9, m: 0}} open={drawerOpen} onClose={toggleDrawer(false)}
                     onOpen={toggleDrawer(false)}>
      <Close sx={{mt: 1, mr: 1, ml: "auto", cursor: "pointer"}} onClick={toggleDrawer(false)}/>
      <SettingsPanel images={images} imageIndex={imageIndex} setImageIndex={setImageIndex} serverPort={serverPort}/>
    </SwipeableDrawer>
  </Box>
}