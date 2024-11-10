import {PoseSystem} from "./PoseSystem.ts";
import React, {useRef} from "react";
import {Box, Checkbox, Tooltip} from "@mui/material";
import {
  BugReport,
  BugReportOutlined,
  Diversity2,
  Diversity2Outlined,
  Face3,
  Face3Outlined,
  Person,
  PersonOff,
  SensorOccupied,
  SensorOccupiedOutlined,
  Sensors,
  SensorsOff,
  SpeakerNotes,
  SpeakerNotesOff
} from "@mui/icons-material";
import {InputHandler, StateSetter} from "./Utils.ts";


const bindCheckbox =
    (setter: StateSetter<boolean>): InputHandler =>
        async (e) => setter(e.target.checked);

/**
 * Options - boolean React States - with their {@link StateSetter StateSetters}.
 */
interface SubsystemOptions {
  punterDetection: boolean;
  setPunterDetection: StateSetter<boolean>;
  debugOverlay: boolean;
  setDebugOverlay: StateSetter<boolean>;
  showChat: boolean;
  setShowChat: StateSetter<boolean>;
  punterVision: boolean;
  setPunterVision: StateSetter<boolean>;
  autoCalibration: boolean;
  setAutoCalibration: StateSetter<boolean>;
  workflowIcons: boolean;
  setWorkflowIcons: StateSetter<boolean>;
}

interface SubsystemControlsProps extends SubsystemOptions {
  poseSystem: PoseSystem,
  imgRef: React.MutableRefObject<HTMLImageElement | null>,
}

/**
 * Controls for turning on or off subsystem capabilities.
 *
 * @param poseSystem to control the generation of face detection
 * @param imgRef reference to the portrait
 * @param punterDetection whether the approach of a user in camera should trigger mode transitions
 * @param setPunterDetection setter for punterDetection
 * @param debugOverlay whether developer-level detail info is shown on screen
 * @param setDebugOverlay setter for debugOverlay
 * @param showChat whether to show text chat
 * @param setShowChat setter for showChat
 * @param punterVision whether to use vision model to reason about detected users
 * @param setPunterVision setter for punterVision
 * @param autoCalibration whether to automatically tune vision-based mode transition trigger conditions
 * @param setAutoCalibration setter for autoCalibration
 * @param workflowIcons whether to show "sigils" indicating state of orchestration workflow
 * @param setWorkflowIcons setter for workflowIcons
 */
function SubsystemControls({
                             poseSystem,
                             imgRef,
                             punterDetection, setPunterDetection,
                             debugOverlay, setDebugOverlay,
                             showChat, setShowChat,
                             punterVision, setPunterVision,
                             autoCalibration, setAutoCalibration,
                             workflowIcons, setWorkflowIcons,
                           }: SubsystemControlsProps) {

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [portraitAnalysis, setPortraitAnalysis] = React.useState(false);
  const handlePortraitCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (imgRef.current) {
      const canvasZIndex = parseInt(imgRef.current.style.zIndex, 10) + 1;
      setPortraitAnalysis(e.target.checked);
      if (canvasRef.current) {
        poseSystem.resetCanvas();
        canvasRef.current = null;
      } else {
        canvasRef.current = await poseSystem.attachFaceToImage(imgRef.current, canvasZIndex);
      }
    }
  }
  return <Box alignSelf="end">
    <Tooltip title="Workflow Sigils">
      <Checkbox checked={workflowIcons} color="secondary"
                icon={<Diversity2Outlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Diversity2/>} onChange={bindCheckbox(setWorkflowIcons)}/>
    </Tooltip>
    <Tooltip title="Text Chat">
      <Checkbox checked={showChat} color="secondary"
                icon={<SpeakerNotesOff/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<SpeakerNotes/>} onChange={bindCheckbox(setShowChat)}/>
    </Tooltip>
    <Tooltip title="Debug Overlay">
      <Checkbox checked={debugOverlay} color="secondary"
                icon={<BugReportOutlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<BugReport/>} onChange={bindCheckbox(setDebugOverlay)}/>
    </Tooltip>
    <Tooltip title="Auto Calibration">
      <Checkbox checked={autoCalibration} color="secondary"
                icon={<SensorsOff/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Sensors/>} onChange={bindCheckbox(setAutoCalibration)}/>
    </Tooltip>
    <Tooltip title="Punter Detection">
      <Checkbox checked={punterDetection} color="secondary"
                icon={<SensorOccupiedOutlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<SensorOccupied/>} onChange={bindCheckbox(setPunterDetection)}/>
    </Tooltip>
    <Tooltip title="Punter Vision">
      <Checkbox checked={punterVision} color="secondary"
                icon={<PersonOff/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Person/>} onChange={bindCheckbox(setPunterVision)}/>
    </Tooltip>
    <Tooltip title="Self-Portrait Analysis">
      <Checkbox checked={portraitAnalysis} color="secondary"
                icon={<Face3Outlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Face3/>} onChange={handlePortraitCheck}/>
    </Tooltip>
  </Box>
}

export {type SubsystemOptions, type SubsystemControlsProps, SubsystemControls};