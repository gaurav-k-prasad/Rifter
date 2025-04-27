import { v4 as uuidv4 } from "uuid";
import { WebSocketServer } from "ws";

const port = 8080;
const wss = new WebSocketServer({ port });
let c = 1;

const rooms = new Map();
const clients = new Map();

function printDetails(map) {
  console.table(map);
}

function isRoomPresent(roomId) {
  return rooms.has(roomId);
}

function createRoom() {
  const roomId = uuidv4();
  rooms.set(roomId, []);
  return roomId;
}

function joinRoom(clientId, roomId) {
  if (!rooms.has(roomId)) roomId = createRoom(); // <> adding room

  rooms.get(roomId).push(clientId);
  clients.get(clientId).room = roomId;
}

function leaveRoom(clientId) {
  const roomId = clients.get(clientId).room;
  console.log("roomId :>> ", roomId);
  if (!roomId) return;

  rooms.set(
    roomId,
    rooms.get(roomId).filter((client) => client !== clientId)
  );
  if (rooms.get(roomId).length === 0) rooms.delete(roomId);
  delete clients.get(clientId).room;
}

wss.on("connection", (ws) => {
  const clientId = c++;
  ws.clientId = clientId;
  clients.set(clientId, ws);
  console.log("connected");

  ws.on("message", (message) => {
    console.log(clientId);
    const data = JSON.parse(message);
    let roomId;

    if (data.roomId) {
      roomId = data.roomId;
      if (!isRoomPresent(roomId))
        return ws.send(
          JSON.stringify({ type: "error", message: "wrong room id" })
        );
    }

    switch (data.type) {
      case "create":
        leaveRoom(clientId); // To exit previous room
        let newRoom = createRoom(); // Creating a room
        joinRoom(clientId, newRoom); // Joining the room
        ws.send(JSON.stringify({ type: "roomId", roomId: newRoom }));
        break;

      case "join":
        leaveRoom(clientId); // To exit previous room

        const peerInfo = [];
        let clientsInRoom = rooms.get(roomId);
        console.log(clientsInRoom);
        if (!clientsInRoom) {
          console.log(roomId, clients);
        }

        for (let client of clientsInRoom) {
          if (client !== clientId) peerInfo.push(client);
        }
        ws.send(JSON.stringify({ type: "peerInfo", peerInfo }));
        console.log("peerInfo :>> ", peerInfo);
        joinRoom(clientId, roomId);
        break;

      case "leave":
        leaveRoom(clientId);
        break;

      case "offer":
        clients.get(data.to).send(
          JSON.stringify({
            offer: { sdp: data.offer.sdp, type: "offer" },
            from: clientId,
            type: "offer",
          })
        );
        break;

      case "answer":
        clients.get(data.to).send(
          JSON.stringify({
            answer: { sdp: data.answer.sdp, type: "answer" },
            from: clientId,
            type: "answer",
          })
        );
        break;

      case "ice":
        clients.get(data.to).send(
          JSON.stringify({
            ice: data.ice,
            from: clientId,
            type: "ice",
          })
        );
        break;

      case "bye":
        clients.get(data.user).send(
          JSON.stringify({
            user: clientId,
            type: "bye",
          })
        );
        break;
    }

    printDetails(rooms);
  });

  ws.on("close", () => {
    const clientRoom = clients.get(clientId).room;

    for (let client of clients) {
      client[1].send(
        JSON.stringify({
          user: clientId,
          type: "bye",
        })
      );
    }

    if (clientRoom != undefined) leaveRoom(clientId, clientRoom);
    clients.delete(clientId);

    console.log("disconnected");
    printDetails(rooms);
  });
});
