import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useWebSocket(
  endpointSlug: string,
  onEvent: (event: any) => void
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
      });
    }

    socket.emit('subscribe', endpointSlug);

    socket.on('webhook-event', onEvent);

    return () => {
      socket?.off('webhook-event', onEvent);
      socket?.emit('unsubscribe', endpointSlug);
    };
  }, [endpointSlug, onEvent]);

  return { isConnected };
}
