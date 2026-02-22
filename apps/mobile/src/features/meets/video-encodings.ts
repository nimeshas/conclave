import {
  LOW_VIDEO_MAX_BITRATE,
  SCREEN_SHARE_MAX_BITRATE,
  SCREEN_SHARE_MAX_FRAMERATE,
  STANDARD_VIDEO_MAX_BITRATE,
} from "./constants";
import type { VideoQuality } from "./types";

const floorBitrate = (value: number, min: number) => Math.max(min, Math.floor(value));

export function buildWebcamSimulcastEncodings(quality: VideoQuality) {
  const maxBitrate =
    quality === "low" ? LOW_VIDEO_MAX_BITRATE : STANDARD_VIDEO_MAX_BITRATE;

  if (quality === "low") {
    return [
      {
        rid: "q",
        scaleResolutionDownBy: 2,
        maxBitrate: floorBitrate(maxBitrate * 0.35, 90000),
        maxFramerate: 15,
      },
      {
        rid: "f",
        scaleResolutionDownBy: 1,
        maxBitrate,
        maxFramerate: 24,
      },
    ];
  }

  return [
    {
      rid: "h",
      scaleResolutionDownBy: 2,
      maxBitrate: floorBitrate(maxBitrate * 0.35, 160000),
      maxFramerate: 15,
    },
    {
      rid: "f",
      scaleResolutionDownBy: 1,
      maxBitrate,
      maxFramerate: 24,
    },
  ];
}

export function buildWebcamSingleLayerEncoding(quality: VideoQuality) {
  return {
    maxBitrate:
      quality === "low" ? LOW_VIDEO_MAX_BITRATE : STANDARD_VIDEO_MAX_BITRATE,
    maxFramerate: quality === "low" ? 20 : 24,
  };
}

export function buildScreenShareEncoding() {
  return {
    maxBitrate: SCREEN_SHARE_MAX_BITRATE,
    maxFramerate: SCREEN_SHARE_MAX_FRAMERATE,
    scalabilityMode: "L1T2",
  };
}
