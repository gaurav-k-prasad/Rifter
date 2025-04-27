import { Button } from "@mui/material";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { create, join } from "../../../clientReact/src/utils/videoCallUtils";
import Create from "../components/Create";
import Join from "../components/Join";
import LeftNav from "../components/LeftNav";
import {
  useCallMode,
  useClients,
  useRoomId,
  useSocket,
  useStream,
} from "../contexts";
import {
  handleSocketMessage,
  initiateWebSocket,
  openMediaDevices,
} from "../utils/videoCallUtils";

export const Route = createFileRoute("/")({
  component: App,
});

const constraints = {
  audio: { noiseSuppression: true },
  video: {
    backgroundBlur: false,
    aspectRatio: 16 / 9,
    frameRate: { ideal: 13, max: 15, min: 10 },
    facingMode: "user",
    width: { ideal: 1280, max: 1920, min: 640 },
    height: { ideal: 720, max: 1080, min: 480 },
  },
};

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export default function App() {
  const [mode, setMode] = useState("create");
  const [joinRoomId, setJoinRoomId] = useState("");
  const { callMode, setCallMode } = useCallMode();
  const { setRoomId: setMyRoomId } = useRoomId();
  const { socketRef, setIsSocketConnected, isSocketConnected } = useSocket();
  const { clients, setClients, clientsRef } = useClients();
  const { streamRef } = useStream();
  const navigate = useNavigate();
  const toastMessage = useRouterState({
    select: (s) => s.location.state?.toastMessage,
  });

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = initiateWebSocket();
      console.log(socketRef.current);
      socketRef.current.addEventListener("open", () => {
        setIsSocketConnected(true);
      });
      socketRef.current.addEventListener("message", async (message) => {
        handleSocketMessage(
          message,
          socketRef.current,
          clientsRef.current,
          configuration,
          streamRef.current,
          setClients,
          setCallMode,
          setMyRoomId,
        );
      });
      socketRef.current.addEventListener("close", () => {
        setIsSocketConnected(false);
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      streamRef.current = await openMediaDevices(constraints);
    })();
  }, []);

  useEffect(() => {
    if (toastMessage) {
      toast.info(toastMessage);
    }
  }, [toastMessage]);

  useEffect(() => {
    console.log(callMode);
    if (callMode == "call") {
      if (mode == "join") {
        setMyRoomId(joinRoomId);
        navigate({ to: "/room", state: { toastMessage: "Room Joined" } });
      } else {
        navigate({
          to: "/room",
          state: { toastMessage: "Room ID copied to clipboard" },
        });
      }
    }
  }, [callMode]);

  if (!isSocketConnected) {
    return <p className="m-5 text-center">Connecting...</p>;
  }

  return (
    <main className="flex flex-row flex-1">
      <LeftNav />
      <ToastContainer autoClose={3000} />
      <div className="flex p-8 w-full flex-col gap-10">
        <div className="flex gap-8 justify-center">
          <div>
            <Button
              variant={mode == "create" ? "contained" : "outlined"}
              onClick={() => {
                setMode("create");
              }}
            >
              Create Room
            </Button>
          </div>

          <div>
            <Button
              variant={mode == "join" ? "contained" : "outlined"}
              onClick={() => {
                setMode("join");
              }}
            >
              Join Room
            </Button>
          </div>
        </div>

        <div className="flex flex-col p-5 justify-center items-center">
          {mode == "create" ? (
            <Create
              onClick={() => {
                create(socketRef.current, clients, setClients);
              }}
            />
          ) : (
            <Join
              onClick={() => {
                join(socketRef.current, clients, joinRoomId, setClients);
              }}
              joinRoomId={joinRoomId}
              setJoinRoomId={setJoinRoomId}
            />
          )}
        </div>
      </div>
    </main>
  );
}
