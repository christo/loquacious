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

/**
 * Controls for turning on or off subsystem capabilities.
 *
 * @param poseSystem to control the generation of face detection
 * @param imgRef reference to the portrait
 */
export function SubsystemControls({poseSystem, imgRef}: {
  poseSystem: PoseSystem,
  imgRef: React.MutableRefObject<HTMLImageElement | null>,
}) {

  const [workflowIcons, setWorkflowIcons] = React.useState(false);
  const [textChat, setTextChat] = React.useState(false);
  const [debugOverlay, setDebugOverlay] = React.useState(false);
  const [portraitAnalysis, setPortraitAnalysis] = React.useState(false);
  const [punterDetector, setPunterDetector] = React.useState(false);
  const [punterVision, setPunterVision] = React.useState(false);
  const [autoCalibration, setAutoCalibration] = React.useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleWorkflowIconsCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkflowIcons(e.target.checked);
    // TODO turn on workflow icons:
    //  * add esoteric svg icons vertically down the RHS of the page indicating which stages of the ai orchestration
    //    have completed
  }
  const handleTextChatCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextChat(e.target.checked);
    // TODO make shit happen
  }
  const handleDebugCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebugOverlay(e.target.checked);
    // TODO make shit happen
  }
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
  const handlePunterDetectorCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPunterDetector(e.target.checked);
    // TODO make shit happen
  }
  const handlePunterVisionCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPunterVision(e.target.checked);
    // TODO make shit happen
  }
  const handleAutoCalibrationCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoCalibration(e.target.checked);
    // TODO make shit happen
  }

  return <Box alignSelf="end">
    <Tooltip title="Workflow Sigils">
      <Checkbox checked={workflowIcons} color="success"
                icon={<Diversity2Outlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Diversity2/>} onChange={handleWorkflowIconsCheck}/>
    </Tooltip>
    <Tooltip title="Text Chat">
      <Checkbox checked={textChat} color="success"
                icon={<SpeakerNotesOff/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<SpeakerNotes/>} onChange={handleTextChatCheck}/>
    </Tooltip>
    <Tooltip title="Debug Overlay">
      <Checkbox checked={debugOverlay} color="success"
                icon={<BugReportOutlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<BugReport/>} onChange={handleDebugCheck}/>
    </Tooltip>
    <Tooltip title="Auto Calibration">
      <Checkbox checked={autoCalibration} color="success"
                icon={<SensorsOff/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Sensors/>} onChange={handleAutoCalibrationCheck}/>
    </Tooltip>
    <Tooltip title="Punter Detection">
      <Checkbox checked={punterDetector} color="success"
                icon={<SensorOccupiedOutlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<SensorOccupied/>} onChange={handlePunterDetectorCheck}/>
    </Tooltip>
    <Tooltip title="Punter Vision">
      <Checkbox checked={punterVision} color="success"
                icon={<PersonOff/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Person/>} onChange={handlePunterVisionCheck}/>
    </Tooltip>
    <Tooltip title="Self-Portrait Analysis">
      <Checkbox checked={portraitAnalysis} color="success"
                icon={<Face3Outlined/>} inputProps={{'aria-label': 'controlled'}}
                checkedIcon={<Face3/>} onChange={handlePortraitCheck}/>
    </Tooltip>
  </Box>
}