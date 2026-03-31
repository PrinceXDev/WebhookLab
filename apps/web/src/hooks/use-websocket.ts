import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const activeSubscriptions = new Set<string>();

export function useWebSocket(
  endpointSlug: string,
  onEvent: (event: any) => void,
) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);

  // Keep the callback ref updated without triggering re-subscriptions
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    // Initialize socket if it doesn't exist
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000", {
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        setIsConnected(true);

        // Re-subscribe to all active endpoints on reconnect
        activeSubscriptions.forEach((slug) => {
          socket?.emit("subscribe", slug);
        });
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
      });
    } else {
      // Socket already exists, update connection state
      setIsConnected(socket.connected);
    }

    // Subscribe to this endpoint
    if (!activeSubscriptions.has(endpointSlug)) {
      socket.emit("subscribe", endpointSlug);
      activeSubscriptions.add(endpointSlug);
    }

    // Handle incoming webhook events
    const eventHandler = (event: any) => {
      onEventRef.current(event);
    };

    socket.on("webhook-event", eventHandler);

    return () => {
      // Only remove the event listener, keep subscription active
      socket?.off("webhook-event", eventHandler);

      // Optionally unsubscribe when component unmounts
      // Comment out these lines if you want to keep subscriptions alive across navigation
      if (activeSubscriptions.has(endpointSlug)) {
        socket?.emit("unsubscribe", endpointSlug);
        activeSubscriptions.delete(endpointSlug);
      }
    };
  }, [endpointSlug]);

  return { isConnected };
}
