import { Admin } from "../../../config/classes/Admin.js";
import type { Room } from "../../../config/classes/Room.js";
import { Logger } from "../../../utilities/loggers.js";
import { cleanupRoom } from "../../rooms.js";
import { emitUserLeft } from "../../notifications.js";
import type { ConnectionContext } from "../context.js";
import { registerAdminHandlers } from "./adminHandlers.js";

const promoteNextAdmin = (room: Room): Admin | null => {
  for (const client of room.clients.values()) {
    if (client instanceof Admin || client.isGhost) continue;
    Object.setPrototypeOf(client, Admin.prototype);
    return client as Admin;
  }
  return null;
};

export const registerDisconnectHandlers = (
  context: ConnectionContext,
): void => {
  const { socket, state } = context;

  socket.on("disconnect", () => {
    Logger.info(`Client disconnected: ${socket.id}`);

    if (context.currentRoom && context.currentClient) {
      const userId = context.currentClient.id;
      const roomId = context.currentRoom.id;
      const roomChannelId = context.currentRoom.channelId;
      const wasAdmin = context.currentClient instanceof Admin;
      const activeClient = context.currentRoom.getClient(userId);

      if (!activeClient) {
        Logger.info(
          `Stale disconnect for ${userId} in room ${roomId}; client already removed.`,
        );
      } else if (activeClient !== context.currentClient) {
        Logger.info(
          `Stale disconnect for ${userId} in room ${roomId}; active session exists.`,
        );
      } else {
        context.currentRoom.removeClient(userId);
        if (context.currentClient.isGhost) {
          emitUserLeft(context.currentRoom, userId, {
            ghostOnly: true,
            excludeUserId: userId,
          });
        } else {
          socket.to(roomChannelId).emit("userLeft", { userId });
        }

        if (wasAdmin) {
          if (!context.currentRoom.hasActiveAdmin()) {
            const promoted = promoteNextAdmin(context.currentRoom);
            if (promoted) {
              Logger.info(
                `Promoted ${promoted.id} to admin in room ${roomId} after host disconnect.`,
              );
              const promotedContext = (promoted.socket as any).data
                ?.context as ConnectionContext | undefined;
              if (promotedContext) {
                promotedContext.currentClient = promoted;
                promotedContext.currentRoom = context.currentRoom;
                registerAdminHandlers(promotedContext, { roomId });
              }
              if (context.currentRoom.cleanupTimer) {
                context.currentRoom.stopCleanupTimer();
              }
              const pendingUsers = Array.from(
                context.currentRoom.pendingClients.values(),
              ).map((pending) => ({
                userId: pending.userKey,
                displayName: pending.displayName || pending.userKey,
              }));
              promoted.socket.emit("pendingUsersSnapshot", {
                users: pendingUsers,
                roomId,
              });
              promoted.socket.emit("roomLockChanged", {
                locked: context.currentRoom.isLocked,
                roomId,
              });
              promoted.socket.emit("hostAssigned", { roomId });
              if (context.currentRoom.pendingClients.size > 0) {
                for (const pending of context.currentRoom.pendingClients.values()) {
                  pending.socket.emit("waitingRoomStatus", {
                    message: "A host is available to let you in.",
                    roomId,
                  });
                }
              }
            } else {
              Logger.info(
                `Last admin left room ${roomId}. Room remains open without an admin.`,
              );
              if (context.currentRoom.pendingClients.size > 0) {
                Logger.info(
                  `Room ${roomId} has pending users but no admins. Notifying waiting clients.`,
                );
                for (const pending of context.currentRoom.pendingClients.values()) {
                  pending.socket.emit("waitingRoomStatus", {
                    message: "No one to let you in.",
                    roomId,
                  });
                }
              }
              context.currentRoom.startCleanupTimer(() => {
                if (state.rooms.has(roomChannelId)) {
                  const room = state.rooms.get(roomChannelId);
                  if (room) {
                    if (room.hasActiveAdmin()) {
                      return;
                    }
                    if (room.pendingClients.size > 0) {
                      for (const pending of room.pendingClients.values()) {
                        pending.socket.emit("waitingRoomStatus", {
                          message: "No one to let you in.",
                          roomId,
                        });
                      }
                    }
                    if (room.isEmpty()) {
                      Logger.info(
                        `Cleanup executed for room ${roomId}. Room is empty.`,
                      );
                      cleanupRoom(state, roomChannelId);
                    }
                  }
                }
              });
            }
          } else {
            Logger.info(`Admin left room ${roomId}, but other admins remain.`);
          }
        }

        if (state.rooms.has(roomChannelId)) {
          cleanupRoom(state, roomChannelId);
        }

        Logger.info(`User ${userId} left room ${roomId}`);

        if (state.rooms.has(roomChannelId)) {
          const room = state.rooms.get(roomChannelId);
          if (room) {
            const newQuality = room.updateVideoQuality();
            if (newQuality) {
              socket
                .to(roomChannelId)
                .emit("setVideoQuality", { quality: newQuality });
            }
          }
        }
      }
    }

    if (
      !context.currentClient &&
      context.pendingRoomChannelId &&
      context.pendingUserKey
    ) {
      const pendingRoom = state.rooms.get(context.pendingRoomChannelId);
      if (pendingRoom) {
        const pending = pendingRoom.pendingClients.get(context.pendingUserKey);
        if (pending?.socket?.id === socket.id) {
          pendingRoom.removePendingClient(context.pendingUserKey);
          for (const admin of pendingRoom.getAdmins()) {
            admin.socket.emit("pendingUserLeft", {
              userId: context.pendingUserKey,
              roomId: context.pendingRoomId,
            });
          }
          if (pendingRoom.isEmpty()) {
            cleanupRoom(state, context.pendingRoomChannelId);
          }
        }
      }
    }

    context.currentRoom = null;
    context.currentClient = null;
    context.pendingRoomId = null;
    context.pendingRoomChannelId = null;
    context.pendingUserKey = null;
    context.currentUserKey = null;
  });
};
