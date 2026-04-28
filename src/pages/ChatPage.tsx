import React, { useEffect } from 'react';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { connectSocket, disconnectSocket } from '../services/socket';

export const ChatPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    conversations, 
    messages, 
    selectedConversationId, 
    setSelectedConversationId,
    fetchConversations,
    fetchMessages
  } = useChatStore();

  useEffect(() => {
    connectSocket();
    fetchConversations();
    
    return () => {
      disconnectSocket();
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    }
  }, [selectedConversationId, fetchMessages]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;
  const conversationMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-50">
      <ChatSidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        isVisible={selectedConversationId === null}
      />
      <ChatArea
        conversation={selectedConversation}
        messages={conversationMessages}
        onBack={() => setSelectedConversationId(null)}
        isVisible={selectedConversationId !== null}
        currentUserId={user?.id || ''}
      />
    </div>
  );
};

