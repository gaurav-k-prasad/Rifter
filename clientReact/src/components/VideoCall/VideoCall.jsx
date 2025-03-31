import React, { useEffect, useRef } from "react";

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
  const currStatus = useRef(ANSWERING);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize WebSocket connection on mount
  useEffect(() => {
    socketRef.current = new WebSocket(
      "https://x8c19r2x-3000.inc1.devtunnels.ms/"
    );

    socketRef.current.onmessage = handleSocketMessage;

    // Initialize PeerConnection when component mounts
    initPeerConnection();

    // Clean up on unmount
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openMediaDevices = async (constraints) => {
    return await navigator.mediaDevices.getUserMedia(constraints);
  };

  const initDataChannel = (channel) => {
    channel.onopen = () => console.log("Data channel opened");
    channel.onclose = () => console.log("Data channel closed");
    channel.onmessage = (message) => console.log(message.data);
  };

  const initPeerConnection = async () => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    // ICE candidate event
    peerConnection.onicecandidate = (event) => {
      console.log("ice candidate found");
      if (event.candidate) {
        socketRef.current.send(
          JSON.stringify({ ice: event.candidate, type: "ice" })
        );
      }
    };

    // Connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        console.log("Connected");
      }
    };

    peerConnection.onicegatheringstatechange = () =>
      console.log(
        "ICE Gathering State Changed:",
        peerConnection.iceGatheringState
      );

    // Receiving remote track
    peerConnection.ontrack = (e) => {
      const [remoteStream] = e.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.classList.remove("hidden");
      }
    };

    // Data channel received from remote peer
    peerConnection.ondatachannel = (event) => {
      dataChannelRef.current = event.channel;
      initDataChannel(dataChannelRef.current);
    };

    try {
      const stream = await openMediaDevices(constraints);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  };

  const hangup = async (caller = true) => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.getSenders().forEach((sender) => {
        peerConnectionRef.current.removeTrack(sender);
      });
      peerConnectionRef.current.close();
      console.log("call ended");
    }

    if (caller && socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "bye" }));
    }

    currStatus.current = ANSWERING;
    await initPeerConnection();
  };

  const makeCall = async () => {
    currStatus.current = CALLING;
    dataChannelRef.current =
      peerConnectionRef.current.createDataChannel("channel");
    initDataChannel(dataChannelRef.current);

    const offer = await peerConnectionRef.current.createOffer();

    console.log("offer :>>", offer);
    await peerConnectionRef.current.setLocalDescription(offer);

    socketRef.current.send(JSON.stringify({ offer, type: "offer" }));
  };

  const handleSocketMessage = async (messageEvent) => {
    const data = JSON.parse(messageEvent.data);

    if (data.type === "bye") {
      await hangup(false);
    } else if (data.type === "ice") {
      try {
        await peerConnectionRef.current.addIceCandidate(data.ice);
      } catch (e) {
        console.error("Error adding received ice candidate", e);
      }
    } else if (data.type === "answer" && currStatus.current === CALLING) {
      console.log("Received answer: ", data);
      await peerConnectionRef.current.setRemoteDescription(data);
    } else if (data.type === "offer" && currStatus.current === ANSWERING) {
      console.log("Received offer: ", data);

      await peerConnectionRef.current.setRemoteDescription(data);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socketRef.current.send(JSON.stringify({ answer, type: "answer" }));
    }
  };

  return (
    <div className="video-call-container">
      <video
        id="local-video"
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "300px", border: "1px solid #ccc" }}
      />
      <video
        id="remote-video"
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="hidden"
        style={{ width: "640px", border: "1px solid #ccc", marginTop: "1rem" }}
      />
      <div className="controls">
        <button onClick={makeCall}>Call</button>
        <button onClick={() => hangup()}>Hang Up</button>
      </div>
    </div>
  );
};

export default VideoCall;
