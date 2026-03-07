"use client";

import { useEffect, useRef } from "react";
import type { Participant } from "../lib/types";
import { isSystemUserId } from "../lib/utils";

interface UseMeetHandRaiseSoundOptions {
  participants: Map<string, Participant>;
  connectionState: "disconnected" | "connecting" | "connected" | "joining" | "joined" | "reconnecting" | "waiting" | "error";
  currentUserId: string;
  isHandRaised: boolean;
  playNotificationSound: (type: "join" | "leave" | "waiting" | "handRaise") => void;
}

export function useMeetHandRaiseSound({
  participants,
  connectionState,
  currentUserId,
  isHandRaised,
  playNotificationSound,
}: UseMeetHandRaiseSoundOptions) {
  const hasInitializedRef = useRef(false);
  const lastSoundAtRef = useRef(0);
  const previousRemoteRaisedCountRef = useRef(0);
  const previousLocalRaisedRef = useRef(false);

  useEffect(() => {
    const remoteRaisedCount = Array.from(participants.values()).filter(
      (participant) =>
        participant.userId !== currentUserId &&
        !isSystemUserId(participant.userId) &&
        participant.isHandRaised
    ).length;

    if (connectionState !== "joined") {
      hasInitializedRef.current = false;
      previousRemoteRaisedCountRef.current = remoteRaisedCount;
      previousLocalRaisedRef.current = isHandRaised;
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      previousRemoteRaisedCountRef.current = remoteRaisedCount;
      previousLocalRaisedRef.current = isHandRaised;
      return;
    }

    const remoteRaisedIncreased =
      remoteRaisedCount > previousRemoteRaisedCountRef.current;
    const localRaisedNow = isHandRaised;
    const localJustRaised = !previousLocalRaisedRef.current && localRaisedNow;

    if (remoteRaisedIncreased || localJustRaised) {
      const now = Date.now();
      if (now - lastSoundAtRef.current >= 500) {
        playNotificationSound("handRaise");
        lastSoundAtRef.current = now;
      }
    }

    previousRemoteRaisedCountRef.current = remoteRaisedCount;
    previousLocalRaisedRef.current = localRaisedNow;
  }, [
    participants,
    connectionState,
    currentUserId,
    isHandRaised,
    playNotificationSound,
  ]);
}
