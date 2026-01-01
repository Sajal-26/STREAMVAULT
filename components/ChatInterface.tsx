import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, Users, Minimize2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  viewerCount: number;
  username: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, viewerCount, username }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
        scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[120] bg-brand-primary text-white p-4 rounded-full shadow-2xl hover:bg-red-700 transition-all transform hover:scale-110 flex items-center justify-center group"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute right-0 top-0 -mt-1 -mr-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] items-center justify-center font-bold border border-white">
                {viewerCount}
            </span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[120] w-[90vw] max-w-[350px] h-[500px] max-h-[70vh] flex flex-col bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center text-xs font-bold ring-2 ring-black">
                    You
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold ring-2 ring-black">
                    <Users className="w-4 h-4" />
                 </div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-white">Watch Party</h3>
                <p className="text-xs text-green-400 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                    {viewerCount} Online
                </p>
            </div>
        </div>
        <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
        >
            <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center space-y-2 opacity-50">
                <MessageSquare className="w-12 h-12" />
                <p className="text-sm">No messages yet.<br/>Say hello to your friends!</p>
            </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center' : (msg.sender === username ? 'items-end' : 'items-start')}`}>
            {msg.isSystem ? (
                <span className="bg-white/10 text-gray-300 text-[10px] px-2 py-1 rounded-full mb-2">
                    {msg.text}
                </span>
            ) : (
                <>
                    <span className="text-[10px] text-gray-400 mb-1 ml-1">{msg.sender}</span>
                    <div 
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                            msg.sender === username 
                            ? 'bg-brand-primary text-white rounded-br-none' 
                            : 'bg-gray-800 text-gray-100 rounded-bl-none border border-white/5'
                        }`}
                    >
                        {msg.text}
                    </div>
                </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/40">
        <div className="relative flex items-center">
            <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-white/10 border border-transparent focus:border-brand-primary/50 text-white text-sm rounded-full py-2.5 pl-4 pr-12 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-primary/50 transition-all"
            />
            <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="absolute right-1 p-1.5 bg-brand-primary text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-brand-primary transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
