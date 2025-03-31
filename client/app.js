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
  peerConnection.icePending = [];

  peerConnection.addEventListener("icecandidate", (event) => {
    console.log("ice candidate found");
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

  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  return peerConnection;
}

async function hangup(caller = true, userId) {
  function close(user) {
    if (user.channel) user.channel.close();

    user.getSenders().forEach((sender) => {
      user.removeTrack(sender);
    });

    user.close();
  }

  if (!caller) {
    close(clients.get(userId));
    clients.delete(userId);
    return;
  }

  for (let peerConnection of clients) {
    socket.send(JSON.stringify({ type: "bye", user: peerConnection[0] }));

    close(peerConnection[1]);
    console.log("call ended");
  }
  clients.clear();
}

async function makeCall() {
  socket.send(JSON.stringify({ type: "join" }));
}

let d = 0;
socket.addEventListener("message", async (message) => {
  const data = JSON.parse(message.data);

  if (data.type == "bye") {
    await hangup(false, data.user);
  } else if (data.type == "ice") {
    let peerConnection = clients.get(data.from);
    if (clients.has(data.from)) {
      d++;
      await peerConnection.addIceCandidate(data.ice);
    } else {
      peerConnection.icePending.push(data.ice);
    }
  } else if (data.type == "peerInfo") {
    console.log(data.peerInfo);
    for (let client of data.peerInfo) {
      const peerConnection = await initPeerConnection();
      peerConnection.to = client;
      peerConnection.channel = peerConnection.createDataChannel("channel");
      initDataChannel(peerConnection.channel);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      clients.set(client, peerConnection);

      socket.send(JSON.stringify({ offer, type: "offer", to: client }));
    }
  } else if (data.answer) {
    console.log("calling :>> ", data.answer);

    const peerConnection = clients.get(data.from);
    const remoteDesc = new RTCSessionDescription(data.answer);

    peerConnection.icePending.forEach(async (ice) => {
      await peerConnection.addIceCandidate(ice);
    });

    await peerConnection.setRemoteDescription(remoteDesc);
  } else if (data.offer) {
    console.log("answering :>>", data.offer);

    const peerConnection = await initPeerConnection();
    peerConnection.to = data.from;
    clients.set(data.from, peerConnection);

    const remoteDesc = new RTCSessionDescription(data.offer);
    peerConnection.icePending.forEach(async (ice) => {
      await peerConnection.addIceCandidate(ice);
    });

    peerConnection.setRemoteDescription(remoteDesc);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.send(JSON.stringify({ answer, to: data.from, type: "answer" }));
  }
});

async function main() {
  try {
    stream = await openMediaDevices(constraints);
    localVideo.srcObject = stream;
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
}

main();

// data.from -> offers/answer
// data.to -> ice
