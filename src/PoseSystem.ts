import {DrawingUtils, FilesetResolver, PoseLandmarker, PoseLandmarkerResult} from "@mediapipe/tasks-vision";

class PoseSystem {

  private poseLandmarker: PoseLandmarker | null = null;
  private canvas: HTMLCanvasElement | null = null;

  async getPoseLandmarker() {

    if (!this.poseLandmarker) {
      const vision = await FilesetResolver.forVisionTasks("/node_modules/@mediapipe/tasks-vision/wasm");
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `/models/pose_landmarker_heavy.task`,
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numPoses: 1
      });
      this.poseLandmarker = poseLandmarker;
    }
    return this.poseLandmarker;
  }

  async attachPoseToImage(image: HTMLImageElement, zIndex: number, callback: (c: HTMLCanvasElement) => void) {
    const pm = await this.getPoseLandmarker();
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
        z-index: ${zIndex};`
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