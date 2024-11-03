import {
  AccessibilityNew,
  AccessTime,
  AccountTree,
  ArrowCircleLeft,
  ArrowCircleRight,
  AspectRatio,
  Campaign,
  Dns,
  Error,
  Memory,
  Mic,
  MonetizationOn,
  MonitorHeart,
  Portrait,
  QuestionAnswer,
  RecordVoiceOver,
  RemoveRedEye,
  School,
  Settings,
  type SvgIconComponent,
} from "@mui/icons-material";
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  SwipeableDrawer,
  Tooltip,
  Typography
} from "@mui/material";
import React, {type ReactNode, useEffect, useState} from "react";
import {type ImageInfo} from "../server/src/image/ImageInfo.ts";
import type {HealthError, SystemSummary} from "../server/src/types.ts";

type ESet<T> = (value: (((prevState: T) => T) | T)) => void;
type StringSet = ESet<string>;

function ShowError({error}: { error: HealthError }) {
  return (<Typography color="error"><Error fontSize="large"/>{error.message}</Typography>);
}

interface SettingsProps {
  images: ImageInfo[];
  imageIndex: number;
  serverPort: number;
  setImageIndex: (i: number) => void;
  resetResponse: () => void;
}

function IconLabelled({TheIcon, tooltip, children}: {
  TheIcon: SvgIconComponent,
  tooltip: string,
  children: ReactNode
}): ReactNode {
  return <Stack direction="row" alignItems="center" spacing={2}>
    <Tooltip title={tooltip}><TheIcon fontSize="small" sx={{mr: 1}}/></Tooltip>
    <Box sx={{display: "flex", flexDirection: "row", alignItems: "center"}}>{children}</Box>
  </Stack>
}

/**
 * Formats to hh:mm:ss or mm:ss
 * if run is true, increment the time each second
 */
function Duration({ms, className, run = false}: { ms: number, className?: string, run: boolean }) {
  const [elapsed, setElapsed] = useState(ms);
  if (run) {
    useEffect(() => {
      const timer = setInterval(() => {
        setElapsed((prev) => prev + 1000);
      }, 1000);

      return () => clearInterval(timer); // Cleanup interval on component unmount
    }, []);
  }
  className = !className ? "" : className;
  let t = Math.floor(elapsed / 1000);
  const hours = Math.floor(t / 3600);
  t -= hours * 3600;
  const mins = Math.floor(t / 60);
  t -= mins * 60;
  const secs = t;
  const pad = (n: number) => ('0' + n).slice(-2);
  if (hours > 0) {
    return <span className={className}>{pad(hours)}:{pad(mins)}:{pad(secs)}</span>
  } else {
    return <span className={className}>{pad(mins)}:{pad(secs)}</span>;
  }
}

function FreePaid({isFree}: { isFree: boolean }) {
  return isFree ? "" :
      <Tooltip title="Uses Commercial API"><MonetizationOn sx={{ml: 1}} fontSize="small" color="warning"/></Tooltip>;
}

function SettingsSelect({label, value, setValue, options}: {
  label: string,
  value: string,
  setValue: StringSet,
  options: string[]
}) {
  if (!options) {
    throw `no options for ${label}`
  }
  return <FormControl sx={{m: 0, minWidth: 120}} size="small">
    <InputLabel id="mode-select-label" shrink>{label}</InputLabel>
    <Select
        labelId="mode-select-label"
        id="mode-select"
        value={value}
        label="{label}"
        autoWidth
        onChange={(event: SelectChangeEvent) => setValue(event.target.value)}
    >
      {options.map(s => <MenuItem key={`mso_${s}`} value={s}>{s}</MenuItem>)}
    </Select>
  </FormControl>
}

// TODO make a double level control: setting + subsetting

// noinspection JSUnusedLocalSymbols
// @ts-ignore
function ModeButton({mode, currentMode, setCurrentMode}: {mode: string, currentMode: string, setCurrentMode: StringSet}) {
  return <Button
      onClick={() => {setCurrentMode(mode)}}
      size="small"
      color={mode === currentMode ? "secondary" : "primary"}
      variant={mode === currentMode ? "contained" : "outlined"}
      key={`mb_${mode}`}>{mode}</Button>
}

function SettingsForm({system}: { system: SystemSummary }) {

  if (system === null) {
    return "";
  } else {
    const [currentMode, setCurrentMode] = useState(system.mode.current)
    const [currentLlm, setCurrentLlm] = useState(system.llm.current);
    const [currentModel, setCurrentModel] = useState(system.llm.currentOption);
    const [currentTts, setCurrentTts] = useState(system.tts.current);
    const [currentVoice, setCurrentVoice] = useState(system.tts.currentOption.optionName);
    const [lipSync, setLipSync] = useState(system.lipsync.current);
    const [currentPoseSystem, setCurrentPoseSystem] = useState(system.pose.current);
    const [currentStt, setCurrentStt] = useState(system.stt.current);
    const [currentVision, setCurrentVision] = useState(system.vision.current);
    // TODO type has a date, but via JSON are these parsed automatically?
    const uptime = Date.now() - Date.parse(system.runtime.run.created);
    return <Stack spacing={2}>
      <IconLabelled TheIcon={AccountTree} tooltip="Interaction Modes">

        {/*TODO */}
        <ButtonGroup variant="outlined" aria-label="Basic button group">
          <SettingsSelect label={"Mode"} value={currentMode} setValue={setCurrentMode} options={system.mode.all}/>
        </ButtonGroup>

      </IconLabelled>

      <IconLabelled TheIcon={Mic} tooltip="Speech to Text">
        <SettingsSelect label={"STT"} value={currentStt} setValue={setCurrentStt}
                        options={system.stt.all}/>
      </IconLabelled>

      {/*<IconLabelled TheIcon={Videocam} tooltip="Camera Input"><i>In progress</i></IconLabelled>*/}

      <IconLabelled TheIcon={RemoveRedEye} tooltip="Vision System">
        <SettingsSelect label={"Vision"} value={currentVision} setValue={setCurrentVision}
                        options={system.vision.all}/>
      </IconLabelled>
      {/*<IconLabelled TheIcon={Face3} tooltip="Self-image"><i>Unimplemented</i></IconLabelled>*/}

      <IconLabelled TheIcon={AccessibilityNew} tooltip="Motion Capture">
        <SettingsSelect label="MoCap" value={currentPoseSystem} setValue={setCurrentPoseSystem}
                        options={system.pose.all}/>
      </IconLabelled>

      <IconLabelled TheIcon={QuestionAnswer} tooltip="LLM">
        <SettingsSelect label="LLM" value={currentLlm} setValue={setCurrentLlm} options={system.llm.all}/>
        <FreePaid isFree={system.llm.isFree}/>
      </IconLabelled>
      <IconLabelled TheIcon={School} tooltip="Model">
        <SettingsSelect label="Model"
                        value={currentModel}
                        setValue={setCurrentModel}
                        options={system.llm.options.map(m => m.id)}/>
      </IconLabelled>
      <IconLabelled TheIcon={Campaign} tooltip="Speech System">
        <SettingsSelect label="Speech"
                        value={currentTts}
                        setValue={setCurrentTts}
                        options={system.tts.all}/>
        <FreePaid isFree={system.tts.isFree}/>
      </IconLabelled>
      <IconLabelled TheIcon={RecordVoiceOver} tooltip="Voice">
        <SettingsSelect label="Voice"
                        value={currentVoice}
                        setValue={setCurrentVoice}
                        options={system.tts.options.map(sso => sso.optionName)}/>
      </IconLabelled>
      <IconLabelled TheIcon={Portrait} tooltip="Lip Sync Animator">
        {/*TODO add !isFree indicator back*/}
        <SettingsSelect label="Lip Sync" value={lipSync} setValue={setLipSync}
                        options={system.lipsync.all}/>
        <FreePaid isFree={system.lipsync.isFree}/>
      </IconLabelled>

      <Divider/>

      <IconLabelled TheIcon={AccessTime} tooltip="Uptime">
        <Duration ms={uptime} run={true}/>
      </IconLabelled>
      <IconLabelled TheIcon={Dns} tooltip="Deployment">
        {system.runtime.run.deployment.name}
      </IconLabelled>
    </Stack>;
  }
}

function Status({system}: { system: SystemSummary }) {
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

function SessionControl({serverPort, resetResponse}: { serverPort: number, resetResponse: () => void }) {

  const [inFlight, setInFlight] = useState(false);

  const newSession = () => {
    setInFlight(true);
    fetch(`//${location.hostname}:${serverPort}/session`, {
      method: 'PUT',
    }).then(result => {
      result.json().then(_ => {
        setInFlight(false);
        resetResponse();
      });
    });
  }

  return <Button sx={{mt: 2}} disabled={inFlight} variant="outlined" onClick={newSession}>New Session</Button>;
}

function SettingsPanel(props: SettingsProps) {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    try {
      fetch(`//${location.hostname}:${props.serverPort}/system`).then(result => {
        result.json().then(data => {
          setSettings(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  return <Box
      sx={{p: 2, display: "flex", flexDirection: "column", width: "100%", gap: 1, alignItems: "left"}}>
    <Typography variant="h4">loquacious</Typography>
    {props.images?.length > 0 && <ImageChooser {...props} />}
    <SettingsForm system={settings}/>
    <Status system={settings}/>
    <SessionControl serverPort={props.serverPort} resetResponse={props.resetResponse}/>
  </Box>
}

interface SystemPanelProps {
  images: ImageInfo[],
  setImageIndex: (value: (((prevState: number) => number) | number)) => void,
  imageIndex: number,
  serverPort: number,
  resetResponse: () => void,
}

export function SystemPanel({images, setImageIndex, imageIndex, serverPort, resetResponse}: SystemPanelProps) {
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
      <SettingsPanel images={images} imageIndex={imageIndex} setImageIndex={setImageIndex} serverPort={serverPort}
                     resetResponse={resetResponse}/>
    </SwipeableDrawer>
  </Box>
}