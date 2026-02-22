import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type JoinRequestBody = {
  roomId?: string;
  sessionId?: string;
  joinMode?: "meeting" | "webinar_attendee";
  webinarSignedToken?: string;
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  };
  isHost?: boolean;
  isAdmin?: boolean;
  allowRoomCreation?: boolean;
  clientId?: string;
};

type WebinarLinkProof = {
  typ: "webinar_link";
  roomId: string;
  clientId: string;
  linkVersion: number;
};

const resolveSfuUrl = () =>
  process.env.SFU_URL || process.env.NEXT_PUBLIC_SFU_URL || "http://localhost:3031";

const resolveClientId = (request: Request, body?: JoinRequestBody) => {
  const envClientId =
    process.env.SFU_CLIENT_ID || process.env.NEXT_PUBLIC_SFU_CLIENT_ID;
  if (envClientId?.trim()) {
    return envClientId.trim();
  }

  const headerClientId = request.headers.get("x-sfu-client")?.trim() || "";
  const bodyClientId = body?.clientId?.trim() || "";
  return headerClientId || bodyClientId || "default";
};

const verifyWebinarSignedToken = (options: {
  token: string;
  roomId: string;
  clientId: string;
}): Omit<WebinarLinkProof, "typ"> | null => {
  try {
    const decoded = jwt.verify(
      options.token,
      process.env.SFU_SECRET || "development-secret"
    );
    if (!decoded || typeof decoded !== "object") {
      return null;
    }
    const payload = decoded as Partial<WebinarLinkProof>;
    if (
      payload.typ !== "webinar_link" ||
      payload.roomId !== options.roomId ||
      payload.clientId !== options.clientId ||
      typeof payload.linkVersion !== "number"
    ) {
      return null;
    }
    return {
      roomId: payload.roomId,
      clientId: payload.clientId,
      linkVersion: payload.linkVersion,
    };
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  let body: JoinRequestBody;
  try {
    body = (await request.json()) as JoinRequestBody;
  } catch (_error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const roomId = body?.roomId?.trim();
  const sessionId = body?.sessionId?.trim();

  if (!roomId) {
    return NextResponse.json({ error: "Missing room ID" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
  }

  const clientId = resolveClientId(request, body);
  const joinMode =
    body?.joinMode === "webinar_attendee" ? "webinar_attendee" : "meeting";
  const webinarSignedToken = body?.webinarSignedToken?.trim() || undefined;
  const email = body?.user?.email?.trim() || undefined;
  const name = body?.user?.name?.trim() || undefined;
  const providedId = body?.user?.id?.trim() || undefined;
  const baseUserId = email || providedId || `guest-${sessionId}`;
  const webinarLinkProof = webinarSignedToken
    ? verifyWebinarSignedToken({
        token: webinarSignedToken,
        roomId,
        clientId,
      })
    : null;
  if (webinarSignedToken && !webinarLinkProof) {
    return NextResponse.json(
      { error: "Invalid webinar link token" },
      { status: 401 }
    );
  }
  const isWebinarAttendeeJoin = joinMode === "webinar_attendee";
  const isHost = isWebinarAttendeeJoin
    ? false
    : Boolean(body?.isHost ?? body?.isAdmin);
  const allowRoomCreation = isWebinarAttendeeJoin
    ? false
    : Boolean(body?.allowRoomCreation);

  const token = jwt.sign(
    {
      userId: baseUserId,
      email,
      name,
      isHost,
      isAdmin: isHost,
      allowRoomCreation,
      clientId,
      sessionId,
      joinMode,
      webinarLinkProof: webinarLinkProof ?? undefined,
    },
    process.env.SFU_SECRET || "development-secret",
    { expiresIn: "1h" }
  );

  return NextResponse.json({ token, sfuUrl: resolveSfuUrl() });
}
