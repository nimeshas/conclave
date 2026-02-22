import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View as RNView } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Pressable, Text, TextInput, View } from "@/tw";
import {
  Check,
  ClipboardPenLine,
  Hand,
  Lock,
  LockOpen,
  Mic,
  MessageSquareLock,
  StickyNote,
  UserMinus,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { mediaDevices } from "react-native-webrtc";
import { useApps } from "@conclave/apps-sdk";
import { SHEET_COLORS, SHEET_THEME } from "./true-sheet-theme";
import type {
  WebinarConfigSnapshot,
  WebinarLinkResponse,
  WebinarUpdateRequest,
} from "../types";

interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

interface EnumeratedMediaDevice {
  kind: string;
  deviceId: string;
  label?: string;
}

interface SettingsSheetProps {
  visible: boolean;
  isHandRaised: boolean;
  isRoomLocked: boolean;
  isNoGuests: boolean;
  isChatLocked: boolean;
  isTtsDisabled: boolean;
  isAdmin?: boolean;
  selectedAudioInputDeviceId?: string;
  selectedAudioOutputDeviceId?: string;
  onOpenDisplayName?: () => void;
  onToggleHandRaised: () => void;
  onToggleRoomLock?: (locked: boolean) => void;
  onToggleNoGuests?: (noGuests: boolean) => void;
  onToggleChatLock?: (locked: boolean) => void;
  onToggleTtsDisabled?: (disabled: boolean) => void;
  onAudioInputDeviceChange?: (deviceId: string) => void;
  onAudioOutputDeviceChange?: (deviceId: string) => void;
  webinarConfig?: WebinarConfigSnapshot | null;
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

export function SettingsSheet({
  visible,
  isHandRaised,
  isRoomLocked,
  isNoGuests,
  isChatLocked,
  isTtsDisabled,
  isAdmin = false,
  selectedAudioInputDeviceId,
  selectedAudioOutputDeviceId,
  onOpenDisplayName,
  onToggleHandRaised,
  onToggleRoomLock,
  onToggleNoGuests,
  onToggleChatLock,
  onToggleTtsDisabled,
  onAudioInputDeviceChange,
  onAudioOutputDeviceChange,
  webinarConfig,
  webinarLink,
  onSetWebinarLink,
  onGetWebinarConfig,
  onUpdateWebinarConfig,
  onGenerateWebinarLink,
  onRotateWebinarLink,
  onClose,
}: SettingsSheetProps) {
  const { state: appsState, openApp, closeApp } = useApps();
  const sheetRef = useRef<TrueSheet>(null);
  const hasPresented = useRef(false);
  const isWhiteboardActive = appsState.activeAppId === "whiteboard";
  const [audioInputDevices, setAudioInputDevices] = useState<
    MediaDeviceOption[]
  >([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceOption[]
  >([]);
  const [isLoadingAudioDevices, setIsLoadingAudioDevices] = useState(false);
  const [audioDevicesError, setAudioDevicesError] = useState<string | null>(
    null
  );
  const [webinarInviteCodeInput, setWebinarInviteCodeInput] = useState("");
  const [webinarCapInput, setWebinarCapInput] = useState(
    String(webinarConfig?.maxAttendees ?? 500)
  );
  const [webinarNotice, setWebinarNotice] = useState<string | null>(null);
  const [webinarError, setWebinarError] = useState<string | null>(null);
  const [isWebinarWorking, setIsWebinarWorking] = useState(false);

  const speakerRouteOptions = useMemo<MediaDeviceOption[]>(
    () => [
      { deviceId: "route:auto", label: "Automatic" },
      { deviceId: "route:speaker", label: "Speaker" },
      { deviceId: "route:earpiece", label: "Earpiece" },
    ],
    []
  );

  const availableAudioOutputDevices =
    audioOutputDevices.length > 0 ? audioOutputDevices : speakerRouteOptions;

  const selectedAudioInputId = audioInputDevices.some(
    (device) => device.deviceId === selectedAudioInputDeviceId
  )
    ? selectedAudioInputDeviceId
    : audioInputDevices[0]?.deviceId;

  const selectedAudioOutputId = availableAudioOutputDevices.some(
    (device) => device.deviceId === selectedAudioOutputDeviceId
  )
    ? selectedAudioOutputDeviceId
    : availableAudioOutputDevices[0]?.deviceId;

  const handleDismiss = useCallback(() => {
    void sheetRef.current?.dismiss();
  }, []);

  const handleToggleWhiteboard = useCallback(() => {
    if (isWhiteboardActive) {
      closeApp();
      return;
    }
    openApp("whiteboard");
  }, [closeApp, isWhiteboardActive, openApp]);

  const handleDidDismiss = useCallback(() => {
    hasPresented.current = false;
    onClose();
  }, [onClose]);

  const trigger = useCallback((action: () => void) => {
    Haptics.selectionAsync().catch(() => {});
    action();
  }, []);

  const fetchAudioDevices = useCallback(async () => {
    if (!mediaDevices?.enumerateDevices) {
      setAudioDevicesError("Device selection is not supported on this device.");
      setAudioInputDevices([]);
      setAudioOutputDevices([]);
      return;
    }

    setIsLoadingAudioDevices(true);
    setAudioDevicesError(null);

    try {
      const devices = (await mediaDevices.enumerateDevices()) as
        | EnumeratedMediaDevice[]
        | null
        | undefined;

      if (!Array.isArray(devices)) {
        setAudioInputDevices([]);
        setAudioOutputDevices([]);
        return;
      }

      const nextAudioInputDevices = devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }));

      const nextAudioOutputDevices = devices
        .filter((device) => device.kind === "audiooutput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${index + 1}`,
        }));

      setAudioInputDevices(nextAudioInputDevices);
      setAudioOutputDevices(nextAudioOutputDevices);
    } catch (error) {
      console.error("[SettingsSheet] Failed to enumerate audio devices:", error);
      setAudioDevicesError("Unable to load audio devices.");
      setAudioInputDevices([]);
      setAudioOutputDevices([]);
    } finally {
      setIsLoadingAudioDevices(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      hasPresented.current = true;
      void sheetRef.current?.present(0);
      void fetchAudioDevices();
    } else if (hasPresented.current) {
      void sheetRef.current?.dismiss();
    }
  }, [fetchAudioDevices, visible]);

  useEffect(() => {
    setWebinarCapInput(String(webinarConfig?.maxAttendees ?? 500));
  }, [webinarConfig?.maxAttendees]);

  useEffect(() => {
    if (!visible || !isAdmin) return;
    void onGetWebinarConfig?.();
  }, [isAdmin, onGetWebinarConfig, visible]);

  useEffect(() => {
    return () => {
      if (hasPresented.current) {
        void sheetRef.current?.dismiss();
      }
    };
  }, []);

  useEffect(() => {
    const rtcMediaDevices = mediaDevices as typeof mediaDevices & {
      addEventListener?: (type: "devicechange", listener: () => void) => void;
      removeEventListener?: (
        type: "devicechange",
        listener: () => void
      ) => void;
    };

    if (
      !rtcMediaDevices.addEventListener ||
      !rtcMediaDevices.removeEventListener
    ) {
      return;
    }

    const handleDeviceChange = () => {
      if (!visible) return;
      void fetchAudioDevices();
    };

    rtcMediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      rtcMediaDevices.removeEventListener?.("devicechange", handleDeviceChange);
    };
  }, [fetchAudioDevices, visible]);

  const runWebinarTask = useCallback(
    async (
      task: () => Promise<void>,
      options?: { successMessage?: string; clearInviteInput?: boolean }
    ) => {
      setWebinarError(null);
      setWebinarNotice(null);
      setIsWebinarWorking(true);
      try {
        await task();
        if (options?.clearInviteInput) {
          setWebinarInviteCodeInput("");
        }
        if (options?.successMessage) {
          setWebinarNotice(options.successMessage);
        }
      } catch (error) {
        setWebinarError(
          error instanceof Error ? error.message : "Webinar update failed."
        );
      } finally {
        setIsWebinarWorking(false);
      }
    },
    []
  );

  const parsedWebinarCap = Number.parseInt(webinarCapInput, 10);
  const webinarCapValue = Number.isFinite(parsedWebinarCap)
    ? Math.max(1, Math.min(5000, parsedWebinarCap))
    : null;
  const webinarEnabled = Boolean(webinarConfig?.enabled);
  const webinarPublicAccess = Boolean(webinarConfig?.publicAccess);
  const webinarLocked = Boolean(webinarConfig?.locked);
  const webinarRequiresInviteCode = Boolean(webinarConfig?.requiresInviteCode);

  const copyWebinarLink = useCallback(async (link: string) => {
    if (!link.trim()) {
      throw new Error("No webinar link available.");
    }
    await Clipboard.setStringAsync(link);
  }, []);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={["auto"]}
      onDidDismiss={handleDidDismiss}
      {...SHEET_THEME}
    >
      <View style={styles.sheetContent}>
        <RNView style={styles.dragHandle} />

        <RNView style={styles.grid}>
          {isAdmin ? (
            <Pressable
              onPress={() =>
                trigger(() => {
                  handleToggleWhiteboard();
                  handleDismiss();
                })
              }
              style={({ pressed }) => [
                styles.gridItem,
                isWhiteboardActive && styles.gridItemActive,
                pressed && styles.gridItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isWhiteboardActive ? "Close whiteboard" : "Open whiteboard"
              }
              accessibilityState={{ selected: isWhiteboardActive }}
            >
              <StickyNote
                size={28}
                color={SHEET_COLORS.text}
                fill={isWhiteboardActive ? "rgba(254, 252, 217, 0.35)" : "transparent"}
                strokeWidth={1.5}
              />
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => trigger(onToggleHandRaised)}
            style={({ pressed }) => [
              styles.gridItem,
              isHandRaised && styles.gridItemHandActive,
              pressed && styles.gridItemPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle raise hand"
            accessibilityState={{ selected: isHandRaised }}
          >
            <Hand
              size={28}
              color={SHEET_COLORS.text}
              fill={isHandRaised ? "rgba(0, 0, 0, 0.35)" : "transparent"}
              strokeWidth={1.5}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              if (!onOpenDisplayName) return;
              trigger(onOpenDisplayName);
            }}
            style={({ pressed }) => [
              styles.gridItem,
              pressed && styles.gridItemPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Change display name"
          >
            <ClipboardPenLine size={28} color={SHEET_COLORS.text} strokeWidth={1.5} />
          </Pressable>

          {isAdmin ? (
            <Pressable
              onPress={() => {
                if (!onToggleRoomLock) return;
                trigger(() => onToggleRoomLock(!isRoomLocked));
              }}
              style={({ pressed }) => [
                styles.gridItem,
                isRoomLocked && styles.gridItemLockActive,
                pressed && styles.gridItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isRoomLocked ? "Unlock room" : "Lock room"}
              accessibilityState={{ selected: isRoomLocked }}
            >
              {isRoomLocked ? (
                <Lock
                  size={28}
                  color={SHEET_COLORS.text}
                  strokeWidth={1.5}
                />
              ) : (
                <LockOpen
                  size={28}
                  color={SHEET_COLORS.text}
                  strokeWidth={1.5}
                />
              )}
            </Pressable>
          ) : null}
          {isAdmin ? (
            <Pressable
              onPress={() => {
                if (!onToggleNoGuests) return;
                trigger(() => onToggleNoGuests(!isNoGuests));
              }}
              style={({ pressed }) => [
                styles.gridItem,
                isNoGuests && styles.gridItemHandActive,
                pressed && styles.gridItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isNoGuests ? "Allow guests" : "Block guests"}
              accessibilityState={{ selected: isNoGuests }}
            >
              <UserMinus size={28} color={SHEET_COLORS.text} strokeWidth={1.5} />
            </Pressable>
          ) : null}
          {isAdmin ? (
            <Pressable
              onPress={() => {
                if (!onToggleChatLock) return;
                trigger(() => onToggleChatLock(!isChatLocked));
              }}
              style={({ pressed }) => [
                styles.gridItem,
                isChatLocked && styles.gridItemLockActive,
                pressed && styles.gridItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isChatLocked ? "Unlock chat" : "Lock chat"}
              accessibilityState={{ selected: isChatLocked }}
            >
              <MessageSquareLock
                size={28}
                color={SHEET_COLORS.text}
                strokeWidth={1.5}
              />
            </Pressable>
          ) : null}
          {isAdmin ? (
            <Pressable
              onPress={() => {
                if (!onToggleTtsDisabled) return;
                trigger(() => onToggleTtsDisabled(!isTtsDisabled));
              }}
              style={({ pressed }) => [
                styles.gridItem,
                isTtsDisabled && styles.gridItemActive,
                pressed && styles.gridItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isTtsDisabled ? "Enable text to speech" : "Disable text to speech"}
              accessibilityState={{ selected: isTtsDisabled }}
            >
              <VolumeX size={28} color={SHEET_COLORS.text} strokeWidth={1.5} />
            </Pressable>
          ) : null}
        </RNView>

        {isAdmin ? (
          <RNView style={styles.webinarSection}>
            <RNView style={styles.webinarHeaderRow}>
              <RNView style={styles.webinarTitleRow}>
                <Text style={styles.audioHeaderText}>Webinar</Text>
              </RNView>
              <RNView style={styles.webinarCountPill}>
                <Text style={styles.webinarCountPillText}>
                  {webinarConfig?.attendeeCount ?? 0} /{" "}
                  {webinarConfig?.maxAttendees ?? 500}
                </Text>
              </RNView>
            </RNView>

            <RNView style={styles.webinarToggleRow}>
              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(
                      async () => {
                        if (!onUpdateWebinarConfig) {
                          throw new Error("Webinar controls unavailable.");
                        }
                        const next = await onUpdateWebinarConfig({
                          enabled: !webinarEnabled,
                        });
                        if (!next) {
                          throw new Error("Webinar update rejected.");
                        }
                      },
                      {
                        successMessage: webinarEnabled
                          ? "Webinar disabled."
                          : "Webinar enabled.",
                      }
                    );
                  })
                }
                disabled={isWebinarWorking || !onUpdateWebinarConfig}
                style={({ pressed }) => [
                  styles.webinarTogglePill,
                  webinarEnabled && styles.webinarTogglePillActive,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarTogglePillLabel}>Webinar</Text>
                <Text
                  style={[
                    styles.webinarTogglePillValue,
                    webinarEnabled && styles.webinarTogglePillValueActive,
                  ]}
                >
                  {webinarEnabled ? "ON" : "OFF"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(
                      async () => {
                        if (!onUpdateWebinarConfig) {
                          throw new Error("Webinar controls unavailable.");
                        }
                        const next = await onUpdateWebinarConfig({
                          publicAccess: !webinarPublicAccess,
                        });
                        if (!next) {
                          throw new Error("Webinar update rejected.");
                        }
                      },
                      {
                        successMessage: webinarPublicAccess
                          ? "Public access disabled."
                          : "Public access enabled.",
                      }
                    );
                  })
                }
                disabled={
                  isWebinarWorking ||
                  !onUpdateWebinarConfig ||
                  !webinarEnabled
                }
                style={({ pressed }) => [
                  styles.webinarTogglePill,
                  webinarPublicAccess && styles.webinarTogglePillActive,
                  !webinarEnabled && styles.webinarTogglePillDisabled,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarTogglePillLabel}>Public</Text>
                <Text
                  style={[
                    styles.webinarTogglePillValue,
                    webinarPublicAccess && styles.webinarTogglePillValueActive,
                  ]}
                >
                  {webinarPublicAccess ? "ON" : "OFF"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(
                      async () => {
                        if (!onUpdateWebinarConfig) {
                          throw new Error("Webinar controls unavailable.");
                        }
                        const next = await onUpdateWebinarConfig({
                          locked: !webinarLocked,
                        });
                        if (!next) {
                          throw new Error("Webinar update rejected.");
                        }
                      },
                      {
                        successMessage: webinarLocked
                          ? "Webinar unlocked."
                          : "Webinar locked.",
                      }
                    );
                  })
                }
                disabled={
                  isWebinarWorking ||
                  !onUpdateWebinarConfig ||
                  !webinarEnabled
                }
                style={({ pressed }) => [
                  styles.webinarTogglePill,
                  webinarLocked && styles.webinarTogglePillLock,
                  !webinarEnabled && styles.webinarTogglePillDisabled,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarTogglePillLabel}>Lock</Text>
                <Text
                  style={[
                    styles.webinarTogglePillValue,
                    webinarLocked && styles.webinarTogglePillValueActive,
                  ]}
                >
                  {webinarLocked ? "ON" : "OFF"}
                </Text>
              </Pressable>
            </RNView>

            <RNView style={styles.webinarMetaRow}>
              <RNView
                style={[
                  styles.webinarMetaPill,
                  webinarRequiresInviteCode && styles.webinarMetaPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.webinarMetaText,
                    webinarRequiresInviteCode && styles.webinarMetaTextActive,
                  ]}
                >
                  {webinarRequiresInviteCode ? "Invite code ON" : "Invite code OFF"}
                </Text>
              </RNView>
              <RNView style={styles.webinarMetaPill}>
                <Text style={styles.webinarMetaText}>Feed: active speaker</Text>
              </RNView>
            </RNView>

            <RNView style={styles.webinarRow}>
              <TextInput
                value={webinarCapInput}
                onChangeText={setWebinarCapInput}
                keyboardType="number-pad"
                placeholder="Attendee cap"
                placeholderTextColor={SHEET_COLORS.textFaint}
                style={styles.webinarInput}
              />
              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(
                      async () => {
                        if (!onUpdateWebinarConfig) {
                          throw new Error("Webinar controls unavailable.");
                        }
                        if (webinarCapValue == null) {
                          throw new Error("Enter a valid attendee cap.");
                        }
                        const next = await onUpdateWebinarConfig({
                          maxAttendees: webinarCapValue,
                        });
                        if (!next) {
                          throw new Error("Webinar update rejected.");
                        }
                      },
                      { successMessage: "Attendee cap updated." }
                    );
                  })
                }
                disabled={
                  isWebinarWorking ||
                  !onUpdateWebinarConfig ||
                  !webinarEnabled ||
                  webinarCapValue == null
                }
                style={({ pressed }) => [
                  styles.webinarButton,
                  styles.webinarButtonPrimary,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarButtonText}>Save cap</Text>
              </Pressable>
            </RNView>

            <RNView style={styles.webinarRow}>
              <TextInput
                value={webinarInviteCodeInput}
                onChangeText={setWebinarInviteCodeInput}
                placeholder="Invite code"
                placeholderTextColor={SHEET_COLORS.textFaint}
                style={styles.webinarInput}
              />
              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(
                      async () => {
                        if (!onUpdateWebinarConfig) {
                          throw new Error("Webinar controls unavailable.");
                        }
                        const next = await onUpdateWebinarConfig({
                          inviteCode: webinarInviteCodeInput.trim(),
                        });
                        if (!next) {
                          throw new Error("Webinar update rejected.");
                        }
                      },
                      {
                        successMessage: "Invite code saved.",
                        clearInviteInput: true,
                      }
                    );
                  })
                }
                disabled={
                  isWebinarWorking ||
                  !onUpdateWebinarConfig ||
                  !webinarEnabled ||
                  !webinarInviteCodeInput.trim()
                }
                style={({ pressed }) => [
                  styles.webinarButton,
                  styles.webinarButtonPrimary,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarButtonText}>Save</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(
                      async () => {
                        if (!onUpdateWebinarConfig) {
                          throw new Error("Webinar controls unavailable.");
                        }
                        const next = await onUpdateWebinarConfig({
                          inviteCode: null,
                        });
                        if (!next) {
                          throw new Error("Webinar update rejected.");
                        }
                      },
                      { successMessage: "Invite code cleared." }
                    );
                  })
                }
                disabled={
                  isWebinarWorking ||
                  !onUpdateWebinarConfig ||
                  !webinarRequiresInviteCode
                }
                style={({ pressed }) => [
                  styles.webinarButton,
                  styles.webinarButtonDanger,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarButtonText}>Clear</Text>
              </Pressable>
            </RNView>

            <TextInput
              value={webinarLink ?? ""}
              editable={false}
              placeholder="Generate webinar link"
              placeholderTextColor={SHEET_COLORS.textFaint}
              style={styles.webinarInput}
            />
            <RNView style={styles.webinarRow}>
              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(async () => {
                      if (!onGenerateWebinarLink) {
                        throw new Error("Webinar link generation unavailable.");
                      }
                      const linkResponse = await onGenerateWebinarLink();
                      if (!linkResponse?.link) {
                        throw new Error("Webinar link unavailable.");
                      }
                      onSetWebinarLink?.(linkResponse.link);
                      await copyWebinarLink(linkResponse.link);
                    }, { successMessage: "Webinar link copied." });
                  })
                }
                disabled={
                  isWebinarWorking ||
                  !onGenerateWebinarLink ||
                  !webinarEnabled
                }
                style={({ pressed }) => [
                  styles.webinarButton,
                  styles.webinarButtonPrimary,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarButtonText}>Generate</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(async () => {
                      if (!onRotateWebinarLink) {
                        throw new Error("Webinar link rotation unavailable.");
                      }
                      const linkResponse = await onRotateWebinarLink();
                      if (!linkResponse?.link) {
                        throw new Error("Webinar link unavailable.");
                      }
                      onSetWebinarLink?.(linkResponse.link);
                      await copyWebinarLink(linkResponse.link);
                    }, { successMessage: "Webinar link rotated and copied." });
                  })
                }
                disabled={
                  isWebinarWorking ||
                  !onRotateWebinarLink ||
                  !webinarEnabled
                }
                style={({ pressed }) => [
                  styles.webinarButton,
                  styles.webinarButtonDanger,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarButtonText}>Rotate</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  trigger(() => {
                    void runWebinarTask(async () => {
                      await copyWebinarLink(webinarLink ?? "");
                    }, { successMessage: "Webinar link copied." });
                  })
                }
                disabled={isWebinarWorking || !webinarLink}
                style={({ pressed }) => [
                  styles.webinarButton,
                  pressed && styles.deviceButtonPressed,
                ]}
              >
                <Text style={styles.webinarButtonText}>Copy</Text>
              </Pressable>
            </RNView>

            {webinarNotice ? (
              <Text style={styles.webinarNoticeText}>{webinarNotice}</Text>
            ) : null}
            {webinarError ? (
              <Text style={styles.webinarErrorText}>{webinarError}</Text>
            ) : null}
          </RNView>
        ) : null}

        <RNView style={styles.audioSection}>
          <RNView style={styles.audioHeaderRow}>
            <Mic size={14} color={SHEET_COLORS.textMuted} strokeWidth={1.8} />
            <Text style={styles.audioHeaderText}>Microphone</Text>
          </RNView>
          <RNView style={styles.deviceList}>
            {audioInputDevices.length === 0 ? (
              <RNView style={styles.devicePlaceholder}>
                <Text style={styles.devicePlaceholderText}>
                  No microphones found
                </Text>
              </RNView>
            ) : (
              audioInputDevices.map((device, index) => {
                const isSelected =
                  selectedAudioInputId != null
                    ? selectedAudioInputId === device.deviceId
                    : index === 0;

                return (
                  <Pressable
                    key={`${device.deviceId || "audio-input"}-${index}`}
                    onPress={() => {
                      if (!onAudioInputDeviceChange) return;
                      trigger(() => onAudioInputDeviceChange(device.deviceId));
                    }}
                    disabled={!onAudioInputDeviceChange}
                    style={({ pressed }) => [
                      styles.deviceButton,
                      isSelected && styles.deviceButtonSelected,
                      pressed && styles.deviceButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select microphone ${device.label}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.deviceButtonLabel,
                        isSelected && styles.deviceButtonLabelSelected,
                      ]}
                    >
                      {device.label}
                    </Text>
                    {isSelected ? (
                      <Check
                        size={14}
                        color={SHEET_COLORS.text}
                        strokeWidth={2}
                      />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </RNView>
        </RNView>

        <RNView style={styles.audioSection}>
          <RNView style={styles.audioHeaderRow}>
            <Volume2 size={14} color={SHEET_COLORS.textMuted} strokeWidth={1.8} />
            <Text style={styles.audioHeaderText}>Speaker</Text>
          </RNView>
          <RNView style={styles.deviceList}>
            {availableAudioOutputDevices.map((device, index) => {
              const isSelected =
                selectedAudioOutputId != null
                  ? selectedAudioOutputId === device.deviceId
                  : index === 0;

              return (
                <Pressable
                  key={`${device.deviceId || "audio-output"}-${index}`}
                  onPress={() => {
                    if (!onAudioOutputDeviceChange) return;
                    trigger(() => onAudioOutputDeviceChange(device.deviceId));
                  }}
                  disabled={!onAudioOutputDeviceChange}
                  style={({ pressed }) => [
                    styles.deviceButton,
                    isSelected && styles.deviceButtonSelected,
                    pressed && styles.deviceButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select speaker ${device.label}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.deviceButtonLabel,
                      isSelected && styles.deviceButtonLabelSelected,
                    ]}
                  >
                    {device.label}
                  </Text>
                  {isSelected ? (
                    <Check size={14} color={SHEET_COLORS.text} strokeWidth={2} />
                  ) : null}
                </Pressable>
              );
            })}
          </RNView>
        </RNView>

        {isLoadingAudioDevices ? (
          <Text style={styles.audioStatusText}>Loading devices...</Text>
        ) : null}

        {audioDevicesError ? (
          <Text style={styles.audioErrorText}>{audioDevicesError}</Text>
        ) : null}
      </View>
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    alignItems: "center",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: SHEET_COLORS.border,
    opacity: 0.4,
    alignSelf: "center",
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignSelf: "center",
    flexWrap: "wrap",
  },
  audioSection: {
    width: "100%",
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    backgroundColor: SHEET_COLORS.surface,
    padding: 12,
  },
  webinarSection: {
    width: "100%",
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    backgroundColor: SHEET_COLORS.surface,
    padding: 12,
    gap: 10,
  },
  webinarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  webinarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  webinarCountPill: {
    borderWidth: 1,
    borderColor: "rgba(249, 95, 74, 0.45)",
    borderRadius: 999,
    backgroundColor: "rgba(249, 95, 74, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  webinarCountPillText: {
    color: SHEET_COLORS.text,
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  webinarToggleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  webinarTogglePill: {
    flex: 1,
    minWidth: 90,
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    borderRadius: 999,
    backgroundColor: "rgba(12, 12, 12, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  webinarTogglePillActive: {
    borderColor: "rgba(249, 95, 74, 0.82)",
    backgroundColor: "rgba(249, 95, 74, 0.24)",
  },
  webinarTogglePillLock: {
    borderColor: "rgba(76, 168, 255, 0.82)",
    backgroundColor: "rgba(76, 168, 255, 0.24)",
  },
  webinarTogglePillDisabled: {
    opacity: 0.48,
  },
  webinarTogglePillLabel: {
    color: SHEET_COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  webinarTogglePillValue: {
    color: SHEET_COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  webinarTogglePillValueActive: {
    color: SHEET_COLORS.text,
  },
  webinarMetaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  webinarMetaPill: {
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    borderRadius: 999,
    backgroundColor: "rgba(12, 12, 12, 0.72)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  webinarMetaPillActive: {
    borderColor: "rgba(251, 191, 36, 0.72)",
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  webinarMetaText: {
    color: SHEET_COLORS.textMuted,
    fontSize: 11,
  },
  webinarMetaTextActive: {
    color: SHEET_COLORS.text,
  },
  webinarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  webinarInput: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    borderRadius: 12,
    backgroundColor: "rgba(12, 12, 12, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: SHEET_COLORS.text,
    fontSize: 13,
  },
  webinarButton: {
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    borderRadius: 12,
    backgroundColor: "rgba(12, 12, 12, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  webinarButtonPrimary: {
    borderColor: "rgba(249, 95, 74, 0.82)",
    backgroundColor: "rgba(249, 95, 74, 0.24)",
  },
  webinarButtonDanger: {
    borderColor: "rgba(76, 168, 255, 0.72)",
    backgroundColor: "rgba(76, 168, 255, 0.22)",
  },
  webinarButtonText: {
    color: SHEET_COLORS.text,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  webinarNoticeText: {
    color: "rgba(52, 211, 153, 0.95)",
    fontSize: 12,
  },
  webinarErrorText: {
    color: "#F95F4A",
    fontSize: 12,
  },
  audioHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  audioHeaderText: {
    color: SHEET_COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  deviceList: {
    gap: 8,
  },
  devicePlaceholder: {
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    borderRadius: 12,
    backgroundColor: "rgba(12, 12, 12, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  devicePlaceholderText: {
    color: SHEET_COLORS.textMuted,
    fontSize: 13,
  },
  deviceButton: {
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    borderRadius: 12,
    backgroundColor: "rgba(12, 12, 12, 0.75)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deviceButtonSelected: {
    borderColor: "rgba(249, 95, 74, 0.85)",
    backgroundColor: "rgba(249, 95, 74, 0.2)",
  },
  deviceButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  deviceButtonLabel: {
    color: SHEET_COLORS.text,
    fontSize: 13,
    flexShrink: 1,
  },
  deviceButtonLabelSelected: {
    color: SHEET_COLORS.text,
    fontWeight: "600",
  },
  audioStatusText: {
    marginTop: 12,
    color: SHEET_COLORS.textMuted,
    fontSize: 12,
    alignSelf: "flex-start",
  },
  audioErrorText: {
    marginTop: 6,
    color: "#F95F4A",
    fontSize: 12,
    alignSelf: "flex-start",
  },
  gridItem: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SHEET_COLORS.surface,
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    position: "relative",
  },
  gridItemActive: {
    backgroundColor: "rgba(249, 95, 74, 0.65)",
    borderColor: "rgba(249, 95, 74, 0.9)",
    shadowColor: "rgba(249, 95, 74, 0.6)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  gridItemHandActive: {
    backgroundColor: "rgba(251, 191, 36, 0.65)",
    borderColor: "rgba(251, 191, 36, 0.9)",
    shadowColor: "rgba(251, 191, 36, 0.55)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  gridItemLockActive: {
    backgroundColor: "rgba(76, 168, 255, 0.55)",
    borderColor: "rgba(76, 168, 255, 0.85)",
    shadowColor: "rgba(76, 168, 255, 0.55)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  gridItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
