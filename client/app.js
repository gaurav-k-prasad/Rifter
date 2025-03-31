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
let peerConnection;

const clients = new Map();

async function openMediaDevices(constraints) {
  return await navigator.mediaDevices.getUserMedia(constraints);
}

function initiateWebSocket() {
  // return new WebSocket("https://x8c19r2x-3000.inc1.devtunnels.ms/");
  return new WebSocket("ws://localhost:3000");
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
  peerConnection.icePending = [];

  peerConnection.addEventListener("icecandidate", (event) => {
    console.log("ice candidate found");
    console.log(peerConnection.to);
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          to: peerConnection.to,
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
    peerConnection.channel = event.channel;
    initDataChannel(peerConnection.channel);
  });

  localVideo.srcObject = stream;
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  return peerConnection;
}

async function hangup(caller = true) {
  for (let peerConnection of clients) {
    if (peerConnection[1].channel) {
      peerConnection[1].channel.close();
    }

    peerConnection[1].getSenders().forEach((sender) => {
      peerConnection[1].removeTrack(sender);
    });

    peerConnection[1].close();
    console.log("call ended");
  }
  // if (caller) socket.send(JSON.stringify({ type: "bye" }));

  currStatus = ANSWERING;
  peerConnection = await initPeerConnection(configuration);
}

async function makeCall() {
  currStatus = CALLING;
  /*   
  const peerConnection = await initPeerConnection(configuration);
  peerConnection.channel = peerConnection.createDataChannel("channel");
  initDataChannel(peerConnection.channel);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.send(JSON.stringify({ offer, type: "offer" }));
*/
  socket.send(JSON.stringify({ type: "join" }));
}

socket.onmessage = async (message) => {
  const data = JSON.parse(message.data);

  if (data.type == "bye") {
    await hangup(false);
  } else if (data.type == "ice") {
    console.log(clients, data.clientId);
    if (clients.has(data.clientId)) {
      let peerConnection = clients.get(data.clientId);
      await peerConnection.addIceCandidate(data.ice);
    } else {
      peerConnection.icePending.push(data.ice);
    }
  } else if (data.type === "peerInfo") {
    console.log(data.peerInfo);
    for (let client of data.peerInfo) {
      const peerConnection = await initPeerConnection();
      peerConnection.to = client;
      peerConnection.channel = peerConnection.createDataChannel("channel");
      initDataChannel(peerConnection.channel);
      clients.set(client, peerConnection);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.send(JSON.stringify({ offer, type: "offer", to: client }));
    }
  } else if (data.answer) {
    /* && currStatus == CALLING) */
    console.log("calling :>> ", data.answer);

    let pc = peerConnection;
    clients.set(data.clientId, pc);
    peerConnection = await initPeerConnection(configuration);

    const remoteDesc = new RTCSessionDescription(data.answer);
    console.log("peerConnection.remoteDescription :>> ", pc.signalingState);
    await pc.setRemoteDescription(remoteDesc);
    pc.icePending.forEach((item) => {
      pc.addIceCandidate(item);
    });
  } else if (data.offer) {
    /* && currStatus == ANSWERING) */
    console.log("answering :>>", data.offer);
    console.log(peerConnection);

    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    peerConnection.icePending.forEach((item) => {
      peerConnection.addIceCandidate(item);
    });
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    clients.set(data.clientId, peerConnection);
    peerConnection = await initPeerConnection(configuration);

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
