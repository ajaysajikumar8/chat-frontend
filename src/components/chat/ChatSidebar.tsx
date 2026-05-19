import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Globe, UserPlus } from 'lucide-react';
import type { Conversation, User } from '../../types/chat';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isVisible: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isVisible,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<User[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const { userPresence, startConversation } = useChatStore();

  const filteredConversations = conversations.filter((c) =>
    c.participants.some((p) =>
      p.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  useEffect(() => {
    const fetchGlobalUsers = async () => {
      if (!searchQuery.trim()) {
        setGlobalResults([]);
        return;
      }
      
      setIsSearchingGlobal(true);
      try {
        const response = await api.get(`/users?q=${encodeURIComponent(searchQuery)}`);
        // Filter out users we already have a conversation with
        const existingParticipantIds = new Set(
          conversations.flatMap(c => c.participants.map(p => p.userId))
        );
        
        const newUsers = response.data.data.filter((u: User) => !existingParticipantIds.has(u.id));
        setGlobalResults(newUsers);
      } catch (error) {
        console.error("Failed to search global users", error);
        setGlobalResults([]);
      } finally {
        setIsSearchingGlobal(false);
      }
    };

    const debounceTimer = setTimeout(fetchGlobalUsers, 400);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, conversations]);

  const handleStartGlobalChat = async (userId: string) => {
    await startConversation(userId);
    setSearchQuery('');
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`${
        isVisible ? 'flex' : 'hidden'
      } md:flex flex-col w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-950/50 h-full`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Messages
        </h2>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search or start new chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Conversation & Search List */}
      <div className="flex-1 overflow-y-auto">
        {/* Local Conversations */}
        {filteredConversations.length > 0 && (
          <div className="mb-4">
            {searchQuery && <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Chats</div>}
            {filteredConversations.map((conv) => {
              const isSelected = selectedConversationId === conv.id;
              const participant = conv.participants.find(p => p.userId !== useAuthStore.getState().user?.id)?.user || conv.participants[0].user;
              const status = userPresence[participant.id]?.status || participant.status;
              const lastMessage = conv.messages?.[0];

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 ${
                    isSelected ? 'bg-slate-800/80' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold text-lg border border-indigo-500/30">
                      {participant.displayName.charAt(0).toUpperCase()}
                    </div>
                    {status === 'ONLINE' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-medium text-slate-200 truncate pr-2">
                        {participant.displayName}
                      </h3>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTime(lastMessage?.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-sm text-slate-400 truncate">
                        {lastMessage?.content || (participant.username ? `@${participant.username}` : 'No messages yet')}
                      </p>
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="shrink-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Global Search Results */}
        {searchQuery && (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3" /> Global Search
            </div>
            
            {isSearchingGlobal ? (
              <div className="p-4 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                 <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                 Searching...
              </div>
            ) : globalResults.length > 0 ? (
              globalResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartGlobalChat(user.id)}
                  className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-semibold text-base border border-slate-700">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-200 truncate pr-2">
                      {user.displayName}
                    </h3>
                    <p className="text-sm text-indigo-400 truncate">
                      @{user.username}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-full">
                      <UserPlus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                No new users found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && filteredConversations.length === 0 && (
           <div className="p-8 text-center flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
               <Search className="w-8 h-8 text-slate-600" />
             </div>
             <p className="text-slate-400 text-sm">
               Search for a username to start a new conversation.
             </p>
           </div>
        )}
      </div>
    </div>
  );
};
