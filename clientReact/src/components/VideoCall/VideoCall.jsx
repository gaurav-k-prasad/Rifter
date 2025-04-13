import React, { useEffect, useRef, useState } from "react";
import {
  handleSocketMessage,
  hangup,
  initDataChannel,
  initiateWebSocket,
  initPeerConnection,
  makeCall,
  openMediaDevices,
} from "../../utils/videoCallUtils.js";

const CALLING = 0;
const ANSWERING = 1;

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
  const stream = useRef(null);
  const socket = useRef(null);
  const [clients, setClients] = useState({});

  useEffect(() => {
    (async () => {
      stream.current = await openMediaDevices(constraints);
    })();
  }, []);

  useEffect(() => {
    socket.current = initiateWebSocket();
    socket.current.addEventListener("message", async (message) => {
      await handleSocketMessage(message, socket.current, clients, configuration, stream.current, remoteVideo);
    });

    return () => {
      socket.current.close();
      socket.current = null;
    };
  }, []);
};

export default VideoCall;
