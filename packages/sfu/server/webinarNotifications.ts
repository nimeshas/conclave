import type { Server as SocketIOServer } from "socket.io";
import type { Room } from "../config/classes/Room.js";
import type {
  WebinarAttendeeCountChangedNotification,
  WebinarConfigSnapshot,
  WebinarFeedChangedNotification,
  WebinarLinkResponse,
} from "../types.js";
import type { SfuState } from "./state.js";
import {
  createWebinarLinkToken,
  getOrCreateWebinarRoomConfig,
  getWebinarBaseUrl,
  toWebinarConfigSnapshot,
} from "./webinar.js";

export const getWebinarConfigSnapshot = (
  state: SfuState,
  room: Room,
): WebinarConfigSnapshot => {
  const webinarConfig = getOrCreateWebinarRoomConfig(
    state.webinarConfigs,
    room.channelId,
  );
  const attendeeCount = room.getWebinarAttendeeCount();
  return toWebinarConfigSnapshot(webinarConfig, attendeeCount);
};

export const emitWebinarConfigChanged = (
  io: SocketIOServer,
  state: SfuState,
  room: Room,
): void => {
  io.to(room.channelId).emit(
    "webinar:configChanged",
    getWebinarConfigSnapshot(state, room),
  );
};

export const emitWebinarAttendeeCountChanged = (
  io: SocketIOServer,
  state: SfuState,
  room: Room,
): void => {
  const webinarConfig = getOrCreateWebinarRoomConfig(
    state.webinarConfigs,
    room.channelId,
  );

  io.to(room.channelId).emit("webinar:attendeeCountChanged", {
    roomId: room.id,
    attendeeCount: room.getWebinarAttendeeCount(),
    maxAttendees: webinarConfig.maxAttendees,
  } satisfies WebinarAttendeeCountChangedNotification);
};

export const emitWebinarFeedChanged = (
  io: SocketIOServer,
  room: Room,
): void => {
  const snapshot = room.refreshWebinarFeedSnapshot();
  if (!snapshot.changed) {
    return;
  }

  io.to(room.channelId).emit("webinar:feedChanged", {
    roomId: room.id,
    speakerUserId: snapshot.speakerUserId,
    producers: snapshot.producers,
  } satisfies WebinarFeedChangedNotification);
};

export const getWebinarLinkResponse = (
  room: Room,
  options: {
    linkVersion: number;
    publicAccess: boolean;
  },
): WebinarLinkResponse => {
  const base = getWebinarBaseUrl();
  const path = `${base}/w/${encodeURIComponent(room.id)}`;

  if (options.publicAccess) {
    return {
      link: path,
      publicAccess: true,
      linkVersion: options.linkVersion,
    };
  }

  const signedToken = createWebinarLinkToken({
    roomId: room.id,
    clientId: room.clientId,
    linkVersion: options.linkVersion,
  });

  return {
    link: `${path}?wt=${encodeURIComponent(signedToken)}`,
    signedToken,
    publicAccess: false,
    linkVersion: options.linkVersion,
  };
};
