import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WebSocketEvent } from '../types';

export type EventCallback = (event: WebSocketEvent) => void;

class WebSocketService {
  private client: Client | null = null;
  private subscribers: Map<string, Set<EventCallback>> = new Map();
  private isConnected = false;
  private currentRoomCode: string | null = null;

  connect(roomCode: string, onConnectChange?: (connected: boolean) => void) {
    if (this.client && this.currentRoomCode === roomCode && this.isConnected) {
      return;
    }

    this.disconnect();
    this.currentRoomCode = roomCode.toUpperCase();

    const brokerUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socketEndpoint = `${brokerUrl}/ws`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(socketEndpoint),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg: string) => {
        // quiet debug logging
      },
    });

    this.client.onConnect = () => {
      this.isConnected = true;
      if (onConnectChange) onConnectChange(true);

      const destination = `/topic/session/${this.currentRoomCode}`;
      this.client?.subscribe(destination, (message: IMessage) => {
        try {
          const event: WebSocketEvent = JSON.parse(message.body);
          this.notifySubscribers(event);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      });
    };

    this.client.onDisconnect = () => {
      this.isConnected = false;
      if (onConnectChange) onConnectChange(false);
    };

    this.client.onStompError = (frame) => {
      console.warn('STOMP protocol error:', frame.headers['message']);
      this.isConnected = false;
      if (onConnectChange) onConnectChange(false);
    };

    this.client.activate();
  }

  subscribe(eventType: string, callback: EventCallback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)?.add(callback);

    return () => {
      this.subscribers.get(eventType)?.delete(callback);
    };
  }

  private notifySubscribers(event: WebSocketEvent) {
    // Notify specific type subscribers
    const typeSubs = this.subscribers.get(event.type);
    if (typeSubs) {
      typeSubs.forEach((cb) => cb(event));
    }
    // Notify wildcard subscribers
    const allSubs = this.subscribers.get('*');
    if (allSubs) {
      allSubs.forEach((cb) => cb(event));
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.isConnected = false;
    this.currentRoomCode = null;
  }
}

export const wsService = new WebSocketService();
