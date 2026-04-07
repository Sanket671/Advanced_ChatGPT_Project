import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createChat, getChats } from '../../services/api';

const Sidebar = ({ activeChatId }) => {
  const [chats, setChats] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const res = await getChats();
      setChats(res.chats || []);
    } catch (err) {
      console.error('Failed to load chats', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await createChat(title.trim());
      setChats(prev => [...prev, res.chat]);
      setTitle('');
      navigate(`/chat/${res.chat._id}`);
    } catch (err) {
      console.error('Create chat failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="brand">ChatGPT Clone</h1>
      </div>

      <form onSubmit={handleCreate} className="new-chat-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New chat"
          className="new-chat-input"
        />
        <button className="new-chat-btn" disabled={loading || !title.trim()}>
          +
        </button>
      </form>

      <nav className="chat-list">
        {chats.map(c => (
          <Link
            to={`/chat/${c._id}`}
            key={c._id}
            className={`chat-item ${activeChatId === c._id ? 'active' : ''}`}
          >
            <div className="chat-item-title">{c.title}</div>
            <div className="chat-item-sub">{new Date(c.lastActivity).toLocaleString()}</div>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">Made with ❤️</div>
    </aside>
  );
};

export default Sidebar;
