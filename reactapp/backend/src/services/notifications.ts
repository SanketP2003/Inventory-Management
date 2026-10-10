import type { Server } from 'socket.io';
let io: Server | undefined;
export function setSocketServer(server: Server) { io = server; }
export function notifyLowStock(product: unknown) { io?.emit('low-stock', product); }
