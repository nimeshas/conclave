import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

interface TtsPayload {
  userId: string;
  displayName: string;
  text: string;
}

export function useMeetTts() {
  const [ttsSpeakerId, setTtsSpeakerId] = useState<string | null>(null);
  const activeTokenRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHighlight = useCallback((token: number) => {
    if (activeTokenRef.current !== token) return;
    setTtsSpeakerId(null);
  }, []);

  const handleTtsMessage = useCallback(
    (payload: TtsPayload) => {
      const text = payload.text?.trim();
      if (!text) return;

      const token = Date.now();
      activeTokenRef.current = token;
      setTtsSpeakerId(payload.userId);

      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }

      const words = text.split(/\s+/).filter(Boolean).length;
      const estimatedMs = Math.min(15000, Math.max(2000, Math.ceil(words * 420)));
      fallbackTimeoutRef.current = setTimeout(() => {
        clearHighlight(token);
      }, estimatedMs);

      try {
        Speech.stop();
        Speech.speak(text, {
          rate: 1,
          pitch: 1,
          onDone: () => clearHighlight(token),
          onStopped: () => clearHighlight(token),
          onError: () => clearHighlight(token),
        });
      } catch (_err) {
        clearHighlight(token);
      }
    },
    [clearHighlight]
  );

  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      Speech.stop();
    };
  }, []);

  return { ttsSpeakerId, handleTtsMessage };
}
