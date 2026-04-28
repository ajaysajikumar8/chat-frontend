import { io, Socket } from 'socket.io-client';
import { useChatStore } from '../store/useChatStore';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:3000';

let socket: Socket | null = null;

export const connectSocket = () => {
  if (socket?.connected) return;

  const authStorage = localStorage.getItem('auth-storage');
  let token = '';
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    token = state.token || '';
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('new_message', (message) => {
    useChatStore.getState().addMessage(message);
  });

  socket.on('user_presence_changed', ({ userId, status, lastSeen }) => {
    useChatStore.getState().updateUserPresence(userId, status, lastSeen);
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
