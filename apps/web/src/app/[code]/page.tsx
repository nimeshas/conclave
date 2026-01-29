import { use } from "react";
import MeetsClientShell from "../meets-client-shell";
import { sanitizeRoomCode } from "../lib/utils";

type MeetRoomPageProps = {
  params: Promise<{ code: string }>;
};

export default function MeetRoomPage({ params }: MeetRoomPageProps) {
  const { code } = use(params);
  const rawCode = typeof code === "string" ? code : "";
  const roomCode = decodeURIComponent(rawCode);
  const resolvedRoomCode =
    roomCode === "undefined" || roomCode === "null" ? "" : roomCode;
  const sanitizedRoomCode = sanitizeRoomCode(resolvedRoomCode);
  return (
    <MeetsClientShell
      initialRoomId={sanitizedRoomCode}
      forceJoinOnly={true}
    />
  );
}
