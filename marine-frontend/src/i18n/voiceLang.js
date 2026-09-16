const VOICE_LANG_BY_CODE = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

/**
 * Maps the app's language code to a BCP-47 tag for the browser's
 * SpeechRecognition API. Falls back to en-IN for any language that doesn't
 * have (or need) a distinct recognition locale yet.
 */
export function voiceLangFor(language) {
  return VOICE_LANG_BY_CODE[language] || "en-IN";
}