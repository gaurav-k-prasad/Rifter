export function initDataChannel(channel) {
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

export async function initPeerConnection(
  configuration,
  stream,
  remoteVideo,
  socket
) {
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

  peerConnection.addEventListener("connectionstatechange", () => {
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

export async function hangup(caller = true, userId, socket, clients) {
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

export async function makeCall(socket) {
  socket.send(JSON.stringify({ type: "join" }));
}

export async function handleSocketMessage(
  message,
  socket,
  clients,
  configuration,
  stream,
  remoteVideo
) {
  const data = JSON.parse(message.data);

  if (data.type == "bye") {
    await hangup(false, data.user, socket, clients);
  } else if (data.type == "ice") {
    let peerConnection = clients.get(data.from);
    if (clients.has(data.from)) {
      await peerConnection.addIceCandidate(data.ice);
    } else {
      peerConnection.icePending.push(data.ice);
    }
  } else if (data.type == "peerInfo") {
    console.log(data.peerInfo);
    for (let client of data.peerInfo) {
      const peerConnection = await initPeerConnection(
        configuration,
        stream,
        remoteVideo,
        socket
      );
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

    const peerConnection = await initPeerConnection(
      configuration,
      stream,
      remoteVideo,
      socket
    );
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
}

export async function openMediaDevices(constraints) {
  return await navigator.mediaDevices.getUserMedia(constraints);
}

export function initiateWebSocket() {
  return new WebSocket("https://x8c19r2x-3000.inc1.devtunnels.ms/");
}
