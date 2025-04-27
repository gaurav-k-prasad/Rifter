import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Button } from "@mui/material";
import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import Video from "../components/Video";
import {
  useCallMode,
  useClients,
  useRoomId,
  useSocket,
  useStream,
} from "../contexts";
import { hangup } from "../utils/videoCallUtils";

export const Route = createFileRoute("/room")({
  component: RouteComponent,
});

function RouteComponent() {
  const { clients, setClients } = useClients();
  const { socketRef } = useSocket();
  const { streamRef } = useStream();
  const { roomId } = useRoomId();
  const { callMode, setCallMode } = useCallMode();
  const navigate = useNavigate();

  const toastMessage = useRouterState({
    select: (s) => s.location.state?.toastMessage,
  });

  useEffect(() => {
    if (callMode == "idle") {
      navigate({ to: "/", state: { toastMessage: "Call Ended" } });
      return;
    }
  }, [clients]);

  useEffect(() => {
    if (toastMessage) {
      toast.info(toastMessage, { autoClose: true });
    }
  }, [toastMessage]);

  return (
    <div className="relative">
      {clients.size == 0 && (
        <div className="text-center p-10 opacity-50">No one in the meeting</div>
      )}
      <div
        className="absolute right-[1rem] top-[1rem] cursor-pointer opacity-50 hover:opacity-100"
        onClick={() => {navigator.clipboard.writeText(roomId); toast.info("Room ID copied to clipboard")}}
      >
        <ContentCopyIcon />
        <br />
        <p className="text-center">ID</p>
      </div>

      <ToastContainer autoClose={3000} />

      <div className="fixed bottom-[1rem] right-[1rem]">
        <Video stream={streamRef.current} />
      </div>
      <div className="flex gap-[1rem] p-5 justify-center max-w-[1000px] mx-auto flex-wrap">
        {Array.from(clients.entries()).map(([userId, { stream }]) => (
          <div key={userId} className="relative">
            <div className="absolute text-white bottom-0 right-0 w-max bg-[#0009] px-1 rounded-sm">
              User: {userId}
            </div>
            {stream && <Video stream={stream} />}
          </div>
        ))}
      </div>
      <div className="fixed bottom-[1rem] w-full text-center z-10">
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            hangup(true, null, socketRef.current, clients, setClients);
            setCallMode("idle");
          }}
        >
          Hang Up
        </Button>
      </div>
    </div>
  );
}
