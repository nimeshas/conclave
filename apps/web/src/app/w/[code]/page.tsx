import { use } from "react";
import MeetsClientShell from "../../meets-client-shell";
import { sanitizeRoomCode } from "../../lib/utils";

type WebinarRoomPageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getParamValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export default function WebinarRoomPage({
  params,
  searchParams,
}: WebinarRoomPageProps) {
  const { code } = use(params);
  const resolvedSearchParams = use(searchParams ?? Promise.resolve({})) as Record<
    string,
    string | string[] | undefined
  >;

  const rawCode = typeof code === "string" ? code : "";
  const roomCode = decodeURIComponent(rawCode);
  const resolvedRoomCode =
    roomCode === "undefined" || roomCode === "null" ? "" : roomCode;
  const sanitizedRoomCode = sanitizeRoomCode(resolvedRoomCode);
  const webinarSignedToken = getParamValue(resolvedSearchParams.wt);

  return (
    <MeetsClientShell
      initialRoomId={sanitizedRoomCode}
      forceJoinOnly={true}
      bypassMediaPermissions={true}
      joinMode="webinar_attendee"
      webinarSignedToken={webinarSignedToken}
      autoJoinOnMount={true}
      hideJoinUI={true}
    />
  );
}
