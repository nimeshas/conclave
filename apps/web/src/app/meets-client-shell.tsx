import { Roboto } from "next/font/google";
import MeetsClientPage from "./meets-client-page";
import type { JoinMode } from "./lib/types";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

type MeetsClientShellProps = {
  initialRoomId?: string;
  forceJoinOnly?: boolean;
  bypassMediaPermissions?: boolean;
  joinMode?: JoinMode;
  webinarSignedToken?: string;
  autoJoinOnMount?: boolean;
  hideJoinUI?: boolean;
};

export default function MeetsClientShell({
  initialRoomId,
  forceJoinOnly,
  bypassMediaPermissions,
  joinMode,
  webinarSignedToken,
  autoJoinOnMount,
  hideJoinUI,
}: MeetsClientShellProps) {
  return (
    <MeetsClientPage
      initialRoomId={initialRoomId}
      forceJoinOnly={forceJoinOnly}
      bypassMediaPermissions={bypassMediaPermissions}
      joinMode={joinMode}
      webinarSignedToken={webinarSignedToken}
      autoJoinOnMount={autoJoinOnMount}
      hideJoinUI={hideJoinUI}
      fontClassName={roboto.className}
    />
  );
}
