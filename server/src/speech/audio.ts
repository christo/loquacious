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

const TYPE_MP3 = "mp3"
const TYPE_AIFF = "aiff"
const TYPE_WAV = "wav"
const TYPE_DEFAULT = TYPE_MP3;

export type SupportedAudioFormat = "aiff" | "mp3" | "wav";
export {TYPE_AIFF, TYPE_MP3, TYPE_WAV, TYPE_DEFAULT, formatToMimeType};