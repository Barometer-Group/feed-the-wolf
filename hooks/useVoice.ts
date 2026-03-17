"use client";

import { useState, useCallback } from "react";

interface SpeechRecognitionInstance {
  start: () => void;
  stop: () => void;
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onresult: ((e: { results: { length: number; [i: number]: { 0?: { transcript?: string } } } }) => void) | null;
  onend: (() => void) | null;
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
      : null;

  const start = useCallback(() => {
    if (!SpeechRecognition) return false;
    const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e: { results: { length: number; [i: number]: { 0?: { transcript?: string } } } }) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += (e.results[i]?.[0]?.transcript ?? "") + " ";
      }
      setTranscript(text.trim());
    };
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    setTranscript("");
    recognition.start();
    return true;
  }, [SpeechRecognition]);

  return {
    isListening,
    transcript,
    start,
    isSupported: !!SpeechRecognition,
  };
}
