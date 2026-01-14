"use client";

import {
  Hand,
  Globe,
  Lock,
  LockOpen,
  MessageSquare,
  Mic,
  MicOff,
  MoreVertical,
  Phone,
  Smile,
  Users,
  Video,
  VideoOff,
  Monitor,
  X,
} from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";
import type { ReactionOption } from "../../types";
import { normalizeBrowserUrl } from "../../utils";

interface MobileControlsBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  activeScreenShareId: string | null;
  isChatOpen: boolean;
  unreadCount: number;
  isHandRaised: boolean;
  reactionOptions: ReactionOption[];
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleHandRaised: () => void;
  onSendReaction: (reaction: ReactionOption) => void;
  onLeave: () => void;
  isGhostMode?: boolean;
  isAdmin?: boolean;
  isParticipantsOpen?: boolean;
  onToggleParticipants?: () => void;
  pendingUsersCount?: number;
  isRoomLocked?: boolean;
  onToggleLock?: () => void;
  isBrowserActive?: boolean;
  isBrowserLaunching?: boolean;
  onLaunchBrowser?: (url: string) => Promise<boolean>;
  onNavigateBrowser?: (url: string) => Promise<boolean>;
  onCloseBrowser?: () => Promise<boolean>;
}

function MobileControlsBar({
  isMuted,
  isCameraOff,
  isScreenSharing,
  activeScreenShareId,
  isChatOpen,
  unreadCount,
  isHandRaised,
  reactionOptions,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleHandRaised,
  onSendReaction,
  onLeave,
  isGhostMode = false,
  isAdmin = false,
  isParticipantsOpen,
  onToggleParticipants,
  pendingUsersCount = 0,
  isRoomLocked = false,
  onToggleLock,
  isBrowserActive = false,
  isBrowserLaunching = false,
  onLaunchBrowser,
  onNavigateBrowser,
  onCloseBrowser,
}: MobileControlsBarProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [browserUrlInput, setBrowserUrlInput] = useState("");
  const [browserUrlError, setBrowserUrlError] = useState<string | null>(null);
  const lastReactionTimeRef = useRef<number>(0);
  const REACTION_COOLDOWN_MS = 150;

  const canStartScreenShare = !activeScreenShareId || isScreenSharing;

  const baseButtonClass =
    "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95";
  const defaultButtonClass = `${baseButtonClass} bg-[#2a2a2a] text-[#FEFCD9]/80`;
  const activeButtonClass = `${baseButtonClass} bg-[#F95F4A] text-white`;
  const mutedButtonClass = `${baseButtonClass} bg-[#F95F4A]/15 text-[#F95F4A]`;
  const ghostDisabledClass = `${baseButtonClass} bg-[#2a2a2a] opacity-30`;
  const leaveButtonClass = `${baseButtonClass} bg-red-500 text-white`;

  const handleReactionClick = useCallback(
    (reaction: ReactionOption) => {
      const now = Date.now();
      if (now - lastReactionTimeRef.current < REACTION_COOLDOWN_MS) {
        return;
      }
      lastReactionTimeRef.current = now;
      onSendReaction(reaction);
      setIsReactionMenuOpen(false);
    },
    [onSendReaction]
  );

  return (
    <>
      {/* Reaction menu overlay */}
      {isReactionMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsReactionMenuOpen(false)}
        >
          <div
            className="absolute bottom-20 left-4 right-4 flex items-center justify-center gap-3 rounded-2xl bg-[#1a1a1a] border border-[#FEFCD9]/10 px-4 py-4 overflow-x-auto touch-pan-x"
            onClick={(e) => e.stopPropagation()}
          >
            {reactionOptions.map((reaction) => (
              <button
                key={reaction.id}
                onClick={() => handleReactionClick(reaction)}
                className="w-12 h-12 shrink-0 rounded-full text-2xl hover:bg-[#FEFCD9]/10 active:scale-110 flex items-center justify-center transition-transform"
              >
                {reaction.kind === "emoji" ? (
                  reaction.value
                ) : (
                  <img
                    src={reaction.value}
                    alt={reaction.label}
                    className="w-8 h-8 object-contain"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* More menu drawer */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => {
            setIsMoreMenuOpen(false);
            setBrowserUrlError(null);
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#121212] border-t border-[#FEFCD9]/10 rounded-t-3xl p-3 pb-6 max-h-[70vh] overflow-y-auto touch-pan-y shadow-[0_-18px_45px_rgba(0,0,0,0.35)]"
            style={{ fontFamily: "'PolySans Trial', sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-3 pt-1 pb-2">
              <div className="mx-auto h-1 w-10 rounded-full bg-[#FEFCD9]/20" />
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="absolute right-2 top-0 h-7 w-7 rounded-full flex items-center justify-center text-[#FEFCD9]/50 hover:text-[#FEFCD9] hover:bg-[#FEFCD9]/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => {
                onToggleParticipants?.();
                setIsMoreMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#FEFCD9] hover:bg-[#FEFCD9]/5 active:bg-[#FEFCD9]/10"
            >
              <div className="h-9 w-9 rounded-xl bg-[#2b2b2b] border border-white/5 flex items-center justify-center">
                <Users className="w-4.5 h-4.5" />
              </div>
              <span className="text-sm font-semibold">Participants</span>
              {pendingUsersCount > 0 && (
                <span className="ml-auto text-xs bg-[#F95F4A] text-white px-2 py-0.5 rounded-full font-bold">
                  {pendingUsersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                onToggleHandRaised();
                setIsMoreMenuOpen(false);
              }}
              disabled={isGhostMode}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${isGhostMode
                  ? "opacity-30"
                  : isHandRaised
                    ? "text-amber-400"
                    : "text-[#FEFCD9]"
                } hover:bg-[#FEFCD9]/5 active:bg-[#FEFCD9]/10`}
            >
              <div
                className={`h-9 w-9 rounded-xl border border-white/5 flex items-center justify-center ${
                  isHandRaised ? "bg-amber-500/15" : "bg-[#2b2b2b]"
                }`}
              >
                <Hand className="w-4.5 h-4.5" />
              </div>
              <span className="text-sm font-semibold">{isHandRaised ? "Lower hand" : "Raise hand"}</span>
            </button>
            <button
              onClick={() => {
                onToggleScreenShare();
                setIsMoreMenuOpen(false);
              }}
              disabled={isGhostMode || !canStartScreenShare}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${isGhostMode || !canStartScreenShare
                  ? "opacity-30"
                  : isScreenSharing
                    ? "text-[#F95F4A]"
                    : "text-[#FEFCD9]"
                } hover:bg-[#FEFCD9]/5 active:bg-[#FEFCD9]/10`}
            >
              <div
                className={`h-9 w-9 rounded-xl border border-white/5 flex items-center justify-center ${
                  isScreenSharing ? "bg-[#F95F4A]/20" : "bg-[#2b2b2b]"
                }`}
              >
                <Monitor className="w-4.5 h-4.5" />
              </div>
              <span className="text-sm font-semibold">{isScreenSharing ? "Stop sharing" : "Share screen"}</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  onToggleLock?.();
                  setIsMoreMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${isRoomLocked
                    ? "text-amber-400"
                    : "text-[#FEFCD9]"
                  } hover:bg-[#FEFCD9]/5 active:bg-[#FEFCD9]/10`}
              >
                <div
                  className={`h-9 w-9 rounded-xl border border-white/5 flex items-center justify-center ${
                    isRoomLocked ? "bg-amber-500/20" : "bg-[#2b2b2b]"
                  }`}
                >
                  {isRoomLocked ? (
                    <Lock className="w-4.5 h-4.5" />
                  ) : (
                    <LockOpen className="w-4.5 h-4.5" />
                  )}
                </div>
                <span className="text-sm font-semibold">{isRoomLocked ? "Unlock meeting" : "Lock meeting"}</span>
              </button>
            )}
            {isAdmin && (onLaunchBrowser || onNavigateBrowser || onCloseBrowser) && (
              <div className="mt-1 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3 text-[#FEFCD9]">
                  <div className="h-9 w-9 rounded-xl bg-[#2b2b2b] border border-white/5 flex items-center justify-center">
                    <Globe className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm font-semibold">Shared browser</span>
                  <span
                    className={`ml-auto text-[10px] uppercase tracking-[0.2em] ${
                      isBrowserActive ? "text-emerald-300" : "text-[#FEFCD9]/40"
                    }`}
                  >
                    {isBrowserActive ? "Live" : "Off"}
                  </span>
                </div>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!browserUrlInput.trim()) return;
                    const normalized = normalizeBrowserUrl(browserUrlInput);
                    if (!normalized.url) {
                      setBrowserUrlError(normalized.error ?? "Enter a valid URL.");
                      return;
                    }
                    setBrowserUrlError(null);
                    setBrowserUrlInput("");
                    if (isBrowserActive) {
                      await onNavigateBrowser?.(normalized.url);
                    } else {
                      await onLaunchBrowser?.(normalized.url);
                    }
                    setIsMoreMenuOpen(false);
                  }}
                  className="mt-2 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={browserUrlInput}
                    onChange={(event) => {
                      setBrowserUrlInput(event.target.value);
                      if (browserUrlError) setBrowserUrlError(null);
                    }}
                    placeholder={isBrowserActive ? "Navigate to URL" : "Launch URL"}
                    className="flex-1 bg-black/40 border border-[#FEFCD9]/10 rounded-lg px-2.5 py-1.5 text-xs text-[#FEFCD9] placeholder:text-[#FEFCD9]/30 focus:outline-none focus:border-[#FEFCD9]/25"
                  />
                  <button
                    type="submit"
                    disabled={!browserUrlInput.trim() || isBrowserLaunching}
                    className="px-3 py-1.5 rounded-lg bg-[#F95F4A] text-white text-xs font-medium hover:bg-[#F95F4A]/90 disabled:opacity-40 disabled:hover:bg-[#F95F4A]"
                  >
                    {isBrowserActive ? "Go" : "Launch"}
                  </button>
                  {isBrowserActive && onCloseBrowser && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onCloseBrowser();
                        setIsMoreMenuOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-[#FEFCD9] text-xs font-medium hover:bg-white/20"
                    >
                      Close
                    </button>
                  )}
                </form>
                {browserUrlError && (
                  <p className="mt-2 text-[11px] text-[#F95F4A]">
                    {browserUrlError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main controls bar */}
      <div className="fixed bottom-0 left-0 right-0 safe-area-pb bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-6 px-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            disabled={isGhostMode}
            className={
              isGhostMode
                ? ghostDisabledClass
                : isMuted
                  ? mutedButtonClass
                  : defaultButtonClass
            }
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera button */}
          <button
            onClick={onToggleCamera}
            disabled={isGhostMode}
            className={
              isGhostMode
                ? ghostDisabledClass
                : isCameraOff
                  ? mutedButtonClass
                  : defaultButtonClass
            }
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Reactions button */}
          <button
            onClick={() => setIsReactionMenuOpen(true)}
            disabled={isGhostMode}
            className={isGhostMode ? ghostDisabledClass : defaultButtonClass}
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Chat button */}
          <button
            onClick={onToggleChat}
            className={`relative ${isChatOpen ? activeButtonClass : defaultButtonClass}`}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[#F95F4A] text-white rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* More button */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={defaultButtonClass}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Leave button */}
          <button onClick={onLeave} className={leaveButtonClass}>
            <Phone className="rotate-[135deg] w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}

export default memo(MobileControlsBar);
