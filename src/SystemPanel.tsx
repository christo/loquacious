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
import React, {MouseEventHandler, MutableRefObject, type ReactNode, useEffect, useRef, useState} from "react";
import {type ImageInfo} from "../server/src/image/ImageInfo.ts";
import {Duration} from "./Duration.tsx";
import {HealthError, SystemSummary} from "../server/src/domain/SystemSummary.ts";
import {Dimension} from "../server/src/image/Dimension";
import {PoseSystem} from "./PoseSystem.ts";

type ESet<T> = (value: T) => void;

function ShowError({error}: { error: HealthError }) {
  return (<Typography color="error"><Error fontSize="large"/>{error.message}</Typography>);
}

interface SettingsProps {
  appTitle: string;
  poseSystem: PoseSystem;
  imgRef: MutableRefObject<HTMLImageElement | null>;
  dimension: Dimension | null;
  images: ImageInfo[];
  imageIndex: number;
  serverPort: number;
  setImageIndex: (i: number) => void;
  resetResponse: () => void;
}

function WithIcon({TheIcon, tooltip, children}: {
  TheIcon: SvgIconComponent,
  tooltip: string,
  children: ReactNode
}): ReactNode {
  return <Stack direction="row" alignItems="center" spacing={2}>
    <Tooltip title={tooltip}><TheIcon fontSize="small" sx={{mr: 1}}/></Tooltip>
    <Box sx={{display: "flex", flexDirection: "row", alignItems: "center"}}>{children}</Box>
  </Stack>
}

function FreePaid({isFree}: { isFree: boolean }) {
  return isFree ? "" :
      <Tooltip title="Uses Commercial API"><MonetizationOn sx={{ml: 1}} fontSize="small" color="warning"/></Tooltip>;
}

function SettingsSelect({label, value, setValue, options}: {
  label: string,
  value: string,
  setValue: ESet<string>,
  options: string[]
}) {
  if (!options) {
    throw `no options for ${label}`
  }

  return <FormControl sx={{m: 0, minWidth: 120}} size="small">
    <InputLabel id={`${label}-select-label`} shrink>{label}</InputLabel>
    <Select
        labelId={`${label}-select-label`}
        id={`${label}-select`}
        value={value}
        variant="outlined"
        label={label}
        autoWidth
        onChange={(event: SelectChangeEvent) => setValue(event.target.value)}
    >
      {options.map(s => <MenuItem key={`mso_${s}`} value={s}>{s}</MenuItem>)}
    </Select>
  </FormControl>
}

function SettingsForm({system, postSettings}: {
  system: SystemSummary,
  postSettings: (kv: { [keyof: string]: string }) => Promise<void>
}) {

  if (system === null) {
    return "";
  } else {
    // we expect all dates to be in default json-serialised iso format
    const uptime = Date.now() - Date.parse(system.runtime.run.created);

    /**
     * Slightly too clever, constructs an update function for posting setting change for the given key
     * and setState function.
     * @param key
     * @return promise for chaining
     */
    const updater = (key: string): (newValue: string) => Promise<void> => {
      return async (newValue: string): Promise<void> => {
        const kv: { [keyof: string]: string } = {};
        kv[key] = newValue;
        return postSettings(kv)
      };
    }

    return <Stack spacing={2}>
      <WithIcon TheIcon={AccountTree} tooltip="Interaction Modes">
        <SettingsSelect
            label={"Mode"}
            value={system.mode.current}
            setValue={updater("mode")}
            options={system.mode.all}/>
      </WithIcon>

      <WithIcon TheIcon={Mic} tooltip="Speech to Text">
        <SettingsSelect
            label={"STT"}
            value={system.stt.current}
            setValue={updater("stt")}
            options={system.stt.all}/>
      </WithIcon>

      {/*<IconLabelled TheIcon={Videocam} tooltip="Camera Input"><i>In progress</i></IconLabelled>*/}

      <WithIcon TheIcon={RemoveRedEye} tooltip="Vision System">
        <SettingsSelect label={"Vision"} value={system.vision.current} setValue={updater("vision")}
                        options={system.vision.all}/>
      </WithIcon>
      {/*<IconLabelled TheIcon={Face3} tooltip="Self-image"><i>Unimplemented</i></IconLabelled>*/}

      <WithIcon TheIcon={AccessibilityNew} tooltip="Motion Capture">
        <SettingsSelect label="Mocap" value={system.pose.current} setValue={updater("pose")}
                        options={system.pose.all}/>
      </WithIcon>

      <WithIcon TheIcon={QuestionAnswer} tooltip="LLM">
        <SettingsSelect
            label="LLM"
            value={system.llm.current}
            setValue={updater("llm")}
            options={system.llm.all}/>
        <FreePaid isFree={system.llm.isFree}/>
      </WithIcon>

      <WithIcon TheIcon={School} tooltip="Model">
        <SettingsSelect label="Model"
                        value={system.llm.currentOption}
                        setValue={updater("llm_option")}
                        options={system.llm.options.map(m => m.id)}/>
      </WithIcon>
      <WithIcon TheIcon={Campaign} tooltip="Speech System">
        <SettingsSelect label="Speech"
                        value={system.tts.current}
                        setValue={updater("tts")}
                        options={system.tts.all}/>
        <FreePaid isFree={system.tts.isFree}/>
      </WithIcon>
      <WithIcon TheIcon={RecordVoiceOver} tooltip="Voice">
        <SettingsSelect label="Voice"
                        value={system.tts.currentOption.optionName}
                        setValue={updater("tts_option")}
                        options={system.tts.options.map(sso => sso.optionName)}/>
      </WithIcon>
      <WithIcon TheIcon={Portrait} tooltip="Lip Sync Animator">
        <SettingsSelect label="Lip Sync" value={system.lipsync.current} setValue={updater("lipsync")}
                        options={system.lipsync.all}/>
        <FreePaid isFree={system.lipsync.isFree}/>
      </WithIcon>

      <Divider/>

      <WithIcon TheIcon={AccessTime} tooltip="Uptime">
        <Duration ms={uptime} run={true}/>
      </WithIcon>
    </Stack>;
  }
}

function ScaleDimension(props: { dimension: Dimension | null }) {
  if (props.dimension) {
    return <Typography>{props.dimension.width} x {props.dimension.height}</Typography>
  } else {
    return null;
  }
}

/**
 * Non-editable status information about the system.
 * @param system
 */
function Status({system}: { system: SystemSummary }) {
  if (system == null) {
    return <p>...</p>
  } else {
    const health = system.health;
    return (<Stack gap={1}>
      <WithIcon TheIcon={Dns} tooltip="Deployment">
        {system.runtime.run.deployment.name}
      </WithIcon>
      {health.error ? <ShowError error={health.error}/> : ""}
      <WithIcon TheIcon={MonitorHeart} tooltip="Health">{health.message || "Health unknown"}</WithIcon>
      <WithIcon TheIcon={Memory} tooltip="System RAM">
        {health.freeMem.formatted} free of {health.totalMem.formatted}
      </WithIcon>
    </Stack>);
  }
}

function PortraitChooser({images, imageIndex, setImageIndex, dimension, poseSystem}: SettingsProps) {
  const imgShift = (delta: number) => {
    return () => {
      if (images.length === 0) {
        return;
      }
      let newValue = (imageIndex + delta + images.length) % images.length;
      setImageIndex(newValue);
      poseSystem.resetCanvas();
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
      <WithIcon TheIcon={AspectRatio} tooltip="Character Portrait Dimensions">
        {portraitWidth} x {portraitHeight} (<ScaleDimension dimension={dimension}/>)
      </WithIcon>
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

function AppTitle(props: { appTitle: string }) {
  return <Typography variant="h4" sx={{
    fontFamily: "\"Cinzel\", cursive",
    fontWeight: 500,
    fontStyle: "normal",
    color: "#ffffff",
    textShadow: "0 0 5px rgba(255, 0, 200, 0.7), 0 0 8px rgba(180, 0, 200, 0.4)",
    letterSpacing: "4pt",
    textAlign: "center",
    fontSize: 30,
  }}>{props.appTitle}</Typography>;
}

function SettingsPanel(props: SettingsProps) {
  const [system, setSystem] = useState<SystemSummary | null>(null);

  function doFetch(init?: RequestInit) {
    try {
      fetch(`//${location.hostname}:${props.serverPort}/system`, init).then(result => {
        result.json().then(data => {
          setSystem(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => doFetch(), []);

  /**
   * Takes a kv-pair object representing a subset of settings changes, e.g. {mode: "invite"}
   * @param partial
   */
  const postSettings = async (partial: { [keyof: string]: string }) => {
    doFetch({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partial)
    });
  }

  return <Stack gap={1} sx={{p: 2}}>
    <AppTitle appTitle={props.appTitle}/>
    {props.images?.length > 0 && <PortraitChooser {...props} />}
    {system && <SettingsForm system={system} postSettings={postSettings}/>}
    {system && <Status system={system}/>}
    <SessionControl serverPort={props.serverPort} resetResponse={props.resetResponse}/>
    <DetectFaceButton poseSystem={props.poseSystem} imgRef={props.imgRef} zIndex={100}/>
  </Stack>
}

function DetectFaceButton({poseSystem, imgRef, zIndex}: {
  poseSystem: PoseSystem,
  imgRef: React.MutableRefObject<HTMLImageElement | null>,
  zIndex: number
}) {

  const [label, setLabel] = useState("Detect Face")

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleClick: MouseEventHandler = async (e) => {
    if (imgRef.current) {
      e.preventDefault();
      if (canvasRef.current) {
        poseSystem.resetCanvas();
        canvasRef.current = null;
        setLabel("Detect Face");
      } else {
        canvasRef.current = await poseSystem.attachFaceToImage(imgRef.current, zIndex);
        setLabel("Face Off");
      }
    }
  }

  return <Button variant="outlined" color="secondary" onClick={handleClick}>{label}</Button>
}

interface SystemPanelProps {
  appTitle: string,
  poseSystem: PoseSystem,
  imgRef: MutableRefObject<HTMLImageElement | null>,
  dimension: Dimension | null,
  images: ImageInfo[],
  setImageIndex: (value: (((prevState: number) => number) | number)) => void,
  imageIndex: number,
  serverPort: number,
  resetResponse: () => void,
}

export function SystemPanel({
                              imgRef,
                              poseSystem,
                              appTitle,
                              images,
                              dimension,
                              setImageIndex,
                              imageIndex,
                              serverPort,
                              resetResponse
                            }: SystemPanelProps) {
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
      <SettingsPanel appTitle={appTitle} images={images} imageIndex={imageIndex} setImageIndex={setImageIndex}
                     serverPort={serverPort} dimension={dimension} poseSystem={poseSystem} imgRef={imgRef}
                     resetResponse={resetResponse}/>
    </SwipeableDrawer>
  </Box>
}