import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const StreamContext = createContext();
const ClientsContext = createContext();
const SocketContext = createContext();
const RoomIdContext = createContext();
const CallModeContext = createContext();

export function StreamProvider({ children }) {
  const streamRef = useRef();

  return (
    <StreamContext.Provider value={{ streamRef }}>
      {children}
    </StreamContext.Provider>
  );
}

export function ClientsProvider({ children }) {
  const [clients, setClients] = useState(new Map());
  const clientsRef = useRef(clients);

  useEffect(() => {
    clientsRef.current = clients;
  }, [clients]);

  return (
    <ClientsContext.Provider value={{ clients, setClients, clientsRef }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  return (
    <SocketContext.Provider
      value={{ socketRef, isSocketConnected, setIsSocketConnected }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function RoomIdProvider({ children }) {
  const [roomId, setRoomId] = useState("");

  return (
    <RoomIdContext.Provider value={{ roomId, setRoomId }}>
      {children}
    </RoomIdContext.Provider>
  );
}

export function CallModeProvider({ children }) {
  const [callMode, setCallMode] = useState("idle");

  return (
    <CallModeContext.Provider value={{ callMode, setCallMode }}>
      {children}
    </CallModeContext.Provider>
  );
}

export function useStream() {
  const context = useContext(StreamContext);

  if (!context) {
    throw new Error("Stream context not found");
  }

  return context;
}

export function useCallMode() {
  const context = useContext(CallModeContext);

  if (!context) {
    throw new Error("Call mode context not found");
  }

  return context;
}

export function useClients() {
  const context = useContext(ClientsContext);

  if (!context) {
    throw new Error("Clients Context not found");
  }

  return context;
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("Socket context not found");
  }

  return context;
}

export function useRoomId() {
  const context = useContext(RoomIdContext);

  if (!context) {
    throw new Error("RoomId context not found");
  }

  return context;
}
