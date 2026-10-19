import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

export const initSocket = (token) => {
  if (socketInstance) {
    if (socketInstance.connected) {
      return socketInstance;
    }
    socketInstance.disconnect();
  }

  const socketUrl = getSocketUrl();
  socketInstance = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socketInstance.on('connect', () => {
    console.log('[Socket.IO] Connected to real-time inbox:', socketInstance.id);
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('[Socket.IO] Connection error:', err.message);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
  });

  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
