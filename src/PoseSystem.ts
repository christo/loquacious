import {
  DrawingUtils,
  FaceLandmarker,
  FilesetResolver,
  PoseLandmarker,
  PoseLandmarkerResult
} from "@mediapipe/tasks-vision";

class PoseSystem {

  private vision: any;
  private canvas: HTMLCanvasElement | null = null;

  async getPoseFromImage(numPoses: 1 | 2) {
    return this.getPose(numPoses, "IMAGE");
  }

  async getPose(numPoses: 1 | 2 = 1, runningMode: "IMAGE" | "VIDEO" = "IMAGE") {
    return await PoseLandmarker.createFromOptions(await this.getVision(), {
      baseOptions: {
        modelAssetPath: `/models/pose_landmarker_heavy.task`,
        delegate: "GPU"
      },
      runningMode: runningMode,
      numPoses: numPoses
    });
  }

  private async getVision() {
    if (!this.vision) {
      this.vision = await FilesetResolver.forVisionTasks("/node_modules/@mediapipe/tasks-vision/wasm");
    }
    return this.vision;
  }

  async getFaceFromImage(numFaces: 1 | 2 = 1) {
    return this.getFace(numFaces, "IMAGE");
  }

  async getFace(numFaces: 1 | 2 = 1, runningMode: "IMAGE" | "VIDEO" = "IMAGE") {
    return await FaceLandmarker.createFromOptions(await this.getVision(), {
      baseOptions: {
        modelAssetPath: `/models/face_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: runningMode,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      numFaces: numFaces,
    });

  }

  async attachFaceToImage(image: HTMLImageElement, zIndex: number): Promise<HTMLCanvasElement> {
    const faceLandmarkerResult = (await this.getFaceFromImage(1)).detect(image);
    this.resetCanvas();
    this.canvas = document.createElement("canvas") as HTMLCanvasElement;
    this.canvas.setAttribute("class", "canvas");
    this.canvas.setAttribute("width", image.naturalWidth + "px");
    this.canvas.setAttribute("height", image.naturalHeight + "px");
    const imstyle = image.computedStyleMap();
    this.canvas.setAttribute("style", `position: absolute;
        left: ${imstyle.get("left")};
        top: ${imstyle.get("top")};
        width: ${imstyle.get("width")};
        height: ${imstyle.get("height")};
        z-index: ${zIndex};
        object-fit: ${imstyle.get("object-fit")};
        object-position: ${imstyle.get("object-position")};`)

    image.parentNode!.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    const drawingUtils = new DrawingUtils(ctx!);
    for (const landmarks of faceLandmarkerResult.faceLandmarks) {
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: "#C0C0C070", lineWidth: 1 }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
          { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
          { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
          { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
        color: "#E0E0E0"
      });
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
          { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
          { color: "#30FF30" }
      );
    }
    return this.canvas;
  }


  /**
   * Attaches the standard pose markers to the given image at the given zIndex, calling the given callback
   * with the resulting appended canvas so the caller can remove it whenever.
   * @param image the image to attach to
   * @param zIndex zIndex of the canvas
   * @param callback passed the canvas when complete
   */
  async attachPoseToImage(image: HTMLImageElement, zIndex: number, callback: (c: HTMLCanvasElement) => void) {
    const pm = await this.getPoseFromImage(1);
    pm.detect(image, (result: PoseLandmarkerResult) => {
      this.canvas = document.createElement("canvas");
      this.canvas.setAttribute("width", `${image.width}px`);
      this.canvas.setAttribute("height", `${image.height}px`);
      const imstyle = image.computedStyleMap();
      this.canvas.setAttribute("style", `position: absolute;
        left: ${imstyle.get("left")};
        top: ${imstyle.get("top")};
        width: ${imstyle.get("width")};
        height: ${imstyle.get("height")};
        z-index: ${zIndex};
        object-fit: ${imstyle.get("object-fit")};
        object-position: ${imstyle.get("object-position")};`
      );
      image.parentNode!.appendChild(this.canvas);
      const canvasCtx = this.canvas.getContext("2d");
      const drawingUtils = new DrawingUtils(canvasCtx!);
      for (const landmark of result.landmarks) {
        drawingUtils.drawLandmarks(landmark, {
          radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
        });
        drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
      }
      // TODO rewrite as Promise
      callback(this.canvas);
    });
  }

  resetCanvas() {
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

export {PoseSystem};