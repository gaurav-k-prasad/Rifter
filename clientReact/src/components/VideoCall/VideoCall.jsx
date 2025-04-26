import { useEffect, useRef, useState } from "react";
import {
  handleSocketMessage,
  hangup,
  initiateWebSocket,
  makeCall,
  openMediaDevices,
} from "../../utils/videoCallUtils.js";

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
          setCallMode
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
        <input type="text" name="" id="" placeholder="Room ID" />
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
            makeCall(socketRef.current, clients, setClients);
            setCallMode(CALL);
          }}
        >
          {roomMode == CREATE ? "Create" : "Join"}
        </button>
      )}
    </fieldset>
  );
};

export default VideoCall;
