import {CircularProgress, Stack} from "@mui/material";
import {Detection} from "@mediapipe/tasks-vision";
import {WorkflowStep} from "../server/src/system/WorkflowStep.ts";
import {Boy} from "@mui/icons-material";
import SvgIcon from "@mui/material/SvgIcon";
import SocketConnectSigil from "./icons/ouroboros-svgrepo-com.svg?react";
import IdleSigil from "./icons/prayer-svgrepo-com.svg?react";
import LlmRequestSigil from "./icons/quill-svgrepo-com.svg?react";
import LlmResponseSigil from "./icons/book-cover-svgrepo-com.svg?react";
import TtsRequestSigil from "./icons/sprout-svgrepo-com.svg?react";
import TtsResponseSigil from "./icons/spoted-flower-svgrepo-com.svg?react";
import LipsyncRequestSigil from "./icons/octopus-svgrepo-com.svg?react";
import LipsyncResponseSigil from "./icons/android-mask-svgrepo-com.svg?react";
import {ReactNode} from "react";

function PunterDetectIcons({people, sx}: { people: Detection[], sx: any }) {
  return <Stack gap={0}>
    {people?.map((_: Detection, i: number) => {
      return <Boy
          key={`dprsn_${i}`}
          color="warning"
          fontSize="large"
          sx={sx}
      />;
    })}
  </Stack>;
}

function ShowSigil(props: {sx: any, sigil: ReactNode}) {
  return <SvgIcon color="warning" viewBox="0 0 512 512" fontSize="large" sx={props.sx}>
    {props.sigil}
  </SvgIcon>
}

function WorkflowIcons({sx, step}: { step: WorkflowStep, sx: any }) {
  const sigilMap: {[keyof: string]: ReactNode} = {
    "idle": <IdleSigil/>,
    "llm_request": <LlmRequestSigil/>,
    "llm_response": <LlmResponseSigil/>,
    "tts_request": <TtsRequestSigil/>,
    "tts_response": <TtsResponseSigil/>,
    "lipsync_request": <LipsyncRequestSigil/>,
    "lipsync_response": <LipsyncResponseSigil/>,
  };

  return <Stack gap={1} sx={{alignItems: "center"}}>
    <ShowSigil sx={sx} sigil={sigilMap[step]}/>
  </Stack>;
}

interface SigilsParams {
  loading: boolean;
  punterDetection: boolean;
  debugOverlay: boolean;
  socketConnected: boolean;
  people: Detection[];
  workflow: WorkflowStep;
  workflowSigils: boolean;
}

/**
 * Region of UI where activity icons appear.
 */
export function Sigils(props: SigilsParams) {
  const shadowColour = "rgba(30, 30, 0, 0.4)";
  const dropShadow = {
    p: 0, m: 1,
    backgroundColor: shadowColour,
    borderRadius: "100%",
    boxShadow: `0 0 10px 10px ${shadowColour}`,
  };
  return <Stack gap={1} alignItems="end" sx={{position: "absolute", top: 50, right: 50, zIndex: 800}}>
    {<CircularProgress size="2rem" color="warning" sx={{opacity: props.loading ? 1.0 : 0, ...dropShadow}}/>}
    {props.socketConnected && <ShowSigil sx={dropShadow} sigil={<SocketConnectSigil/>}/>}
    {props.workflowSigils && <WorkflowIcons step={props.workflow} sx={dropShadow}/>}
    {(props.punterDetection && props.debugOverlay && <PunterDetectIcons people={props.people} sx={dropShadow}/>)}
  </Stack>;
}
