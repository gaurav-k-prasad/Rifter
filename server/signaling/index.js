import { v4 as uuidv4 } from "uuid";
import { WebSocketServer } from "ws";

const port = 3000;
const wss = new WebSocketServer({ port });

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

function joinRoom(clientId, roomId, ws) {
  rooms.get(roomId).push(ws);
  clients.get(clientId).room = roomId;
}

function leaveRoom(clientId) {
  const roomId = clients.get(clientId).room;
  if (!roomId) return;

  rooms.set(
    roomId,
    rooms.get(roomId).filter((client) => client.clientId !== clientId)
  );
  if (rooms.get(roomId).length === 0) rooms.delete(roomId);
  delete clients.get(clientId).room;
}

wss.on("connection", (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;
  clients.set(clientId, ws);
  console.log("connected");

  ws.on("message", (message) => {
    console.log(clientId);
    const data = JSON.parse(message);
    let roomId;
    console.log(data);

    if (data.roomId) {
      roomId = data.roomId;
      if (!isRoomPresent(roomId))
        return ws.send(JSON.stringify({ message: "wrong room id" }));
    }

    switch (data.type) {
      case "create":
        leaveRoom(clientId); // To exit previous room
        let newRoom = createRoom(); // Creating a room
        joinRoom(clientId, newRoom, ws); // Joining the room
        break;

      case "join":
        leaveRoom(clientId); // To exit previous room
        joinRoom(clientId, roomId, ws);
        break;

      case "leave":
        leaveRoom(clientId);
        break;

      case "offer":
        for (let client of clients) {
          if (client[0] == clientId) continue;

          client[1].send(
            JSON.stringify({
              offer: { sdp: data.offer.sdp, type: "offer" },
              clientId,
              type: "offer",
            })
          );
        }
        break;

      case "answer":
        let currClientWs = clients.get(data.clientId);
        /* for (let client of clients) {
          if (client[0] == clientId) continue;

          client[1].send(
            JSON.stringify({ sdp: data.answer.sdp, type: "answer" })
          );
        } */
        currClientWs.send(
          JSON.stringify({
            answer: { sdp: data.answer.sdp, type: "answer" },
            clientId,
            type: "answer",
          })
        );
        break;

      case "ice":
        for (let client of clients) {
          if (client[0] == clientId) continue;

          client[1].send(JSON.stringify({ ice: data.ice, type: "ice" }));
        }
        break;

      case "bye":
        for (let client of clients) {
          if (client[0] == clientId) continue;

          client[1].send(JSON.stringify({ type: "bye" }));
        }
        break;
    }

    printDetails(rooms);
  });

  ws.on("close", () => {
    const clientRoom = clients.get(clientId).room;
    if (clientRoom != undefined) leaveRoom(clientId, clientRoom);
    clients.delete(clientId);

    console.log("disconnected");
    printDetails(rooms);
  });
});
