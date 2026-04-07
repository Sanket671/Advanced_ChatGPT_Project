import React from 'react';
import Sidebar from '../Layout/Sidebar';

const ChatList = () => {
  // This view will act as a placeholder that shows the sidebar and a welcome pane.
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <div className="welcome-box">
          <h2>Welcome to ChatGPT Clone</h2>
          <p className="muted">Select a chat or create a new one from the left.</p>
        </div>
      </main>
    </div>
  );
};

export default ChatList;