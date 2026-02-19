"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { prioritizeActiveSpeaker } from "../lib/utils";

interface UseSmartParticipantOrderOptions {
  promoteDelayMs?: number;
  minSwitchIntervalMs?: number;
}

export function useSmartParticipantOrder<T extends { userId: string }>(
  participants: readonly T[],
  activeSpeakerId: string | null,
  options: UseSmartParticipantOrderOptions = {}
): T[] {
  const { promoteDelayMs = 1200, minSwitchIntervalMs = 3200 } = options;
  const participantIdsKey = useMemo(
    () => participants.map((participant) => participant.userId).join("|"),
    [participants]
  );
  const [featuredSpeakerId, setFeaturedSpeakerId] = useState<string | null>(null);
  const featuredSpeakerIdRef = useRef<string | null>(null);
  const candidateIdRef = useRef<string | null>(null);
  const candidateSinceRef = useRef(0);
  const lastSwitchAtRef = useRef(0);
  const promoteTimeoutRef = useRef<number | null>(null);

  const clearPromoteTimeout = () => {
    if (promoteTimeoutRef.current) {
      window.clearTimeout(promoteTimeoutRef.current);
      promoteTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    featuredSpeakerIdRef.current = featuredSpeakerId;
  }, [featuredSpeakerId]);

  useEffect(() => {
    return () => {
      clearPromoteTimeout();
    };
  }, []);

  useEffect(() => {
    if (
      featuredSpeakerIdRef.current &&
      !participants.some(
        (participant) => participant.userId === featuredSpeakerIdRef.current
      )
    ) {
      featuredSpeakerIdRef.current = null;
      setFeaturedSpeakerId(null);
    }
  }, [participantIdsKey, participants]);

  useEffect(() => {
    clearPromoteTimeout();

    const isActiveVisible =
      !!activeSpeakerId &&
      participants.some((participant) => participant.userId === activeSpeakerId);
    if (!isActiveVisible) {
      candidateIdRef.current = null;
      candidateSinceRef.current = 0;
      return;
    }

    const now = Date.now();
    if (candidateIdRef.current !== activeSpeakerId) {
      candidateIdRef.current = activeSpeakerId;
      candidateSinceRef.current = now;
    }

    const attemptPromotion = () => {
      const candidateId = candidateIdRef.current;
      if (!candidateId) return;
      if (featuredSpeakerIdRef.current === candidateId) return;

      const nowMs = Date.now();
      const elapsedSinceSwitch = nowMs - lastSwitchAtRef.current;
      if (elapsedSinceSwitch < minSwitchIntervalMs) {
        promoteTimeoutRef.current = window.setTimeout(
          attemptPromotion,
          minSwitchIntervalMs - elapsedSinceSwitch
        );
        return;
      }

      featuredSpeakerIdRef.current = candidateId;
      lastSwitchAtRef.current = nowMs;
      setFeaturedSpeakerId((prev) => (prev === candidateId ? prev : candidateId));
    };

    const elapsedForCandidate = now - candidateSinceRef.current;
    const waitMs = Math.max(0, promoteDelayMs - elapsedForCandidate);
    promoteTimeoutRef.current = window.setTimeout(attemptPromotion, waitMs);

    return () => {
      clearPromoteTimeout();
    };
  }, [activeSpeakerId, participantIdsKey, participants, promoteDelayMs, minSwitchIntervalMs]);

  return useMemo(
    () => prioritizeActiveSpeaker(participants, featuredSpeakerId),
    [participants, featuredSpeakerId]
  );
}
