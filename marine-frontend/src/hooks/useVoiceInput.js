import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wraps the browser's SpeechRecognition API so chat/ask inputs across the
 * app can offer a mic button with live transcript streaming.
 *
 * Gracefully reports `supported: false` on browsers without SpeechRecognition.
 */
export function useVoiceInput({ lang = "en-IN", onResult } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported] = useState(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    setTranscript("");
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setListening(false);
  }, []);

  useEffect(() => () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
  }, []);

  const start = useCallback(() => {
    if (!supported || listening) return;

    isCancelledRef.current = false;
    setTranscript("");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalResult = "";

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item[0]) {
          currentTranscript += item[0].transcript;
          if (item.isFinal) {
            finalResult = currentTranscript;
          }
        }
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (err) => {
      console.warn("Speech recognition error:", err);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (!isCancelledRef.current && (finalResult || recognitionRef.current?._latestTranscript)) {
        const textToUse = finalResult || recognitionRef.current?._latestTranscript;
        if (textToUse && textToUse.trim()) {
          onResultRef.current?.(textToUse.trim());
        }
      }
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [supported, listening, lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { start, stop, cancel, toggle, listening, transcript, supported };
}