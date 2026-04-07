import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { getChatMessages } from '../../services/api';
import Message from './Message';
import Sidebar from '../Layout/Sidebar';

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { chatId } = useParams();
  const { socket } = useSocket();

  useEffect(() => {
    fetchMessages();

    if (socket) {
      socket.on('ai-response', (data) => {
        if (data.chat === chatId) {
          setMessages(prev => [...prev, {
            _id: Date.now().toString(),
            content: data.content,
            role: 'model',
            createdAt: new Date()
          }]);
        }
        setLoading(false);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        setLoading(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('ai-response');
        socket.off('error');
      }
    };
  }, [socket, chatId]);

  const fetchMessages = async () => {
    try {
      const response = await getChatMessages(chatId);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || loading) return;

    const userMessage = {
      _id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      createdAt: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    socket.emit('ai-message', {
      content: inputMessage,
      chat: chatId
    });
  };

  return (
    <div className="app-shell">
      <Sidebar activeChatId={chatId} />

      <main className="main-panel chat-panel">
        <div className="chat-header">
          <h3 className="chat-title">Chat</h3>
        </div>

        <div className="messages-container" id="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">Start a conversation by sending a message below</div>
          ) : (
            messages.map(m => <Message key={m._id} message={m} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="composer">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask anything..."
            className="composer-input"
            rows={1}
            disabled={loading}
          />
          <div className="composer-actions">
            <button
              type="submit"
              className="send-btn"
              disabled={loading || !inputMessage.trim()}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ChatWindow;