import path from "path";

const MF_MP3: MediaFormat = {
  extensions: ["mp3"],
  mimeType: "audio/mp3",
  modality: "audio"
};
const MF_MP4: MediaFormat = {
  extensions: ["mp4"],
  mimeType: "video/mp4",
  modality: "video"
};
const FORMATS: MediaFormat[] = [
  MF_MP3,
  {
    extensions: ["aiff"],
    mimeType: "audio/aiff",
    modality: "audio"
  },
  {
    extensions: ["wav"],
    mimeType: "audio/wav",
    modality: "audio"
  },
  MF_MP4,
  {
    extensions: ["jpg", "jpeg"],
    mimeType: "image/jpeg",
    modality: "image"
  },
  {
    extensions: ["png"],
    mimeType: "image/png",
    modality: "image"
  },
  {
    extensions: ["gif"],
    mimeType: "image/gif",
    modality: "image"
  }
];

function supportedVideoTypes(): MediaFormat[] {
  return FORMATS.filter(f => f.modality === "video")
}

function supportedImageTypes(): MediaFormat[] {
  return FORMATS.filter(f => f.modality === "image")
}

type FormatByString = { [key: string]: MediaFormat };
const FORMAT_BY_EXT: FormatByString = FORMATS.reduce((m, f) => {
  f.extensions.forEach(ext => m[ext] = f);
  return m;
}, ({} as FormatByString));
const FORMAT_BY_MIME_TYPE: FormatByString = FORMATS.reduce((m, f) => {
  m[f.mimeType] = f;
  return m;
}, ({} as FormatByString));

/**
 * Derives the {@link MediaFormat} for the given filepath or extension.
 * @param fpe a filepath ending in dot extension or just the extension
 * @return corresponding {@link MediaFormat} or undefined if unknown
 */
function extToFormat(fpe: string): MediaFormat | undefined {
  const dotSplit = fpe.split('.');
  const ext = dotSplit[dotSplit.length - 1];
  return FORMAT_BY_EXT[ext];
}

/**
 * Derives the {@link MediaFormat} for the given Mime-Type.
 * @param mimeType a filepath ending in dot extension or just the extension
 * @return corresponding {@link MediaFormat} or undefined if unknown
 */
function mimeTypeToFormat(mimeType: string): MediaFormat | undefined {
  return FORMAT_BY_MIME_TYPE[mimeType];
}

type MediaFormat = {
  /** All possible file extensions for this format, first is preferred for file generation. */
  extensions: string[];
  mimeType: string;
  modality: "image" | "video" | "audio";
}

function hasVideoExt(filename: string) {
  return MF_MP4.extensions.includes(path.extname(filename).substring(1).toLowerCase());
}

export {
  MF_MP3,
  MF_MP4,
  type MediaFormat,
  extToFormat,
  mimeTypeToFormat,
  supportedImageTypes,
  supportedVideoTypes,
  hasVideoExt
};
