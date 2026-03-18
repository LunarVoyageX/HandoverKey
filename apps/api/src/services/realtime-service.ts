import { IncomingMessage, Server as HttpServer } from "http";
import { URL } from "node:url";
import { parse as parseCookie } from "cookie";
import { WebSocketServer, WebSocket } from "ws";
import { JWTManager } from "../auth/jwt";
import { SessionService } from "./session-service";
import { logger } from "../config/logger";

interface AuthedSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
}

interface RealtimeEnvelope {
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export class RealtimeService {
  private static instance: RealtimeService;
  private wss: WebSocketServer | null = null;
  private socketsByUser: Map<string, Set<AuthedSocket>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  initialize(server: HttpServer): void {
    if (this.wss) {
      return;
    }

    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (socket, request) => {
      void this.handleConnection(socket as AuthedSocket, request);
    });

    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) {
        return;
      }
      this.wss.clients.forEach((rawSocket) => {
        const socket = rawSocket as AuthedSocket;
        if (socket.isAlive === false) {
          socket.terminate();
          return;
        }
        socket.isAlive = false;
        socket.ping();
      });
    }, 30000);

    logger.info("Realtime WebSocket service initialized");
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.socketsByUser.clear();
  }

  broadcastToUser(
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    const message: RealtimeEnvelope = {
      event,
      payload,
      timestamp: new Date().toISOString(),
    };
    const serialized = JSON.stringify(message);

    sockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      }
    });
  }

  getStats(): { connectedUsers: number; totalConnections: number } {
    let totalConnections = 0;
    this.socketsByUser.forEach((sockets) => {
      totalConnections += sockets.size;
    });

    return {
      connectedUsers: this.socketsByUser.size,
      totalConnections,
    };
  }

  private async handleConnection(
    socket: AuthedSocket,
    request: IncomingMessage,
  ): Promise<void> {
    try {
      const token = this.extractTokenFromRequest(request);
      if (!token) {
        socket.close(4401, "Authentication required");
        return;
      }

      const payload = JWTManager.verifyToken(token);
      const isValidSession = await SessionService.validateSession(payload);
      if (!isValidSession) {
        socket.close(4401, "Invalid session");
        return;
      }

      socket.userId = payload.userId;
      socket.sessionId = payload.sessionId;
      socket.isAlive = true;
      socket.on("pong", () => {
        socket.isAlive = true;
      });

      this.registerSocket(payload.userId, socket);

      socket.on("close", () => {
        this.unregisterSocket(payload.userId, socket);
      });
      socket.on("error", (error) => {
        logger.warn({ err: error }, "Realtime websocket error");
        this.unregisterSocket(payload.userId, socket);
      });
      socket.on("message", () => {
        // The server is currently push-only for notifications.
      });

      this.broadcastToUser(payload.userId, "realtime.connected", {
        sessionId: payload.sessionId,
      });
    } catch (error) {
      logger.warn(
        { err: error },
        "Failed to authenticate websocket connection",
      );
      socket.close(4401, "Authentication failed");
    }
  }

  private extractTokenFromRequest(request: IncomingMessage): string | null {
    const requestUrl = new URL(request.url || "/", "http://localhost");
    const queryToken = requestUrl.searchParams.get("token");
    if (queryToken) {
      return queryToken;
    }

    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookies = parseCookie(cookieHeader);
    return cookies.accessToken || null;
  }

  private registerSocket(userId: string, socket: AuthedSocket): void {
    const existing = this.socketsByUser.get(userId) || new Set<AuthedSocket>();
    existing.add(socket);
    this.socketsByUser.set(userId, existing);
  }

  private unregisterSocket(userId: string, socket: AuthedSocket): void {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socket);
    if (sockets.size === 0) {
      this.socketsByUser.delete(userId);
    }
  }
}

export const realtimeService = RealtimeService.getInstance();
