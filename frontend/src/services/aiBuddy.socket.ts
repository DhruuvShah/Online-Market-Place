import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

const SOCKET_PATH = "/api/socket/socket.io/";

let socket: Socket | null = null;

export function getAiBuddySocket(): Socket {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8080", {
    path: SOCKET_PATH,
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  return socket;
}

export function disconnectAiBuddy() {
  socket?.disconnect();
  socket = null;
}
