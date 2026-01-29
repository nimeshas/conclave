import { Roboto } from "next/font/google";
import MeetsClientPage from "./meets-client-page";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

type MeetsClientShellProps = {
  initialRoomId?: string;
  forceJoinOnly?: boolean;
};

export default function MeetsClientShell({
  initialRoomId,
  forceJoinOnly,
}: MeetsClientShellProps) {
  return (
    <MeetsClientPage
      initialRoomId={initialRoomId}
      forceJoinOnly={forceJoinOnly}
      fontClassName={roboto.className}
    />
  );
}
