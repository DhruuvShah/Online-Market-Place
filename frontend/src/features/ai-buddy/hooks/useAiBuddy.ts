import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { getAiBuddySocket } from "@/services/aiBuddy.socket";

export type ChatMessage = {
  id: number;
  from: "you" | "buddy";
  text: string;
};

export type ConnectionState = "idle" | "connecting" | "ready" | "error";

const CONNECTION_EVENTS = ["connect", "disconnect", "connect_error"] as const;

function subscribeToConnection(onChange: () => void) {
  const socket = getAiBuddySocket();
  CONNECTION_EVENTS.forEach((event) => socket.on(event, onChange));

  return () => {
    CONNECTION_EVENTS.forEach((event) => socket.off(event, onChange));
  };
}

export function useAiBuddy(active: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [failed, setFailed] = useState(false);
  const nextId = useRef(0);

  const connected = useSyncExternalStore(
    subscribeToConnection,
    () => getAiBuddySocket().connected,
    () => false,
  );

  const append = useCallback((from: ChatMessage["from"], text: string) => {
    nextId.current += 1;
    setMessages((current) => [...current, { id: nextId.current, from, text }]);
  }, []);

  useEffect(() => {
    if (!active) return;

    const socket = getAiBuddySocket();

    const onMessage = (text: string) => {
      setIsThinking(false);
      setFailed(false);
      append("buddy", text);
    };

    const onError = () => {
      setIsThinking(false);
      setFailed(true);
    };

    // The server answers a failed turn with this rather than dying, so the
    // drawer says what went wrong instead of thinking forever.
    const onAssistantError = (text: string) => {
      setIsThinking(false);
      append("buddy", text);
    };

    socket.on("message", onMessage);
    socket.on("assistant-error", onAssistantError);
    socket.on("connect_error", onError);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("message", onMessage);
      socket.off("assistant-error", onAssistantError);
      socket.off("connect_error", onError);
    };
  }, [active, append]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      append("you", trimmed);
      setIsThinking(true);
      getAiBuddySocket().emit("message", trimmed);
    },
    [append],
  );

  const connection: ConnectionState = !active
    ? "idle"
    : connected
      ? "ready"
      : failed
        ? "error"
        : "connecting";

  return { messages, connection, isThinking, send };
}
