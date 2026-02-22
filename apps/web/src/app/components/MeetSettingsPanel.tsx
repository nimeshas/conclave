"use client";

import {
  Globe,
  Link2,
  Lock,
  MessageSquareLock,
  RotateCw,
  ShieldBan,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  WebinarConfigSnapshot,
  WebinarLinkResponse,
  WebinarUpdateRequest,
} from "../lib/types";

const DEFAULT_WEBINAR_CAP = 500;
const MIN_WEBINAR_CAP = 1;
const MAX_WEBINAR_CAP = 5000;

interface MeetSettingsPanelProps {
  isRoomLocked: boolean;
  onToggleLock?: () => void;
  isNoGuests: boolean;
  onToggleNoGuests?: () => void;
  isChatLocked: boolean;
  onToggleChatLock?: () => void;
  isTtsDisabled: boolean;
  onToggleTtsDisabled?: () => void;
  webinarConfig?: WebinarConfigSnapshot | null;
  webinarRole?: "attendee" | "participant" | "host" | null;
  webinarLink?: string | null;
  onSetWebinarLink?: (link: string | null) => void;
  onGetWebinarConfig?: () => Promise<WebinarConfigSnapshot | null>;
  onUpdateWebinarConfig?: (
    update: WebinarUpdateRequest,
  ) => Promise<WebinarConfigSnapshot | null>;
  onGenerateWebinarLink?: () => Promise<WebinarLinkResponse | null>;
  onRotateWebinarLink?: () => Promise<WebinarLinkResponse | null>;
  onClose: () => void;
}

const parseAttendeeCap = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(MIN_WEBINAR_CAP, Math.min(MAX_WEBINAR_CAP, parsed));
};

const copyToClipboard = async (value: string): Promise<boolean> => {
  if (!value.trim()) return false;
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

export default function MeetSettingsPanel({
  isRoomLocked,
  onToggleLock,
  isNoGuests,
  onToggleNoGuests,
  isChatLocked,
  onToggleChatLock,
  isTtsDisabled,
  onToggleTtsDisabled,
  webinarConfig,
  webinarRole,
  webinarLink,
  onSetWebinarLink,
  onGetWebinarConfig,
  onUpdateWebinarConfig,
  onGenerateWebinarLink,
  onRotateWebinarLink,
  onClose,
}: MeetSettingsPanelProps) {
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [maxAttendeesInput, setMaxAttendeesInput] = useState(
    String(webinarConfig?.maxAttendees ?? DEFAULT_WEBINAR_CAP),
  );
  const [webinarNotice, setWebinarNotice] = useState<string | null>(null);
  const [webinarError, setWebinarError] = useState<string | null>(null);
  const [isWebinarWorking, setIsWebinarWorking] = useState(false);

  useEffect(() => {
    setMaxAttendeesInput(
      String(webinarConfig?.maxAttendees ?? DEFAULT_WEBINAR_CAP),
    );
  }, [webinarConfig?.maxAttendees]);

  const refreshWebinarConfig = useCallback(async () => {
    if (!onGetWebinarConfig) return;
    await onGetWebinarConfig();
  }, [onGetWebinarConfig]);

  useEffect(() => {
    void refreshWebinarConfig();
  }, [refreshWebinarConfig]);

  const withWebinarTask = useCallback(
    async (
      task: () => Promise<void>,
      options?: { successMessage?: string; clearInviteInput?: boolean },
    ) => {
      setWebinarError(null);
      setWebinarNotice(null);
      setIsWebinarWorking(true);
      try {
        await task();
        if (options?.clearInviteInput) {
          setInviteCodeInput("");
        }
        if (options?.successMessage) {
          setWebinarNotice(options.successMessage);
        }
      } catch (error) {
        setWebinarError(
          error instanceof Error ? error.message : "Webinar update failed.",
        );
      } finally {
        setIsWebinarWorking(false);
      }
    },
    [],
  );

  const updateWebinarConfig = useCallback(
    async (update: WebinarUpdateRequest) => {
      if (!onUpdateWebinarConfig) {
        throw new Error("Webinar controls are unavailable.");
      }
      const next = await onUpdateWebinarConfig(update);
      if (!next) {
        throw new Error("Webinar update was rejected.");
      }
    },
    [onUpdateWebinarConfig],
  );

  const applyWebinarLink = useCallback(
    async (response: WebinarLinkResponse | null, label: string) => {
      if (!response?.link) {
        throw new Error("Webinar link unavailable.");
      }
      onSetWebinarLink?.(response.link);
      const copied = await copyToClipboard(response.link);
      setWebinarNotice(copied ? `${label} copied.` : `${label} ready.`);
    },
    [onSetWebinarLink],
  );

  const currentLink = webinarLink?.trim() || "";
  const attendeeCapCandidate = parseAttendeeCap(maxAttendeesInput);
  const attendeeCount = webinarConfig?.attendeeCount ?? 0;
  const attendeeCap = webinarConfig?.maxAttendees ?? DEFAULT_WEBINAR_CAP;

  return (
    <div
      className="absolute bottom-14 left-1/2 z-50 max-h-[70vh] w-[320px] -translate-x-1/2 overflow-y-auto rounded-xl border border-white/10 bg-[#0f0f0f]/95 p-2.5 shadow-xl backdrop-blur-md"
      style={{ fontFamily: "'PolySans Trial', sans-serif" }}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-[#FEFCD9]/45"
            style={{ fontFamily: "'PolySans Mono', monospace" }}
          >
            Meeting settings
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#FEFCD9]/45 transition hover:bg-[#FEFCD9]/10 hover:text-[#FEFCD9]"
          aria-label="Close meeting settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={onToggleLock}
          disabled={!onToggleLock}
          aria-pressed={isRoomLocked}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#FEFCD9]/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Lock
              className={`h-4 w-4 ${
                isRoomLocked ? "text-amber-300" : "text-[#FEFCD9]/60"
              }`}
            />
            <span className="text-[#FEFCD9]">Lock meeting</span>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              isRoomLocked
                ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                : "border-white/10 text-[#FEFCD9]/40"
            }`}
          >
            {isRoomLocked ? "On" : "Off"}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleNoGuests}
          disabled={!onToggleNoGuests}
          aria-pressed={isNoGuests}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#FEFCD9]/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <ShieldBan
              className={`h-4 w-4 ${
                isNoGuests ? "text-amber-300" : "text-[#FEFCD9]/60"
              }`}
            />
            <span className="text-[#FEFCD9]">Block guests</span>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              isNoGuests
                ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                : "border-white/10 text-[#FEFCD9]/40"
            }`}
          >
            {isNoGuests ? "On" : "Off"}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleChatLock}
          disabled={!onToggleChatLock}
          aria-pressed={isChatLocked}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#FEFCD9]/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <MessageSquareLock
              className={`h-4 w-4 ${
                isChatLocked ? "text-amber-300" : "text-[#FEFCD9]/60"
              }`}
            />
            <span className="text-[#FEFCD9]">Lock chat</span>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              isChatLocked
                ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                : "border-white/10 text-[#FEFCD9]/40"
            }`}
          >
            {isChatLocked ? "On" : "Off"}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleTtsDisabled}
          disabled={!onToggleTtsDisabled}
          aria-pressed={isTtsDisabled}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#FEFCD9]/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <VolumeX
              className={`h-4 w-4 ${
                isTtsDisabled ? "text-amber-300" : "text-[#FEFCD9]/60"
              }`}
            />
            <span className="text-[#FEFCD9]">Disable TTS</span>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              isTtsDisabled
                ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                : "border-white/10 text-[#FEFCD9]/40"
            }`}
          >
            {isTtsDisabled ? "On" : "Off"}
          </span>
        </button>
      </div>

      <div className="my-3 h-px bg-white/10" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-[#FEFCD9]/45"
            style={{ fontFamily: "'PolySans Mono', monospace" }}
          >
            Webinar mode
          </p>
          {webinarRole ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#FEFCD9]/50">
              {webinarRole}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() =>
            void withWebinarTask(
              async () => {
                await updateWebinarConfig({
                  enabled: !Boolean(webinarConfig?.enabled),
                });
              },
              {
                successMessage: webinarConfig?.enabled
                  ? "Webinar disabled."
                  : "Webinar enabled.",
              },
            )
          }
          disabled={isWebinarWorking}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#FEFCD9]/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Users
              className={`h-4 w-4 ${
                webinarConfig?.enabled ? "text-emerald-300" : "text-[#FEFCD9]/60"
              }`}
            />
            <span className="text-[#FEFCD9]">Enable webinar</span>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              webinarConfig?.enabled
                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                : "border-white/10 text-[#FEFCD9]/40"
            }`}
          >
            {webinarConfig?.enabled ? "On" : "Off"}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            void withWebinarTask(
              async () => {
                await updateWebinarConfig({
                  publicAccess: !Boolean(webinarConfig?.publicAccess),
                });
              },
              {
                successMessage: webinarConfig?.publicAccess
                  ? "Public access disabled."
                  : "Public access enabled.",
              },
            )
          }
          disabled={isWebinarWorking || !webinarConfig?.enabled}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#FEFCD9]/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Globe
              className={`h-4 w-4 ${
                webinarConfig?.publicAccess
                  ? "text-emerald-300"
                  : "text-[#FEFCD9]/60"
              }`}
            />
            <span className="text-[#FEFCD9]">Public webinar access</span>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              webinarConfig?.publicAccess
                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                : "border-white/10 text-[#FEFCD9]/40"
            }`}
          >
            {webinarConfig?.publicAccess ? "On" : "Off"}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            void withWebinarTask(
              async () => {
                await updateWebinarConfig({
                  locked: !Boolean(webinarConfig?.locked),
                });
              },
              {
                successMessage: webinarConfig?.locked
                  ? "Webinar unlocked."
                  : "Webinar locked.",
              },
            )
          }
          disabled={isWebinarWorking || !webinarConfig?.enabled}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#FEFCD9]/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Lock
              className={`h-4 w-4 ${
                webinarConfig?.locked ? "text-amber-300" : "text-[#FEFCD9]/60"
              }`}
            />
            <span className="text-[#FEFCD9]">Lock webinar attendees</span>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              webinarConfig?.locked
                ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                : "border-white/10 text-[#FEFCD9]/40"
            }`}
          >
            {webinarConfig?.locked ? "On" : "Off"}
          </span>
        </button>

        <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
          <p className="text-[11px] text-[#FEFCD9]/60">
            Attendees: <span className="text-[#FEFCD9]">{attendeeCount}</span> /{" "}
            <span className="text-[#FEFCD9]">{attendeeCap}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={MIN_WEBINAR_CAP}
              max={MAX_WEBINAR_CAP}
              value={maxAttendeesInput}
              onChange={(event) => setMaxAttendeesInput(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#FEFCD9] outline-none placeholder:text-[#FEFCD9]/30 focus:border-[#FEFCD9]/30"
              placeholder="Attendee cap"
            />
            <button
              type="button"
              disabled={
                isWebinarWorking ||
                !webinarConfig?.enabled ||
                attendeeCapCandidate == null
              }
              onClick={() =>
                void withWebinarTask(
                  async () => {
                    if (attendeeCapCandidate == null) {
                      throw new Error("Enter a valid attendee cap.");
                    }
                    await updateWebinarConfig({
                      maxAttendees: attendeeCapCandidate,
                    });
                  },
                  { successMessage: "Attendee cap updated." },
                )
              }
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#FEFCD9] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
          <p className="text-[11px] text-[#FEFCD9]/60">
            Invite code:{" "}
            <span className="text-[#FEFCD9]">
              {webinarConfig?.requiresInviteCode ? "Required" : "Not required"}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(event) => setInviteCodeInput(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#FEFCD9] outline-none placeholder:text-[#FEFCD9]/30 focus:border-[#FEFCD9]/30"
              placeholder="Set invite code"
            />
            <button
              type="button"
              disabled={
                isWebinarWorking ||
                !webinarConfig?.enabled ||
                !inviteCodeInput.trim()
              }
              onClick={() =>
                void withWebinarTask(
                  async () => {
                    await updateWebinarConfig({
                      inviteCode: inviteCodeInput.trim(),
                    });
                  },
                  { successMessage: "Invite code saved.", clearInviteInput: true },
                )
              }
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#FEFCD9] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              disabled={isWebinarWorking || !webinarConfig?.requiresInviteCode}
              onClick={() =>
                void withWebinarTask(
                  async () => {
                    await updateWebinarConfig({ inviteCode: null });
                  },
                  { successMessage: "Invite code cleared." },
                )
              }
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#FEFCD9]/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[#FEFCD9]/60" />
            <input
              type="text"
              readOnly
              value={currentLink}
              placeholder="Generate webinar link"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#FEFCD9] outline-none placeholder:text-[#FEFCD9]/30"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={isWebinarWorking || !webinarConfig?.enabled}
              onClick={() =>
                void withWebinarTask(async () => {
                  if (!onGenerateWebinarLink) {
                    throw new Error("Link generation is unavailable.");
                  }
                  const response = await onGenerateWebinarLink();
                  await applyWebinarLink(response, "Webinar link");
                })
              }
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#FEFCD9] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate
            </button>
            <button
              type="button"
              disabled={isWebinarWorking || !webinarConfig?.enabled}
              onClick={() =>
                void withWebinarTask(async () => {
                  if (!onRotateWebinarLink) {
                    throw new Error("Link rotation is unavailable.");
                  }
                  const response = await onRotateWebinarLink();
                  await applyWebinarLink(response, "Rotated webinar link");
                })
              }
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#FEFCD9] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1">
                <RotateCw className="h-3 w-3" />
                Rotate
              </span>
            </button>
            <button
              type="button"
              disabled={isWebinarWorking || !currentLink}
              onClick={() =>
                void withWebinarTask(async () => {
                  const copied = await copyToClipboard(currentLink);
                  if (!copied) {
                    throw new Error("Clipboard access failed.");
                  }
                }, { successMessage: "Webinar link copied." })
              }
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#FEFCD9] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy
            </button>
          </div>
        </div>

        {webinarNotice ? (
          <p className="text-[11px] text-emerald-300/90">{webinarNotice}</p>
        ) : null}
        {webinarError ? (
          <p className="text-[11px] text-[#F95F4A]">{webinarError}</p>
        ) : null}
      </div>
    </div>
  );
}
