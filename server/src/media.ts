/**
 * @param format
 * @deprecated use MediaFormat instances
 */
function formatToMimeType(format: SupportedAudioFormat) {
  switch (format) {
    case 'aiff':
      return 'audio/aiff';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    default:
      throw new Error(`Unsupported audio format ${format}`);
  }
}

const FORMATS: MediaFormat[] = [
  {
    extensions: ["mp3"],
    mimeType: "audio/mp3",
    modality: "audio"
  },
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
  {
    extensions: ["mp4"],
    mimeType: "video/mp4",
    modality: "video"
  }
]

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

/** @deprecated use MediaFormat instances */
const TYPE_MP3 = "mp3"
/** @deprecated use MediaFormat instances */
const TYPE_DEFAULT = TYPE_MP3;

type MediaFormat = {
  /** All possible file extensions for this format, first is preferred for file generation. */
  extensions: string[];
  mimeType: string;
  modality: "image" | "video" | "audio";
}

/** @deprecated use MediaFormat instances */
export type SupportedAudioFormat = "aiff" | "mp3" | "wav";
export {TYPE_MP3, TYPE_DEFAULT, type MediaFormat, extToFormat, mimeTypeToFormat};