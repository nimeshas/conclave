import { createHmac, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import type {
  WebinarConfigSnapshot,
  WebinarFeedMode,
  WebinarUpdateRequest,
} from "../types.js";

export const DEFAULT_WEBINAR_MAX_ATTENDEES = 500;
export const MIN_WEBINAR_MAX_ATTENDEES = 1;
export const MAX_WEBINAR_MAX_ATTENDEES = 5000;

export type WebinarRoomConfig = {
  enabled: boolean;
  publicAccess: boolean;
  maxAttendees: number;
  locked: boolean;
  inviteCodeHash: string | null;
  linkVersion: number;
  feedMode: WebinarFeedMode;
};

export type WebinarLinkTokenPayload = {
  typ: "webinar_link";
  roomId: string;
  clientId: string;
  linkVersion: number;
};

export const createDefaultWebinarRoomConfig = (): WebinarRoomConfig => ({
  enabled: false,
  publicAccess: false,
  maxAttendees: DEFAULT_WEBINAR_MAX_ATTENDEES,
  locked: false,
  inviteCodeHash: null,
  linkVersion: 1,
  feedMode: "active-speaker",
});

export const getOrCreateWebinarRoomConfig = (
  webinarConfigs: Map<string, WebinarRoomConfig>,
  roomChannelId: string,
): WebinarRoomConfig => {
  const existing = webinarConfigs.get(roomChannelId);
  if (existing) {
    return existing;
  }

  const created = createDefaultWebinarRoomConfig();
  webinarConfigs.set(roomChannelId, created);
  return created;
};

export const normalizeWebinarMaxAttendees = (
  value: number,
): number => {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid webinar attendee cap");
  }

  const normalized = Math.floor(value);
  if (normalized < MIN_WEBINAR_MAX_ATTENDEES) {
    throw new Error(
      `Webinar attendee cap must be at least ${MIN_WEBINAR_MAX_ATTENDEES}`,
    );
  }
  if (normalized > MAX_WEBINAR_MAX_ATTENDEES) {
    throw new Error(
      `Webinar attendee cap must be at most ${MAX_WEBINAR_MAX_ATTENDEES}`,
    );
  }

  return normalized;
};

const hashInviteCode = (inviteCode: string): string => {
  return createHmac("sha256", config.sfuSecret).update(inviteCode).digest("hex");
};

export const verifyInviteCode = (
  inviteCode: string,
  expectedHash: string,
): boolean => {
  const candidateHash = hashInviteCode(inviteCode);
  const expected = Buffer.from(expectedHash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");

  if (expected.length !== candidate.length) {
    return false;
  }

  return timingSafeEqual(expected, candidate);
};

export const updateWebinarRoomConfig = (
  webinarConfig: WebinarRoomConfig,
  update: WebinarUpdateRequest,
): { changed: boolean; linkVersionBumped: boolean } => {
  let changed = false;
  let linkVersionBumped = false;

  if (typeof update.enabled === "boolean" && webinarConfig.enabled !== update.enabled) {
    if (webinarConfig.enabled && !update.enabled) {
      webinarConfig.linkVersion += 1;
      linkVersionBumped = true;
    }
    webinarConfig.enabled = update.enabled;
    changed = true;
  }

  if (
    typeof update.publicAccess === "boolean" &&
    webinarConfig.publicAccess !== update.publicAccess
  ) {
    webinarConfig.publicAccess = update.publicAccess;
    changed = true;
  }

  if (typeof update.locked === "boolean" && webinarConfig.locked !== update.locked) {
    webinarConfig.locked = update.locked;
    changed = true;
  }

  if (typeof update.maxAttendees === "number") {
    const normalized = normalizeWebinarMaxAttendees(update.maxAttendees);
    if (webinarConfig.maxAttendees !== normalized) {
      webinarConfig.maxAttendees = normalized;
      changed = true;
    }
  }

  if (update.inviteCode !== undefined) {
    const normalizedInviteCode =
      typeof update.inviteCode === "string" ? update.inviteCode.trim() : "";
    const nextHash = normalizedInviteCode
      ? hashInviteCode(normalizedInviteCode)
      : null;
    if (webinarConfig.inviteCodeHash !== nextHash) {
      webinarConfig.inviteCodeHash = nextHash;
      changed = true;
    }
  }

  return { changed, linkVersionBumped };
};

export const toWebinarConfigSnapshot = (
  webinarConfig: WebinarRoomConfig,
  attendeeCount: number,
): WebinarConfigSnapshot => ({
  enabled: webinarConfig.enabled,
  publicAccess: webinarConfig.publicAccess,
  locked: webinarConfig.locked,
  maxAttendees: webinarConfig.maxAttendees,
  attendeeCount,
  requiresInviteCode: Boolean(webinarConfig.inviteCodeHash),
  feedMode: webinarConfig.feedMode,
});

export const createWebinarLinkToken = (payload: {
  roomId: string;
  clientId: string;
  linkVersion: number;
}): string => {
  return jwt.sign(
    {
      typ: "webinar_link",
      roomId: payload.roomId,
      clientId: payload.clientId,
      linkVersion: payload.linkVersion,
    } satisfies WebinarLinkTokenPayload,
    config.sfuSecret,
  );
};

export const verifyWebinarLinkToken = (
  token: string,
): WebinarLinkTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.sfuSecret);
    if (!decoded || typeof decoded !== "object") {
      return null;
    }

    const payload = decoded as Partial<WebinarLinkTokenPayload>;
    if (
      payload.typ !== "webinar_link" ||
      typeof payload.roomId !== "string" ||
      typeof payload.clientId !== "string" ||
      typeof payload.linkVersion !== "number"
    ) {
      return null;
    }

    return payload as WebinarLinkTokenPayload;
  } catch {
    return null;
  }
};

export const getWebinarBaseUrl = (): string => {
  const configured = process.env.WEBINAR_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "https://conclave.acmvit.in";
};
