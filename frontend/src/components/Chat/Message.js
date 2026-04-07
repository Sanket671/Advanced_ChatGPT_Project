import React from 'react';

const Message = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-row ${isUser ? 'from-user' : 'from-bot'}`}>
      <div className="message-bubble">
        <div className="message-content">{message.content}</div>
        <div className="message-meta">{new Date(message.createdAt).toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default Message;