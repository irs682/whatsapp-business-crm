import React, { useState } from 'react';
import { Search, Send, Clock, UserCheck, Shield, Paperclip, MessageSquare } from 'lucide-react';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const InboxPage = () => {
  const [selectedChat, setSelectedChat] = useState({
    id: '1',
    name: 'Sarah Jenkins',
    phone: '+1 (555) 234-5678',
    status: 'OPEN',
    department: 'Customer Support',
    lastMessageAt: '12 mins ago',
    windowHoursRemaining: 23,
  });

  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const mockConversations = [
    { id: '1', name: 'Sarah Jenkins', phone: '+1 (555) 234-5678', unread: 2, snippet: 'Can you provide the invoice for our recent order?', time: '12m', status: 'OPEN' },
    { id: '2', name: 'Marcus Chen', phone: '+1 (555) 891-2345', unread: 0, snippet: 'Interested in the Enterprise WhatsApp tier.', time: '1h', status: 'PENDING' },
    { id: '3', name: 'TechCorp Logistics', phone: '+1 (555) 432-1098', unread: 0, snippet: 'Template notification confirmed.', time: '3h', status: 'RESOLVED' },
  ];

  return (
    <div className="h-[calc(100vh-8.5rem)] flex bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Left Column: Conversation Directory */}
      <div className="w-80 border-r border-slate-800 flex flex-col shrink-0 bg-slate-900/60">
        <div className="p-3.5 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {mockConversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-3.5 cursor-pointer transition-colors ${
                selectedChat?.id === chat.id ? 'bg-slate-800/80 border-l-2 border-brand-500' : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">{chat.name}</span>
                <span className="text-[11px] text-slate-500">{chat.time}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">{chat.snippet}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-500">{chat.phone}</span>
                {chat.unread > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-brand-500 text-slate-950 text-[10px] font-bold">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Chat Active Thread */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {/* Thread Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center font-bold text-sm text-brand-400">
              {selectedChat?.name?.[0] || 'C'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">{selectedChat?.name}</span>
                <Badge color="emerald">{selectedChat?.status || 'OPEN'}</Badge>
              </div>
              <span className="text-xs text-slate-400">{selectedChat?.phone}</span>
            </div>
          </div>

          {/* 24-Hour Customer Service Window Pill */}
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
            <span>24h Window Active (23h remaining)</span>
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex justify-start">
            <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-200 shadow-md">
              <p>Hello! We placed an order yesterday under account #9921. Could you send the PDF receipt?</p>
              <span className="text-[10px] text-slate-500 block text-right mt-1.5">10:42 AM</span>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-md bg-brand-600 rounded-2xl rounded-tr-sm p-4 text-xs text-white shadow-md">
              <p>Hi Sarah! Looking into order #9921 now. Give me just one moment to pull the records.</p>
              <div className="flex items-center justify-end space-x-1 mt-1.5 text-[10px] text-brand-200">
                <span>10:44 AM</span>
                <span>• Read</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-3 py-1 text-[11px] flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Internal Note: Verified customer identity via registered phone number.</span>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsInternalNote(!isInternalNote)}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  isInternalNote ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isInternalNote ? '🔒 Internal Note Mode' : 'Customer Reply Mode'}
              </button>
            </div>
            <span className="text-[11px] text-slate-500">Press Enter to send</span>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={isInternalNote ? 'Type an internal team note...' : 'Type a WhatsApp message to customer...'}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <Button size="md">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
