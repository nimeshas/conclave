"use client";

import type { ConnectionState } from "../lib/types";

function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const colors: Record<ConnectionState, string> = {
    disconnected: "bg-neutral-600",
    connecting: "bg-yellow-500 animate-pulse",
    connected: "bg-green-500",
    joining: "bg-yellow-500 animate-pulse",
    joined: "bg-green-500",
    reconnecting: "bg-yellow-500 animate-pulse",
    waiting: "bg-blue-500 animate-pulse",
    error: "bg-red-500",
  };

  const labels: Record<ConnectionState, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting...",
    connected: "Connected",
    joining: "Joining...",
    joined: "In Meeting",
    reconnecting: "Reconnecting...",
    waiting: "Waiting...",
    error: "Error",
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[state]}`} />
      <span className="text-xs text-neutral-500 tracking-wider">
        {labels[state]}
      </span>
    </div>
  );
}

export default ConnectionIndicator;
