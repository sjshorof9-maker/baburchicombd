
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, UserRole } from '../types';
import { supabase } from '../services/supabase';
import { ADMIN_USER } from '../constants';

interface MessengerProps {
  currentUser: User;
  moderators: User[];
}

const Messenger: React.FC<MessengerProps> = ({ currentUser, moderators }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fix: UserRole does not have ADMIN, using SUPER_ADMIN/OWNER
  const chatPartners = (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.OWNER)
    ? moderators 
    : [ADMIN_USER];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Fetch Error:", error);
        if (error.code === '42P01') {
          alert("⚠️ System Error: 'messages' table not found in Supabase. Please run the SQL setup script.");
        }
      }
      if (data) setMessages(data);
      setIsLoading(false);
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`chat_${selectedUser.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        const msg = payload.new as Message;
        const isFromPartner = msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id;
        const isFromMe = msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id;
        
        if (isFromPartner || isFromMe) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, currentUser.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const msgContent = newMessage.trim();
    setNewMessage(''); 

    const msgPayload = {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: msgContent,
      is_read: false
    };

    const { error } = await supabase.from('messages').insert([msgPayload]);
    
    if (error) {
      setNewMessage(msgContent); 
      if (error.code === '42P01') {
        alert("❌ Error: 'messages' table missing.");
      } else {
        alert("Failed to send: " + error.message);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] bg-white md:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
      {/* Sidebar: User List - Hidden on mobile if a user is selected */}
      <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-100 flex-col bg-slate-50/50`}>
        <div className="p-6 md:p-8 border-b border-slate-100">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic">Channels</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Internal Unit Comms</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chatPartners.map(user => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${
                selectedUser?.id === user.id 
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                : 'hover:bg-white text-slate-600'
              }`}
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-xs md:text-sm shadow-sm ${
                selectedUser?.id === user.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {user.name.charAt(0)}
              </div>
              <div className="text-left overflow-hidden">
                <p className="font-black text-sm truncate">{user.name}</p>
                <p className={`text-[8px] font-bold uppercase tracking-widest ${selectedUser?.id === user.id ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {user.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0 bg-white h-full relative`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-600"
                >
                  ←
                </button>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-none text-sm md:text-base">{selectedUser.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[7px] md:text-[8px] font-black text-emerald-500 uppercase tracking-widest">Connected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 bg-slate-50/30 custom-scrollbar pb-24 md:pb-8"
            >
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20 italic">
                  <span className="text-4xl md:text-6xl mb-4">💬</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">No history</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === currentUser.id;
                  return (
                    <div 
                      key={msg.id || i} 
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] md:max-w-[70%] ${isMine ? 'order-1' : 'order-2'}`}>
                        <div className={`p-4 md:p-5 rounded-2xl md:rounded-[2rem] shadow-sm text-xs md:text-sm font-medium ${
                          isMine 
                          ? 'bg-slate-950 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                        <p className={`text-[7px] md:text-[8px] font-black uppercase tracking-tighter mt-1 md:2 ${isMine ? 'text-right' : 'text-left'} text-slate-400`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input - Fixed at bottom on mobile */}
            <form 
              onSubmit={handleSendMessage} 
              className="p-4 md:p-6 bg-white border-t border-slate-100 absolute bottom-0 left-0 right-0 z-30 md:relative"
            >
              <div className="flex gap-2 md:gap-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 px-5 md:px-8 py-3 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[2rem] text-xs md:text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl md:rounded-[2rem] flex items-center justify-center text-lg md:text-xl shadow-xl shadow-indigo-600/20 transition-all active:scale-90 disabled:opacity-50"
                >
                  🚀
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-2xl md:text-4xl mb-6 md:8 border border-slate-100 shadow-inner">
              🛰️
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic">Secure Unit Messaging</h3>
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-xs">
              Select a team member to initiate secure transmission.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger;
