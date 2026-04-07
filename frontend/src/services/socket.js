import { io } from 'socket.io-client';

let socket = null;

export const initSocketConnection = () => {
  if (!socket) {
    console.log('Initializing socket connection...');

    socket = io('http://localhost:3000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5, // Limit retries to 5 for safety while debugging
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    // ✅ Successful connection
    socket.on('connect', () => {
      console.log('✅ Connected to backend:', socket.id);
    });

    // ⚠️ Connection issues
    socket.on('connect_error', (error) => {
      console.error('🚨 Socket connection error:', error?.message || error);
    });

    // ❌ Disconnection
    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    });

    // 🧠 Custom AI error event
    socket.on('ai-error', (err) => {
      console.error('💥 AI error from server:', err);
    });

    // 🧾 AI response event
    socket.on('ai-response', (data) => {
      console.log('🤖 AI response:', data);
    });

    // (Optional) reconnect attempt log
    socket.io.on('reconnect_attempt', (attempt) => {
      console.log('Reconnecting attempt:', attempt);
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};
