type RealtimePayload = Record<string, unknown>;
type RealtimeHandler = (payload: RealtimePayload) => void;

interface RealtimeMessage {
  event: string;
  payload: RealtimePayload;
  timestamp: string;
}

class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<RealtimeHandler>> = new Map();
  private shouldReconnect = false;
  private reconnectAttempts = 0;

  connect(): void {
    if (import.meta.env.MODE === "test") {
      return;
    }

    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.shouldReconnect = true;
    const wsUrl = this.resolveWebSocketUrl();
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as RealtimeMessage;
        this.emit(parsed.event, parsed.payload || {});
      } catch {
        // Ignore malformed websocket payloads.
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      if (!this.shouldReconnect) {
        return;
      }
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
      this.reconnectAttempts += 1;
      window.setTimeout(() => this.connect(), delay);
    };

    this.socket.onerror = () => {
      // close event handles reconnect logic.
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  subscribe(event: string, handler: RealtimeHandler): () => void {
    const existing = this.listeners.get(event) || new Set<RealtimeHandler>();
    existing.add(handler);
    this.listeners.set(event, existing);

    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  private emit(event: string, payload: RealtimePayload): void {
    const directHandlers = this.listeners.get(event);
    directHandlers?.forEach((handler) => handler(payload));

    const wildcardHandlers = this.listeners.get("*");
    wildcardHandlers?.forEach((handler) => handler({ ...payload, event }));
  }

  private resolveWebSocketUrl(): string {
    const explicitWsUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (explicitWsUrl && explicitWsUrl.length > 0) {
      return explicitWsUrl;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
}

export const realtimeClient = new RealtimeClient();
