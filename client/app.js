const CALLING = 0;
const ANSWERING = 1;
let currStatus = ANSWERING;
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

const remoteVideo = document.querySelector("#remote-video");
const localVideo = document.querySelector("#local-video");
const localVideoWrapper = document.querySelector("#local-video-wrapper");
const hangUpBtn = document.querySelector("#hang-up");
const form = document.querySelector("form");
const minimize = document.querySelector("#local-video-wrapper img");

let socket = initiateWebSocket();
let stream;
let channel;
let peerConnection;

const clients = new Map();

async function openMediaDevices(constraints) {
  return await navigator.mediaDevices.getUserMedia(constraints);
}

function initiateWebSocket() {
  return new WebSocket("https://x8c19r2x-3000.inc1.devtunnels.ms/");
}

function initDataChannel(channel) {
  channel.addEventListener("open", () => {
    console.log("Data channel opened");
  });
  channel.addEventListener("close", () => {
    console.log("Data channel closed");
  });
  channel.addEventListener("message", (message) => {
    console.log(message);
  });
}

async function initPeerConnection(configuration) {
  const peerConnection = new RTCPeerConnection(configuration);

  peerConnection.addEventListener("icecandidate", (event) => {
    console.log("ice candidate found");
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          ice: event.candidate,
          type: "ice",
        })
      );
    }
  });

  peerConnection.addEventListener("connectionstatechange", (event) => {
    if (peerConnection.connectionState === "connected") {
      console.log("Connected");
    }
  });

  peerConnection.addEventListener("icegatheringstatechange", () => {
    console.log(
      "ICE Gathering State Changed:",
      peerConnection.iceGatheringState
    );
  });

  peerConnection.addEventListener("track", async (e) => {
    const [remoteStream] = e.streams;
    remoteVideo.classList.remove("hidden");
    remoteVideo.srcObject = remoteStream;
  });

  peerConnection.addEventListener("datachannel", (event) => {
    channel = event.channel;
    initDataChannel(channel);
  });

  localVideo.srcObject = stream;
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  return peerConnection;
}

async function hangup(caller = true) {
  if (channel) {
    channel.close();
  }

  peerConnection.getSenders().forEach((sender) => {
    peerConnection.removeTrack(sender);
  });

  peerConnection.close();
  console.log("call ended");

  if (caller) socket.send(JSON.stringify({ type: "bye" }));

  currStatus = ANSWERING;
  peerConnection = await initPeerConnection(configuration);
}

async function makeCall() {
  currStatus = CALLING;
  channel = peerConnection.createDataChannel("channel");
  initDataChannel(channel);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.send(JSON.stringify({ offer, type: "offer" }));
}

socket.onmessage = async (message) => {
  const data = JSON.parse(message.data);
  if (data.type == "bye") {
    await hangup(false);
  } else if (data.type == "ice") {
    try {
      await peerConnection.addIceCandidate(data.ice);
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  } else if (data.answer && currStatus == CALLING) {
    console.log("calling :>> ", data.answer);

    const remoteDesc = new RTCSessionDescription(data.answer);
    await peerConnection.setRemoteDescription(remoteDesc);
  } else if (data.offer && currStatus == ANSWERING) {
    console.log("answering :>>", data.offer);

    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.send(
      JSON.stringify({
        answer,
        clientId: data.clientId,
        type: "answer",
      })
    );
  }
};
/* 
form.addEventListener("submit", (e) => {
  e.preventDefault();
  /* e.preventDefault();
  const formData = new FormData(form);
  const roomId = formData.get("room-id");
  const option = formData.get("option");

  if (socket?.OPEN) {
    socket.send(JSON.stringify({ type: option, roomId }));
  } *
  makeCall();
});

hangUpBtn.addEventListener("click", async () => {
  await hangup();
}); 
*/

minimize.addEventListener("click", (e) => {
  localVideoWrapper.style.bottom = "1rem";
  localVideoWrapper.style.right = "1rem";
});

async function main() {
  try {
    stream = await openMediaDevices(constraints);
    peerConnection = await initPeerConnection(configuration);
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
}

main();
