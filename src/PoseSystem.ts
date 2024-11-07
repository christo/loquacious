import {
  DrawingUtils,
  FaceLandmarker,
  FilesetResolver,
  PoseLandmarker,
  PoseLandmarkerResult
} from "@mediapipe/tasks-vision";

class PoseSystem {

  /**
   * WasmFileset that holds GPU or CPU inference bundle. Accessed through {@link #getVision()}
   */
  private vision: any;
  private canvas: HTMLCanvasElement | null = null;
  private faceDrawingUtils: DrawingUtils | null = null;

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

  /**
   * Internal lazy-initialising getter for the vision WasmFileset.
   * @private
   */
  private async getVision() {
    if (!this.vision) {
      // vite transforms this module path reference for us
      // TODO confirm this resolves properly in production
      this.vision = await FilesetResolver.forVisionTasks("/node_modules/@mediapipe/tasks-vision/wasm");
    }
    return this.vision;
  }

  async getFaceFromImage(numFaces: 1 | 2 = 1) {
    return this.getFace(numFaces, "IMAGE");
  }

  /** Gets a face landmarker */
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
    const canvas = this.overlayCanvas(image, zIndex);

    image.parentNode!.appendChild(canvas);
    // TODO use setOption to use GPU context - see jsdoc for DrawingUtils
    const drawingUtils = new DrawingUtils((canvas.getContext("2d"))!);
    for (const landmarks of faceLandmarkerResult.faceLandmarks) {
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          {color: "rgba(114,192,58,0.71)", lineWidth: 1},
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          {color: "#5fa15f"}
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
          {color: "#20a820"}
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          {color: "#5fa15f"}
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
          {color: "#20a820"}
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
          {color: "#95b01a"}
      );
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
        lineWidth: 4,
        color: "#e16507"
      });
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
          {color: "#5fa15f"}
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
          {color: "#5fa15f"}
      );
    }
    this.faceDrawingUtils = drawingUtils;
    return canvas;
  }


  private overlayCanvas(image: HTMLImageElement, zIndex: number) {
    this.canvas = document.createElement("canvas") as HTMLCanvasElement;
    this.canvas.setAttribute("class", "canvas");
    this.canvas.setAttribute("width", image.naturalWidth * 2 + "px");
    this.canvas.setAttribute("height", image.naturalHeight * 2 + "px");
    const imstyle = image.computedStyleMap();
    this.canvas.setAttribute("style", `position: absolute;
        left: ${imstyle.get("left")};
        top: ${imstyle.get("top")};
        width: ${imstyle.get("width")};
        height: ${imstyle.get("height")};
        z-index: ${zIndex};
        object-fit: ${imstyle.get("object-fit")};
        object-position: ${imstyle.get("object-position")};`)
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
      const canvas = this.overlayCanvas(image, zIndex);
      image.parentNode!.appendChild(canvas);
      const drawingUtils = new DrawingUtils((canvas.getContext("2d"))!);
      for (const landmark of result.landmarks) {
        drawingUtils.drawLandmarks(landmark, {
          radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
        });
        drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
      }
      // TODO rewrite as Promise
      callback(canvas);
    });
  }

  /**
   * Removes any previously attached canvas element and attempts to free up resources used.
   */
  resetCanvas() {
    if (this.canvas) {
      this.canvas.remove();
    }
    if (this.faceDrawingUtils) {
      this.faceDrawingUtils.close();
      this.faceDrawingUtils = null;
    }
  }
}

export {PoseSystem};