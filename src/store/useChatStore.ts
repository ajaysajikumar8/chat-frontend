import { create } from 'zustand';
import api from '../services/api';
import type { Conversation, Message } from '../types/chat';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // conversationId -> messages
  userPresence: Record<string, { status: string; lastSeen?: string }>; // userId -> presence
  selectedConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addMessage: (message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  setSelectedConversationId: (id: string | null) => void;
  updateUserPresence: (userId: string, status: string, lastSeen?: string) => void;
  
  // Thunks
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  startConversation: (userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  userPresence: {},
  selectedConversationId: null,
  isLoading: false,
  error: null,

  setConversations: (conversations) => {
    // Also initialize user presence from conversations
    const presence: Record<string, { status: string; lastSeen?: string }> = {};
    conversations.forEach((conv) => {
      conv.participants.forEach((p) => {
        if (p.user) {
          presence[p.user.id] = { status: p.user.status, lastSeen: p.user.lastSeen };
        }
      });
    });
    
    set((state) => ({
      conversations,
      userPresence: { ...state.userPresence, ...presence }
    }));
  },

  addMessage: (message) => set((state) => {
    const convId = message.conversationId;
    const currentMessages = state.messages[convId] || [];
    
    // Check if message already exists (prevent duplicates from socket + local)
    if (currentMessages.some((m) => m.id === message.id)) {
      return state;
    }

    return {
      messages: {
        ...state.messages,
        [convId]: [...currentMessages, message],
      },
      // Optionally update last message in conversation list
      conversations: state.conversations.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            messages: c.messages && c.messages.length > 0 && new Date(c.messages[0].createdAt) > new Date(message.createdAt)
              ? c.messages 
              : [message]
          };
        }
        return c;
      })
    };
  }),

  setMessages: (conversationId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: messages,
    },
  })),

  setSelectedConversationId: (id) => set({ selectedConversationId: id }),

  updateUserPresence: (userId, status, lastSeen) => set((state) => ({
    userPresence: {
      ...state.userPresence,
      [userId]: { status, lastSeen },
    },
  })),

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/conversations');
      get().setConversations(response.data.data);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch conversations' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    // Only fetch if we don't have them yet
    if (get().messages[conversationId]) return;
    
    try {
      const response = await api.get(`/messages/${conversationId}`);
      get().setMessages(conversationId, response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    try {
      // Opt: We could optimistically add the message here
      const response = await api.post(`/messages/${conversationId}`, { content });
      // The socket will broadcast it back to us, but we can also add it immediately
      get().addMessage(response.data.data);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  startConversation: async (userId: string) => {
    try {
      const response = await api.post('/conversations', { participantId: userId });
      const conversation = response.data.data;
      
      // Add conversation if it doesn't exist in local state
      const existingConv = get().conversations.find(c => c.id === conversation.id);
      if (!existingConv) {
        get().setConversations([conversation, ...get().conversations]);
      }
      
      get().setSelectedConversationId(conversation.id);
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  },
}));
