"use client";

import { memo } from "react";
import { WhiteboardWebApp } from "@conclave/apps-sdk/whiteboard/web";

function MobileWhiteboardLayout() {
  return (
    <div className="w-full h-full min-h-0 min-w-0 p-2">
      <div className="w-full h-full min-h-0 min-w-0 rounded-xl border border-white/10 bg-[#0b0b0b] overflow-hidden">
        <WhiteboardWebApp />
      </div>
    </div>
  );
}

export default memo(MobileWhiteboardLayout);
