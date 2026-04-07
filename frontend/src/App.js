import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import Navbar from './components/Layout/Navbar';
import { SocketProvider } from './context/SocketContext';
import './App.css';
import React, { useEffect } from 'react';
import { checkAuth } from './services/api';

function App() {
  const { user } = useAuth();

    useEffect(() => {
      console.log('Testing API connection...');
      checkAuth()
        .then((res) => console.log('Backend response:', res))
        .catch((err) => console.error('Backend error:', err));
    }, []);

  return (
    <div className="App">
      {user && <Navbar />}
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/chats" /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/chats" />} 
        />
        <Route 
          path="/register" 
          element={!user ? <Register /> : <Navigate to="/chats" />} 
        />
        <Route 
          path="/chats" 
          element={
            user ? (
              <SocketProvider>
                <ChatList />
              </SocketProvider>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/chat/:chatId" 
          element={
            user ? (
              <SocketProvider>
                <ChatWindow />
              </SocketProvider>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </div>
  );
}

export default App;