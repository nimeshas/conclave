"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { prioritizeActiveSpeaker } from "../lib/utils";

interface UseSmartParticipantOrderOptions {
  promoteDelayMs?: number;
  minSwitchIntervalMs?: number;
}

export function useSmartParticipantOrder<
  T extends { userId: string; isHandRaised?: boolean }
>(
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
  const participantsRef = useRef(participants);
  const featuredSpeakerIdRef = useRef<string | null>(null);
  const candidateIdRef = useRef<string | null>(null);
  const candidateSinceRef = useRef(0);
  const lastSwitchAtRef = useRef(0);
  const promoteTimeoutRef = useRef<number | null>(null);
  const previousRaisedMapRef = useRef<Map<string, boolean>>(new Map());
  const raisedOrderRef = useRef<string[]>([]);

  const clearPromoteTimeout = () => {
    if (promoteTimeoutRef.current) {
      window.clearTimeout(promoteTimeoutRef.current);
      promoteTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

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
      !participantsRef.current.some(
        (participant) => participant.userId === featuredSpeakerIdRef.current
      )
    ) {
      featuredSpeakerIdRef.current = null;
      setFeaturedSpeakerId(null);
    }
  }, [participantIdsKey]);

  useEffect(() => {
    const nextRaisedMap = new Map<string, boolean>();
    const currentIds = new Set(participants.map((participant) => participant.userId));

    raisedOrderRef.current = raisedOrderRef.current.filter((userId) =>
      currentIds.has(userId)
    );

    participants.forEach((participant) => {
      const userId = participant.userId;
      const isRaised = Boolean(participant.isHandRaised);
      const wasRaised = previousRaisedMapRef.current.get(userId) ?? false;
      nextRaisedMap.set(userId, isRaised);

      if (isRaised) {
        if (!wasRaised && !raisedOrderRef.current.includes(userId)) {
          raisedOrderRef.current.push(userId);
        }
      } else {
        raisedOrderRef.current = raisedOrderRef.current.filter(
          (raisedUserId) => raisedUserId !== userId
        );
      }
    });

    previousRaisedMapRef.current = nextRaisedMap;
  }, [participants]);

  useEffect(() => {
    clearPromoteTimeout();

    const isActiveVisible =
      !!activeSpeakerId &&
      participantsRef.current.some(
        (participant) => participant.userId === activeSpeakerId
      );
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
  }, [activeSpeakerId, participantIdsKey, promoteDelayMs, minSwitchIntervalMs]);

  return useMemo(() => {
    const raisedSet = new Set(
      participants
        .filter((participant) => participant.isHandRaised)
        .map((participant) => participant.userId)
    );

    const raisedParticipants = raisedOrderRef.current
      .map((userId) => participants.find((participant) => participant.userId === userId))
      .filter((participant): participant is T => Boolean(participant))
      .filter((participant) => raisedSet.has(participant.userId));

    const nonRaisedParticipants = participants.filter(
      (participant) => !raisedSet.has(participant.userId)
    );

    return [
      ...raisedParticipants,
      ...prioritizeActiveSpeaker(nonRaisedParticipants, featuredSpeakerId),
    ];
  }, [participants, featuredSpeakerId]);
}
