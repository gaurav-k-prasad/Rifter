export function removeClientFromMap(setClients, client) {
  setClients((prev) => {
    const newMap = new Map(prev);
    console.log(newMap);
    console.log(client);
    console.log(newMap.delete(client));
    return newMap;
  });
}

export function addClientToMap(setClients, client, clientCon) {
  setClients((prev) => {
    const newMap = new Map(prev);
    newMap.set(client, clientCon);
    return newMap;
  });
}

export function initDataChannel(channel, setCallMode) {
  channel.addEventListener("open", () => {
    setCallMode("call");
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
  socket,
  setCallMode
) {
  const peerConnection = new RTCPeerConnection(configuration);

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
    remoteVideo.srcObject = remoteStream; // todo what is remoteVideo
  });

  peerConnection.addEventListener("datachannel", (event) => {
    peerConnection.channel = event.channel;
    initDataChannel(peerConnection.channel, setCallMode);
  });

  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  return peerConnection;
}

export function hangup(
  caller = true,
  userId = null,
  socket,
  clients,
  setClients
) {
  function close(user) {
    user.channel?.close();
    // todo remove the video
    user.getSenders().forEach((sender) => {
      user.removeTrack(sender);
    });

    user.close();
  }

  if (!caller) {
    close(clients.get(userId)?.connection);
    removeClientFromMap(setClients, userId);
    return;
  }
  console.log(clients);
  for (let peerConnection of clients) {
    socket.send(JSON.stringify({ type: "bye", user: peerConnection[0] }));

    close(peerConnection[1]?.connection);
    console.log("call ended");
  }
  setClients(new Map());
}

export function makeCall(socket, clients, setClients) {
  hangup(true, null, socket, clients, setClients);
  socket.send(JSON.stringify({ type: "join" }));
}

export async function handleSocketMessage(
  message,
  socket,
  clients,
  configuration,
  stream,
  remoteVideo,
  setClients,
  setCallMode
) {
  const data = JSON.parse(message.data);

  switch (data.type) {
    case "bye": {
      hangup(false, data.user, socket, clients, setClients);
      break;
    }
    case "ice": {
      if (clients.has(data.from)) {
        let peerConnection = clients.get(data.from).connection;
        await peerConnection.addIceCandidate(data.ice);
      }
      break;
    }
    case "peerInfo": {
      for (let client of data.peerInfo) {
        const peerConnection = await initPeerConnection(
          configuration,
          stream,
          remoteVideo,
          socket,
          setCallMode
        );
        peerConnection.to = client;
        peerConnection.channel = peerConnection.createDataChannel("channel");
        initDataChannel(peerConnection.channel, setCallMode);

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        addClientToMap(setClients, client, { connection: peerConnection });

        socket.send(JSON.stringify({ offer, type: "offer", to: client }));
      }
      break;
    }
    case "answer": {
      console.log("data.answer :>> ", data);

      const peerConnection = clients.get(data.from).connection;
      const remoteDesc = new RTCSessionDescription(data.answer);
      console.log(peerConnection);
      await peerConnection.setRemoteDescription(remoteDesc);
      break;
    }
    case "offer": {
      console.log("data.offer :>>", data.offer);

      const peerConnection = await initPeerConnection(
        configuration,
        stream,
        remoteVideo,
        socket,
        setCallMode
      );
      peerConnection.to = data.from;
      addClientToMap(setClients, data.from, { connection: peerConnection });

      const remoteDesc = new RTCSessionDescription(data.offer);
      peerConnection.setRemoteDescription(remoteDesc);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.send(JSON.stringify({ answer, to: data.from, type: "answer" }));
      break;
    }
  }
}

export async function openMediaDevices(constraints) {
  return await navigator.mediaDevices.getUserMedia(constraints);
}

export function initiateWebSocket() {
  return new WebSocket("https://x8c19r2x-3000.inc1.devtunnels.ms/");
}
