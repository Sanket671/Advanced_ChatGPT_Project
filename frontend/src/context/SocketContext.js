import React, { createContext, useContext, useEffect, useState } from 'react';
import { initSocketConnection, disconnectSocket } from '../services/socket';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = initSocketConnection(); // initialize socket once
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    // Clean up only on component unmount
    return () => {
      disconnectSocket();
    };
  }, []);

  const value = { socket, isConnected };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
