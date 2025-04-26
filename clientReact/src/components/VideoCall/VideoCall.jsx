import { useEffect, useRef, useState } from "react";
import {
  create,
  handleSocketMessage,
  hangup,
  initiateWebSocket,
  join,
  openMediaDevices,
} from "../../utils/videoCallUtils.js";
import Video from "./Video.jsx";

const CREATE = "create";
const JOIN = "join";
const IDLE = "idle";
const CALL = "call";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

const constraints = {
  audio: { noiseSuppression: true },
  video: {
    backgroundBlur: false,
    aspectRatio: 16 / 9,
    frameRate: { ideal: 30, max: 60, min: 30 },
    facingMode: "user",
    width: { ideal: 1280, max: 1920, min: 640 },
    height: { ideal: 720, max: 1080, min: 480 },
  },
};

const VideoCall = () => {
  const [isConnected, setIsConnected] = useState(null);
  const [roomMode, setRoomMode] = useState(CREATE);
  const [callMode, setCallMode] = useState(IDLE);
  const [clients, setClients] = useState(new Map());
  const [myRoomId, setMyRoomId] = useState(null);
  const [joinRoomId, setJoinRoomId] = useState("");
  const videoRef = useRef(null);

  const clientsRef = useRef(clients);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    clientsRef.current = clients;
    if (clients.size == 0) setCallMode(IDLE);
  }, [clients]);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = initiateWebSocket();

      socketRef.current.addEventListener("open", () => {
        setIsConnected(true);
      });
      socketRef.current.addEventListener("message", async (message) => {
        handleSocketMessage(
          message,
          socketRef.current,
          clientsRef.current,
          configuration,
          streamRef.current,
          videoRef.current, // todo remote video
          setClients,
          setCallMode,
          setMyRoomId
        );
      });
      socketRef.current.addEventListener("close", () => {
        setIsConnected(false);
      });
    }

    return () => {
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    (async () => {
      streamRef.current = await openMediaDevices(constraints);
    })();
  }, []);

  if (!isConnected) {
    return <p>Connecting...</p>;
  }

  return (
    <>
      {myRoomId}
      <fieldset>
        <video autoPlay muted draggable="false" ref={videoRef}></video>
        {callMode == IDLE && (
          <select
            name="mode"
            id="mode"
            value={roomMode}
            onChange={(e) => {
              setRoomMode(e.target.value);
            }}
          >
            <option value="create">Create</option>
            <option value="join">Join</option>
          </select>
        )}
        {callMode == IDLE && roomMode == JOIN && (
          <input
            type="text"
            placeholder="Room ID"
            value={joinRoomId}
            onChange={(e) => {
              setJoinRoomId(e.target.value);
            }}
          />
        )}

        {callMode == CALL ? (
          <button
            onClick={() => {
              hangup(
                true,
                videoRef.current,
                socketRef.current,
                clients,
                setClients
              );
              setCallMode(IDLE);
            }}
          >
            Hang up
          </button>
        ) : (
          <button
            onClick={() => {
              roomMode == CREATE
                ? create(socketRef.current, clients, setClients)
                : join(socketRef.current, clients, joinRoomId, setClients);
              setCallMode(CALL);
            }}
          >
            {roomMode == CREATE ? "Create" : "Join"}
          </button>
        )}
      </fieldset>

      <div>
        {Array.from(clients.entries()).map(([userId, { stream }]) => (
          <div key={userId}>
            <h3>User: {userId}</h3>
            {stream && <Video stream={stream} />}
          </div>
        ))}
      </div>
    </>
  );
};

export default VideoCall;
