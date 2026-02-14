"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Participant } from "../lib/types";
import { isSystemUserId } from "../lib/utils";

// ─── Types ────────────────────────────────────────────────────────

interface DocumentPictureInPictureWindow extends Window {
  // The Document PiP API exposes a standard Window
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
  }): Promise<DocumentPictureInPictureWindow>;
  window: DocumentPictureInPictureWindow | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export interface UseMeetPopoutOptions {
  isJoined: boolean;
  localStream: MediaStream | null;
  participants: Map<string, Participant>;
  activeSpeakerId: string | null;
  currentUserId: string;
  isCameraOff: boolean;
  isMuted: boolean;
  userEmail: string;
  getDisplayName: (userId: string) => string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}

export interface PopoutState {
  isPopoutActive: boolean;
  isPopoutSupported: boolean;
  openPopout: () => Promise<void>;
  closePopout: () => void;
}

// ─── Inline CSS for the popout window ─────────────────────────────
// Matches Conclave design system: PolySans fonts, #0d0e0d bg,
// #FEFCD9 text, #F95F4A accent, rounded-full pill controls,
// 16px radius video tiles with gradient avatars.

const POPOUT_CSS = `
  @font-face {
    font-family: 'PolySans Trial';
    src: local('PolySans Trial');
    font-display: swap;
  }
  @font-face {
    font-family: 'PolySans Mono';
    src: local('PolySans Mono');
    font-display: swap;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'PolySans Trial', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0d0e0d;
    color: #FEFCD9;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }

  .popout-root {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  /* ── Video grid (full area, no header) ── */
  .popout-videos {
    flex: 1;
    display: grid;
    gap: 6px;
    padding: 6px;
    min-height: 0;
    overflow: hidden;
  }

  .popout-videos.single {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  .popout-videos.dual {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }

  .popout-videos.multi {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .video-tile {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background: #0d0e0d;
    border: 1px solid rgba(254, 252, 217, 0.08);
    transition: all 0.3s ease;
    min-width: 0;
    min-height: 0;
  }

  .video-tile:hover {
    border-color: rgba(254, 252, 217, 0.15);
  }

  .video-tile.speaking {
    border-color: #F95F4A;
    box-shadow: 0 0 0 2px rgba(249, 95, 74, 0.3), 0 0 30px rgba(249, 95, 74, 0.2);
  }

  .video-tile video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-tile .avatar-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a1a, #0d0e0d);
  }

  .video-tile .avatar-circle {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(249, 95, 74, 0.2), rgba(255, 0, 122, 0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    color: #FEFCD9;
    border: 1px solid rgba(254, 252, 217, 0.2);
  }

  .video-tile .label {
    position: absolute;
    bottom: 8px;
    left: 8px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(254, 252, 217, 0.1);
    border-radius: 9999px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'PolySans Mono', monospace;
  }

  .video-tile .label-name {
    font-size: 10px;
    font-weight: 500;
    color: #FEFCD9;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
  }

  .video-tile .label-muted {
    flex-shrink: 0;
    color: #F95F4A;
    display: flex;
    align-items: center;
  }

  .video-tile .label-muted svg {
    width: 10px;
    height: 10px;
  }

  /* ── Controls bar (floating pill at bottom, matches ControlsBar) ── */
  .popout-controls {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 9999px;
    z-index: 10;
    font-family: 'PolySans Mono', monospace;
  }

  .ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    border: none;
    background: transparent;
    color: rgba(254, 252, 217, 0.8);
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
  }

  .ctrl-btn:hover {
    color: #FEFCD9;
    background: rgba(254, 252, 217, 0.1);
  }

  .ctrl-btn.muted {
    color: #F95F4A;
    background: rgba(249, 95, 74, 0.15);
  }

  .ctrl-btn.muted:hover {
    background: rgba(249, 95, 74, 0.25);
  }

  .ctrl-btn svg {
    width: 16px;
    height: 16px;
  }

  .ctrl-divider {
    width: 1px;
    height: 20px;
    background: rgba(254, 252, 217, 0.1);
    margin: 0 2px;
  }

  .ctrl-btn.leave {
    color: #ef4444;
    background: transparent;
  }

  .ctrl-btn.leave:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .ctrl-btn.leave svg {
    transform: rotate(135deg);
  }

  /* ── Count badge (top-left overlay) ── */
  .popout-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(254, 252, 217, 0.1);
    border-radius: 9999px;
    font-family: 'PolySans Mono', monospace;
    font-size: 10px;
    color: rgba(254, 252, 217, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    z-index: 10;
  }

  .popout-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34d399;
  }
`;

// ─── SVG icons as strings ─────────────────────────────────────────

const MIC_ON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
const MIC_OFF_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5.87"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
const CAM_ON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`;
const CAM_OFF_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;
const PHONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const MIC_OFF_SMALL_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5.87"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;

// ─── Hook ─────────────────────────────────────────────────────────

export function useMeetPopout({
  isJoined,
  localStream,
  participants,
  activeSpeakerId,
  currentUserId,
  isCameraOff,
  isMuted,
  userEmail,
  getDisplayName,
  onToggleMute,
  onToggleCamera,
  onLeave,
}: UseMeetPopoutOptions): PopoutState {
  const [isPopoutActive, setIsPopoutActive] = useState(false);
  const popoutWindowRef = useRef<Window | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Store callbacks in refs so DOM event listeners always call the latest version
  const onToggleMuteRef = useRef(onToggleMute);
  const onToggleCameraRef = useRef(onToggleCamera);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => { onToggleMuteRef.current = onToggleMute; }, [onToggleMute]);
  useEffect(() => { onToggleCameraRef.current = onToggleCamera; }, [onToggleCamera]);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);

  const isPopoutSupported =
    typeof window !== "undefined" && "documentPictureInPicture" in window;

  // ── Build / update DOM inside the popout ──

  const getVisibleParticipants = useCallback(() => {
    const visible: Array<{
      userId: string;
      displayName: string;
      videoStream: MediaStream | null;
      isCameraOff: boolean;
      isMuted: boolean;
      isLocal: boolean;
      isActiveSpeaker: boolean;
    }> = [];

    // Local user first
    visible.push({
      userId: currentUserId,
      displayName: "You",
      videoStream: localStream,
      isCameraOff,
      isMuted,
      isLocal: true,
      isActiveSpeaker: activeSpeakerId === currentUserId,
    });

    // Remote participants
    for (const [userId, participant] of participants) {
      if (userId === currentUserId || isSystemUserId(userId)) continue;
      visible.push({
        userId,
        displayName: getDisplayName(userId),
        videoStream: participant.videoStream ?? null,
        isCameraOff: participant.isCameraOff,
        isMuted: participant.isMuted,
        isLocal: false,
        isActiveSpeaker: activeSpeakerId === userId,
      });
    }

    return visible;
  }, [
    currentUserId,
    localStream,
    isCameraOff,
    isMuted,
    activeSpeakerId,
    participants,
    getDisplayName,
  ]);

  const updatePopoutContent = useCallback(() => {
    const pipWin = popoutWindowRef.current;
    if (!pipWin || pipWin.closed) {
      setIsPopoutActive(false);
      return;
    }

    const doc = pipWin.document;
    const allParticipants = getVisibleParticipants();
    const totalCount = allParticipants.length;

    // Determine which participants to show (max 4 tiles)
    // Prioritize: active speaker, local, then others
    let showParticipants = allParticipants;
    if (totalCount > 4) {
      const activeSpeaker = allParticipants.find((p) => p.isActiveSpeaker && !p.isLocal);
      const local = allParticipants.find((p) => p.isLocal);
      const others = allParticipants.filter((p) => !p.isLocal && !p.isActiveSpeaker);
      showParticipants = [local, activeSpeaker, ...others].filter(Boolean).slice(0, 4) as typeof allParticipants;
    }

    // Update count badge
    const countEl = doc.getElementById("p-count");
    if (countEl) countEl.textContent = `${totalCount} in call`;

    // Update video grid
    const grid = doc.getElementById("p-videos");
    if (!grid) return;

    const layoutClass =
      showParticipants.length === 1
        ? "single"
        : showParticipants.length === 2
          ? "dual"
          : "multi";
    grid.className = `popout-videos ${layoutClass}`;

    const currentIds = new Set(showParticipants.map((p) => p.userId));

    // Remove tiles no longer visible
    for (const child of Array.from(grid.children)) {
      const tileUserId = (child as HTMLElement).dataset.userId;
      if (tileUserId && !currentIds.has(tileUserId)) {
        const vid = videoElementsRef.current.get(tileUserId);
        if (vid) {
          vid.srcObject = null;
          videoElementsRef.current.delete(tileUserId);
        }
        child.remove();
      }
    }

    // Add/update tiles
    for (const participant of showParticipants) {
      let tile = doc.querySelector(
        `[data-user-id="${participant.userId}"]`
      ) as HTMLElement | null;

      if (!tile) {
        tile = doc.createElement("div");
        tile.className = "video-tile";
        tile.dataset.userId = participant.userId;
        tile.innerHTML = `
          <div class="avatar-placeholder" style="display: none;">
            <div class="avatar-circle"></div>
          </div>
          <video autoplay playsinline muted style="display: none;"></video>
          <div class="label">
            <span class="label-name"></span>
            <span class="label-muted" style="display: none;">${MIC_OFF_SMALL_SVG}</span>
          </div>
        `;
        grid.appendChild(tile);
      }

      // Update speaking state
      tile.classList.toggle("speaking", participant.isActiveSpeaker);

      // Update video/avatar
      const video = tile.querySelector("video") as HTMLVideoElement;
      const avatar = tile.querySelector(".avatar-placeholder") as HTMLElement;
      const avatarCircle = tile.querySelector(".avatar-circle") as HTMLElement;
      const labelName = tile.querySelector(".label-name") as HTMLElement;
      const labelMuted = tile.querySelector(".label-muted") as HTMLElement;

      if (participant.videoStream && !participant.isCameraOff) {
        video.style.display = "block";
        avatar.style.display = "none";
        if (video.srcObject !== participant.videoStream) {
          video.srcObject = participant.videoStream;
          video.play().catch(() => {});
          videoElementsRef.current.set(participant.userId, video);
        }
        if (participant.isLocal) {
          video.style.transform = "scaleX(-1)";
        }
      } else {
        video.style.display = "none";
        avatar.style.display = "flex";
        const initial = (participant.displayName || "?")[0]?.toUpperCase() || "?";
        avatarCircle.textContent = initial;
        if (video.srcObject) {
          video.srcObject = null;
          videoElementsRef.current.delete(participant.userId);
        }
      }

      // Update label
      labelName.textContent = participant.displayName;
      labelMuted.style.display = participant.isMuted ? "flex" : "none";
    }

    // Update control button states
    const muteBtn = doc.getElementById("btn-mute");
    const camBtn = doc.getElementById("btn-cam");
    if (muteBtn) {
      muteBtn.className = `ctrl-btn${isMuted ? " muted" : ""}`;
      muteBtn.innerHTML = isMuted ? MIC_OFF_SVG : MIC_ON_SVG;
    }
    if (camBtn) {
      camBtn.className = `ctrl-btn${isCameraOff ? " muted" : ""}`;
      camBtn.innerHTML = isCameraOff ? CAM_OFF_SVG : CAM_ON_SVG;
    }
  }, [getVisibleParticipants, isMuted, isCameraOff]);

  // ── Open popout ──

  const openPopout = useCallback(async () => {
    if (!isPopoutSupported || !isJoined || isPopoutActive) return;

    try {
      const pipWin = await window.documentPictureInPicture!.requestWindow({
        width: 380,
        height: 320,
        disallowReturnToOpener: false,
      });

      popoutWindowRef.current = pipWin;
      setIsPopoutActive(true);

      // Copy PolySans font stylesheets from the main window
      for (const sheet of document.styleSheets) {
        try {
          if (sheet.href) {
            const link = pipWin.document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            pipWin.document.head.appendChild(link);
          } else if (sheet.cssRules) {
            // Check if this stylesheet contains PolySans @font-face rules
            let hasRelevantFonts = false;
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSFontFaceRule && rule.cssText.includes("PolySans")) {
                hasRelevantFonts = true;
                break;
              }
            }
            if (hasRelevantFonts) {
              const style = pipWin.document.createElement("style");
              let fontRules = "";
              for (const rule of sheet.cssRules) {
                if (rule instanceof CSSFontFaceRule) {
                  fontRules += rule.cssText + "\n";
                }
              }
              style.textContent = fontRules;
              pipWin.document.head.appendChild(style);
            }
          }
        } catch {
          // CORS / security — skip
        }
      }

      // Inject popout styles
      const style = pipWin.document.createElement("style");
      style.textContent = POPOUT_CSS;
      pipWin.document.head.appendChild(style);

      pipWin.document.title = "Conclave — Mini Meet";

      // Build DOM — no header bar, just the video grid + floating controls overlay
      pipWin.document.body.innerHTML = `
        <div class="popout-root">
          <div class="popout-badge">
            <span class="popout-badge-dot"></span>
            <span id="p-count"></span>
          </div>
          <div id="p-videos" class="popout-videos single"></div>
          <div class="popout-controls">
            <button id="btn-mute" class="ctrl-btn" title="Toggle Mute">${MIC_ON_SVG}</button>
            <button id="btn-cam" class="ctrl-btn" title="Toggle Camera">${CAM_ON_SVG}</button>
            <div class="ctrl-divider"></div>
            <button id="btn-leave" class="ctrl-btn leave" title="Leave Call">${PHONE_SVG}</button>
          </div>
        </div>
      `;

      // Wire up button handlers via refs — always calls the latest callback
      pipWin.document.getElementById("btn-mute")?.addEventListener("click", () => {
        onToggleMuteRef.current();
      });

      pipWin.document.getElementById("btn-cam")?.addEventListener("click", () => {
        onToggleCameraRef.current();
      });

      pipWin.document.getElementById("btn-leave")?.addEventListener("click", () => {
        onLeaveRef.current();
        pipWin.close();
      });

      // Initial render
      updatePopoutContent();

      // Start update loop
      updateIntervalRef.current = setInterval(updatePopoutContent, 250);

      // Listen for close
      pipWin.addEventListener("pagehide", () => {
        setIsPopoutActive(false);
        popoutWindowRef.current = null;
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        for (const vid of videoElementsRef.current.values()) {
          vid.srcObject = null;
        }
        videoElementsRef.current.clear();
      });
    } catch (err) {
      console.warn("[Popout] Failed to open popout:", err);
    }
  }, [
    isPopoutSupported,
    isJoined,
    isPopoutActive,
    updatePopoutContent,
  ]);

  // ── Close popout ──

  const closePopout = useCallback(() => {
    const pipWin = popoutWindowRef.current;
    if (pipWin && !pipWin.closed) {
      pipWin.close();
    }
    setIsPopoutActive(false);
    popoutWindowRef.current = null;
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  // ── Sync state changes into the popout ──

  useEffect(() => {
    if (!isPopoutActive || !popoutWindowRef.current) return;
    updatePopoutContent();
  }, [isPopoutActive, updatePopoutContent]);

  // ── Close when leaving the call ──

  useEffect(() => {
    if (!isJoined && isPopoutActive) {
      closePopout();
    }
  }, [isJoined, isPopoutActive, closePopout]);

  // ── Cleanup on unmount ──

  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      const pipWin = popoutWindowRef.current;
      if (pipWin && !pipWin.closed) {
        pipWin.close();
      }
    };
  }, []);

  return {
    isPopoutActive,
    isPopoutSupported,
    openPopout,
    closePopout,
  };
}
