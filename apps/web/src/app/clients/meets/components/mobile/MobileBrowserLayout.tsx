"use client";

import { Ghost, Globe, Loader2, MicOff } from "lucide-react";
import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import type { Participant } from "../../types";
import {
  isSystemUserId,
  normalizeBrowserUrl,
  resolveNoVncUrl,
} from "../../utils";

interface MobileBrowserLayoutProps {
  browserUrl: string;
  noVncUrl: string;
  controllerName: string;
  localStream: MediaStream | null;
  isCameraOff: boolean;
  isMuted: boolean;
  isGhost: boolean;
  participants: Map<string, Participant>;
  userEmail: string;
  isMirrorCamera: boolean;
  activeSpeakerId: string | null;
  currentUserId: string;
  audioOutputDeviceId?: string;
  getDisplayName: (userId: string) => string;
  isAdmin?: boolean;
  isBrowserLaunching?: boolean;
  onNavigateBrowser?: (url: string) => Promise<boolean>;
}

function MobileBrowserLayout({
  browserUrl,
  noVncUrl,
  controllerName,
  localStream,
  isCameraOff,
  isMuted,
  isGhost,
  participants,
  userEmail,
  isMirrorCamera,
  getDisplayName,
  isAdmin,
  isBrowserLaunching = false,
  onNavigateBrowser,
}: MobileBrowserLayoutProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [navInput, setNavInput] = useState(browserUrl);
  const [navError, setNavError] = useState<string | null>(null);

  useEffect(() => {
    if (!noVncUrl) return;
    const timer = setTimeout(() => setIsReady(true), 3000);
    return () => clearTimeout(timer);
  }, [noVncUrl]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (video && localStream) {
      video.srcObject = localStream;
      video.play().catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[Meets] Mobile browser local video play error:", err);
        }
      });
    }
  }, [localStream]);

  useEffect(() => {
    setNavInput(browserUrl);
  }, [browserUrl]);

  const participantArray = Array.from(participants.values()).filter(
    (participant) => !isSystemUserId(participant.userId)
  );

  const displayUrl = (() => {
    try {
      return new URL(browserUrl).hostname;
    } catch {
      return browserUrl;
    }
  })();

  const resolvedNoVncUrl = resolveNoVncUrl(noVncUrl);

  return (
    <div className="flex flex-col w-full h-full p-2 gap-2">
      <div className="flex-1 min-h-0 flex flex-col bg-[#252525] border border-white/5 rounded-xl overflow-hidden">
        {isAdmin && onNavigateBrowser && (
          <div className="px-3 py-2 bg-black/60 border-b border-white/5">
            <form
              onSubmit={async (event: FormEvent) => {
                event.preventDefault();
                const normalized = normalizeBrowserUrl(navInput);
                if (!normalized.url) {
                  setNavError(normalized.error ?? "Enter a valid URL.");
                  return;
                }
                setNavError(null);
                await onNavigateBrowser(normalized.url);
              }}
              className="flex items-center gap-2"
            >
              <Globe className="w-3.5 h-3.5 text-[#FEFCD9]/50 shrink-0" />
              <input
                type="text"
                value={navInput}
                onChange={(event) => {
                  setNavInput(event.target.value);
                  if (navError) setNavError(null);
                }}
                placeholder="Navigate to a URL"
                className="flex-1 bg-black/40 border border-[#FEFCD9]/10 rounded-lg px-2.5 py-1.5 text-xs text-[#FEFCD9] placeholder:text-[#FEFCD9]/30 focus:outline-none focus:border-[#FEFCD9]/25"
              />
              <button
                type="submit"
                disabled={!navInput.trim() || isBrowserLaunching}
                className="px-3 py-1.5 rounded-lg bg-[#F95F4A] text-white text-xs font-medium hover:bg-[#F95F4A]/90 disabled:opacity-40 disabled:hover:bg-[#F95F4A]"
              >
                {isBrowserLaunching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Go"
                )}
              </button>
            </form>
            {navError && (
              <p className="mt-1 text-[10px] text-[#F95F4A]">{navError}</p>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 relative bg-black">
          {isReady ? (
            <iframe
              src={resolvedNoVncUrl}
              className="absolute inset-0 w-full h-full border-0"
              allow="clipboard-read; clipboard-write"
              title="Shared Browser"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1a1a1a] to-[#0d0e0d]">
              <div className="w-14 h-14 rounded-full bg-[#F95F4A]/10 flex items-center justify-center">
                <Globe className="w-7 h-7 text-[#F95F4A] animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#FEFCD9]/50" />
                <span className="text-sm text-[#FEFCD9]/40">Starting browser...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#F95F4A]/20 flex items-center justify-center">
              <Globe className="w-2.5 h-2.5 text-[#F95F4A]" />
            </div>
            <span
              className="text-[11px] text-[#FEFCD9]/70 font-medium"
              style={{ fontFamily: "'PolySans Trial', sans-serif" }}
            >
              {displayUrl}
            </span>
          </div>
          <div
            className="flex items-center gap-2 text-[10px] text-[#FEFCD9]/40"
            style={{ fontFamily: "'PolySans Mono', monospace" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
            {controllerName} is sharing
          </div>
        </div>
      </div>

      <div className="h-24 shrink-0 flex gap-2 overflow-x-auto no-scrollbar touch-pan-x">
        <div className="relative w-24 h-24 shrink-0 bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#FEFCD9]/10">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isCameraOff ? "hidden" : ""} ${isMirrorCamera ? "scale-x-[-1]" : ""}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0d0e0d]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F95F4A]/20 to-[#FF007A]/20 border border-[#FEFCD9]/20 flex items-center justify-center text-lg text-[#FEFCD9] font-bold">
                {userEmail[0]?.toUpperCase() || "?"}
              </div>
            </div>
          )}
          {isGhost && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40">
              <Ghost className="w-6 h-6 text-[#FF007A] drop-shadow-[0_0_15px_rgba(255,0,122,0.5)]" />
            </div>
          )}
          <div
            className="absolute bottom-1 left-1 right-1 flex items-center justify-center"
            style={{ fontFamily: "'PolySans Mono', monospace" }}
          >
            <span className="bg-black/70 border border-[#FEFCD9]/10 rounded-full px-1.5 py-0.5 text-[10px] text-[#FEFCD9] font-medium uppercase tracking-wide flex items-center gap-1">
              You
              {isMuted && <MicOff className="w-2.5 h-2.5 text-[#F95F4A]" />}
            </span>
          </div>
        </div>

        {participantArray.map((participant) => (
          <div
            key={participant.userId}
            className="relative w-24 h-24 shrink-0 bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#FEFCD9]/10"
          >
            {participant.videoStream && !participant.isCameraOff ? (
              <VideoThumbnail participant={participant} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0d0e0d]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F95F4A]/20 to-[#FF007A]/20 border border-[#FEFCD9]/20 flex items-center justify-center text-lg text-[#FEFCD9] font-bold">
                  {getDisplayName(participant.userId)[0]?.toUpperCase() || "?"}
                </div>
              </div>
            )}
            {participant.isGhost && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40">
                <Ghost className="w-6 h-6 text-[#FF007A] drop-shadow-[0_0_15px_rgba(255,0,122,0.5)]" />
              </div>
            )}
            <div
              className="absolute bottom-1 left-1 right-1 flex items-center justify-center"
              style={{ fontFamily: "'PolySans Mono', monospace" }}
            >
              <span className="bg-black/70 border border-[#FEFCD9]/10 rounded-full px-1.5 py-0.5 text-[10px] text-[#FEFCD9] font-medium uppercase tracking-wide truncate max-w-full flex items-center gap-1">
                {getDisplayName(participant.userId).split(" ")[0]}
                {participant.isMuted && (
                  <MicOff className="w-2.5 h-2.5 text-[#F95F4A]" />
                )}
              </span>
            </div>
            {participant.audioStream && <AudioPlayer stream={participant.audioStream} />}
          </div>
        ))}
      </div>
    </div>
  );
}

const VideoThumbnail = memo(function VideoThumbnail({
  participant,
}: {
  participant: Participant;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && participant.videoStream) {
      video.srcObject = participant.videoStream;
      video.play().catch(() => {});
    }
  }, [participant.videoStream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
    />
  );
});

const AudioPlayer = memo(function AudioPlayer({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && stream) {
      audio.srcObject = stream;
      audio.play().catch(() => {});
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay />;
});

export default memo(MobileBrowserLayout);
