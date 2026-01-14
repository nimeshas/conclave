#!/bin/bash
set -e

if [ -z "${AUDIO_TARGET_IP}" ] || [ -z "${AUDIO_TARGET_PORT}" ]; then
  echo "[Audio] AUDIO_TARGET not set, audio streaming disabled."
  tail -f /dev/null
fi

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/pulse}"
mkdir -p "${XDG_RUNTIME_DIR}"

pulseaudio -D --exit-idle-time=-1 --disallow-exit --log-target=stderr

for i in {1..20}; do
  if pactl info >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

pactl load-module module-null-sink sink_name=browser_sink sink_properties=device.description=BrowserSink >/dev/null || true
pactl set-default-sink browser_sink >/dev/null || true

BITRATE="${AUDIO_BITRATE:-128k}"
PAYLOAD="${AUDIO_PAYLOAD_TYPE:-111}"
SSRC="${AUDIO_SSRC:-11111111}"

exec ffmpeg -nostdin -hide_banner -loglevel warning \
  -f pulse -i browser_sink.monitor \
  -ac 2 -ar 48000 -c:a libopus -b:a "${BITRATE}" \
  -application audio -payload_type "${PAYLOAD}" -ssrc "${SSRC}" \
  -f rtp "rtp://${AUDIO_TARGET_IP}:${AUDIO_TARGET_PORT}?pkt_size=1200&rtcpport=${AUDIO_TARGET_PORT}"
