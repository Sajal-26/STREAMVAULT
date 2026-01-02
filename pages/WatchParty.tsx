import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { ref, set, push, onValue, remove, db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { MessageCircle, Send, Users, Play, Copy, ArrowLeft, Tv, MonitorPlay } from 'lucide-react';

interface ChatMessage {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    system?: boolean;
}

interface RoomState {
    mediaType?: 'movie' | 'tv';
    mediaId?: number;
    season?: number;
    episode?: number;
    title?: string;
    hostId: string;
}

const WatchParty: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { accentColor } = useAuth();
    
    // User State
    const [username, setUsername] = useState(() => localStorage.getItem('sv_username') || `Guest${Math.floor(Math.random() * 1000)}`);
    const [userId] = useState(() => {
        let id = localStorage.getItem('sv_userid');
        if(!id) {
            id = Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sv_userid', id);
        }
        return id;
    });

    // Room State
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [users, setUsers] = useState<string[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [playerUrl, setPlayerUrl] = useState('');

    // Lobby State
    const [joinRoomId, setJoinRoomId] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- LOBBY LOGIC ---
    const createRoom = () => {
        const newRoomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        const roomRef = ref(db, `rooms/${newRoomId}`);
        set(roomRef, {
            hostId: userId,
            createdAt: Date.now(),
            users: { [userId]: username }
        });
        navigate(`/party/${newRoomId}`);
    };

    const joinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if(joinRoomId.trim().length > 0) {
            navigate(`/party/${joinRoomId.toUpperCase()}`);
        }
    };

    // --- ROOM LOGIC ---
    useEffect(() => {
        if (!roomId) return;

        localStorage.setItem('sv_username', username);

        // 1. Join Room (Add User)
        const userRef = ref(db, `rooms/${roomId}/users/${userId}`);
        set(userRef, username);
        // Remove user on disconnect
        // onDisconnect(userRef).remove(); 

        // 2. Listen to Room State (Media)
        const stateRef = ref(db, `rooms/${roomId}/state`);
        const unsubscribeState = onValue(stateRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setRoomState(data);
                
                // Update Player
                const color = accentColor.replace('#', '');
                const commonParams = `?color=${color}&autoplay=true`;
                let src = "";
                if (data.mediaType === 'movie') {
                    src = `https://player.videasy.net/movie/${data.mediaId}${commonParams}`;
                } else if (data.mediaType === 'tv') {
                    src = `https://player.videasy.net/tv/${data.mediaId}/${data.season || 1}/${data.episode || 1}${commonParams}`;
                }
                setPlayerUrl(src);
            }
        });

        // 3. Listen to Chat
        const chatRef = ref(db, `rooms/${roomId}/chat`);
        const unsubscribeChat = onValue(chatRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const msgs = Object.entries(data).map(([key, val]: any) => ({
                    id: key,
                    ...val
                })).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(msgs);
            }
        });

        // 4. Listen to Users
        const usersRef = ref(db, `rooms/${roomId}/users`);
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if(data) setUsers(Object.values(data));
        });

        // Cleanup
        return () => {
            unsubscribeState();
            unsubscribeChat();
            unsubscribeUsers();
            remove(userRef); // Remove user when leaving component
        };
    }, [roomId, userId, username, accentColor]);

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !roomId) return;

        const chatRef = ref(db, `rooms/${roomId}/chat`);
        push(chatRef, {
            user: username,
            text: newMessage,
            timestamp: Date.now()
        });
        setNewMessage('');
    };

    const copyRoomLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        // Could add toast here
    };

    // --- RENDER ---

    if (!roomId) {
        return (
            <div className="min-h-screen bg-background pt-20 pb-20 px-4 flex flex-col items-center justify-center">
                <Navbar />
                <div className="w-full max-w-md mx-auto bg-surface p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10">
                    <div className="text-center mb-8">
                        <MonitorPlay className="w-12 h-12 md:w-16 md:h-16 mx-auto text-brand-primary mb-4" />
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Watch Party</h1>
                        <p className="text-sm md:text-base text-secondary">Watch movies and shows in sync with friends.</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-primary focus:outline-none transition"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={createRoom}
                                className="flex-1 bg-brand-primary hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-current" /> Create Room
                            </button>
                        </div>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs md:text-sm">OR JOIN</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <form onSubmit={joinRoom} className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="ROOM CODE"
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value)}
                                className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-primary focus:outline-none uppercase text-sm"
                            />
                            <button 
                                type="submit"
                                className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg transition shrink-0"
                            >
                                Join
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-black flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-surface border-b border-white/5 flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-white font-bold text-lg hidden md:block">StreamVault Party</h1>
                        {roomState?.title && (
                            <div className="flex items-center text-xs text-brand-primary">
                                <Tv className="w-3 h-3 mr-1" />
                                <span className="max-w-[150px] truncate">{roomState.title}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center bg-black/50 rounded-full px-4 py-1.5 border border-white/10">
                        <span className="text-gray-400 text-xs mr-2">CODE:</span>
                        <span className="text-white font-mono font-bold tracking-wider select-all">{roomId}</span>
                        <button onClick={copyRoomLink} className="ml-3 text-gray-400 hover:text-white">
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-2 rounded-full transition ${isSidebarOpen ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                    >
                        <MessageCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Player Area */}
                <div className="flex-1 bg-black relative flex items-center justify-center">
                    {roomState ? (
                        <iframe
                            src={playerUrl}
                            className="w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media"
                        />
                    ) : (
                        <div className="text-center p-8">
                            <MonitorPlay className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <h2 className="text-xl text-gray-400 mb-2">Waiting for content...</h2>
                            <p className="text-sm text-gray-600">The host hasn't selected a movie or show yet.</p>
                            <button onClick={() => navigate('/')} className="mt-6 text-brand-primary hover:underline">
                                Browse Content to Add
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className={`${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} absolute md:relative right-0 top-0 bottom-0 w-80 bg-surface border-l border-white/5 transition-transform duration-300 z-10 flex flex-col shadow-2xl`}>
                    
                    {/* Users List */}
                    <div className="p-4 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
                            <Users className="w-3 h-3" /> {users.length} Watching
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                            {users.map((u, i) => (
                                <span key={i} className="px-2 py-1 rounded bg-black/50 border border-white/10 text-xs text-gray-300">
                                    {u}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-600 text-sm mt-10">
                                No messages yet. Say hello!
                            </div>
                        )}
                        {messages.map((msg) => {
                            const isMe = msg.user === username;
                            if (msg.system) {
                                return (
                                    <div key={msg.id} className="text-center text-[10px] text-gray-500 my-2 uppercase tracking-wide">
                                        {msg.text}
                                    </div>
                                );
                            }
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="text-[10px] text-gray-500 mb-1 px-1">{msg.user}</div>
                                    <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${isMe ? 'bg-brand-primary text-white' : 'bg-white/10 text-gray-200'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="p-4 border-t border-white/5 bg-surface">
                        <div className="relative">
                            <input 
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-black/50 border border-white/10 rounded-full pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary"
                            />
                            <button 
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="absolute right-1 top-1 p-1.5 bg-brand-primary rounded-full text-white disabled:opacity-50 hover:bg-red-700 transition"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default WatchParty;