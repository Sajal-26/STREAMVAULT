import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import Peer, { DataConnection } from 'peerjs';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, PartyState } from '../types';
import ChatInterface from '../components/ChatInterface';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';

type PartyRole = 'host' | 'guest';

interface InitData {
  type: 'INIT';
  media: {
    type: 'movie' | 'tv';
    id: string;
    season?: string;
    episode?: string;
  };
  startTime: number;
}

interface ChatPayload {
  type: 'CHAT';
  message: ChatMessage;
}

interface SyncPayload {
  type: 'SYNC';
  time: number;
}

type Payload = InitData | ChatPayload | SyncPayload;

const WatchParty: React.FC = () => {
  // Routes: 
  // Host: /watch-party/start/:type/:id/:season?/:episode?
  // Guest: /watch-party/join/:roomId
  const { action, type, id, season, episode, roomId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { accentColor } = useAuth();
  
  const [role, setRole] = useState<PartyRole>('guest');
  const [peerId, setPeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'initializing' | 'connected' | 'disconnected' | 'error'>('initializing');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [viewerCount, setViewerCount] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);

  // Media State for Guest
  const [mediaInfo, setMediaInfo] = useState<{ type: 'movie' | 'tv'; id: string; season?: string; episode?: string } | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const usernameRef = useRef<string>(`User-${Math.floor(Math.random() * 1000)}`);
  
  // Initialize Role
  useEffect(() => {
    if (action === 'start') {
        setRole('host');
        if (type && id) setMediaInfo({ type: type as 'movie' | 'tv', id, season, episode });
        setShowShareModal(true);
    } else {
        setRole('guest');
    }
  }, [action, type, id, season, episode]);

  // Initialize PeerJS
  useEffect(() => {
    // Dynamically import PeerJS to avoid SSR/Build issues if any
    import('peerjs').then(({ default: Peer }) => {
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            setPeerId(id);
            if (role === 'host') {
                setConnectionStatus('connected');
                // Host is ready
            } else if (roomId) {
                // Guest connects to Host
                connectToHost(peer, roomId);
            }
        });

        peer.on('connection', (conn) => {
            handleConnection(conn);
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            setConnectionStatus('error');
            showToast('Connection error occurred.', 'error');
        });
    });

    return () => {
        peerRef.current?.destroy();
    };
  }, [role, roomId]);

  const connectToHost = (peer: Peer, hostId: string) => {
      const conn = peer.connect(hostId);
      handleConnection(conn);
  };

  const handleConnection = (conn: DataConnection) => {
      conn.on('open', () => {
          setConnections(prev => [...prev, conn]);
          setConnectionStatus('connected');
          setViewerCount(prev => prev + 1);

          // If I am Host, send INIT data to the new Guest
          if (role === 'host' && mediaInfo) {
              const initData: InitData = {
                  type: 'INIT',
                  media: mediaInfo,
                  startTime: 0 // In a real scenario, we'd grab current time
              };
              conn.send(initData);
              
              // System Message
              const sysMsg: ChatMessage = {
                  id: Date.now().toString(),
                  text: 'A new user joined the party!',
                  sender: 'System',
                  timestamp: Date.now(),
                  isSystem: true
              };
              addMessage(sysMsg);
              broadcast(conn, { type: 'CHAT', message: sysMsg });
          }
      });

      conn.on('data', (data: unknown) => {
          const payload = data as Payload;
          
          if (payload.type === 'INIT') {
              setMediaInfo(payload.media);
              showToast('Joined Watch Party!', 'success');
          }
          
          if (payload.type === 'CHAT') {
              addMessage(payload.message);
              // If Host, relay to others (simple star topology)
              if (role === 'host') {
                  broadcast(conn, payload);
              }
          }
      });

      conn.on('close', () => {
          setConnections(prev => prev.filter(c => c !== conn));
          setViewerCount(prev => Math.max(1, prev - 1));
          
           const sysMsg: ChatMessage = {
              id: Date.now().toString(),
              text: 'A user left the party.',
              sender: 'System',
              timestamp: Date.now(),
              isSystem: true
          };
          addMessage(sysMsg);
      });
  };

  const broadcast = (sender: DataConnection | null, payload: Payload) => {
      connections.forEach(conn => {
          if (conn !== sender) {
              conn.send(payload);
          }
      });
  };

  const addMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
  };

  const handleSendMessage = (text: string) => {
      const msg: ChatMessage = {
          id: Date.now().toString(),
          text,
          sender: usernameRef.current,
          timestamp: Date.now()
      };
      addMessage(msg);
      
      const payload: ChatPayload = { type: 'CHAT', message: msg };
      
      if (role === 'host') {
          broadcast(null, payload);
      } else {
          // Send to host, host will relay
          connections[0]?.send(payload);
      }
  };

  const copyLink = async () => {
      const origin = window.location.origin + window.location.pathname;
      const baseUrl = origin.endsWith('/') ? origin : origin + '/';
      const link = `${baseUrl}#/watch-party/join/${peerId}`;
      await navigator.clipboard.writeText(link);
      showToast('Party link copied to clipboard!', 'success');
      setShowShareModal(false);
  };

  // Video Player URL Construction
  const getPlayerUrl = () => {
      if (!mediaInfo) return '';
      const baseUrl = "https://player.videasy.net";
      const color = accentColor.replace('#', '');
      const commonParams = `?color=${color}&autoplayNextEpisode=true&autoplay=true`;
      
      if (mediaInfo.type === 'movie') {
          return `${baseUrl}/movie/${mediaInfo.id}${commonParams}`;
      } else {
          const s = mediaInfo.season || 1;
          const e = mediaInfo.episode || 1;
          return `${baseUrl}/tv/${mediaInfo.id}/${s}/${e}${commonParams}&nextEpisode=true`;
      }
  };

  if (connectionStatus === 'initializing' && role === 'guest') {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
              <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Connecting to Watch Party...</p>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden group">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 w-full p-4 z-50 flex justify-between items-start pointer-events-none">
        <button
          onClick={() => navigate('/')}
          className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md transition-colors border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {role === 'host' && (
            <button
                onClick={() => setShowShareModal(true)}
                className="pointer-events-auto flex items-center px-4 py-2 bg-brand-primary text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
            >
                <Share2 className="w-4 h-4 mr-2" /> Invite
            </button>
        )}
      </div>

      {/* Video Player */}
      {mediaInfo ? (
          <iframe
            src={getPlayerUrl()}
            className="w-full h-full border-0 bg-black"
            allowFullScreen
            allow="encrypted-media; autoplay; picture-in-picture"
            title="StreamVault Player"
          />
      ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
               <AlertCircle className="w-12 h-12 mb-4" />
               <p>Waiting for host to select media...</p>
          </div>
      )}

      {/* Chat Interface */}
      <ChatInterface 
          messages={messages} 
          onSendMessage={handleSendMessage}
          viewerCount={viewerCount}
          username={usernameRef.current}
      />

      {/* Share Modal */}
      {showShareModal && (
          <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
              <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-white mb-2">Invite Friends</h3>
                  <p className="text-gray-400 text-sm mb-6">Share this link with your friends to watch together in real-time!</p>
                  
                  <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/5 mb-6">
                      <LinkIcon className="w-4 h-4 text-gray-500 ml-2" />
                      <input 
                        readOnly 
                        value={`${window.location.origin}${window.location.pathname}#/watch-party/join/${peerId}`} 
                        className="bg-transparent text-sm text-white flex-1 focus:outline-none px-2"
                      />
                      <button 
                        onClick={copyLink}
                        className="p-2 bg-brand-primary text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                          <Copy className="w-4 h-4" />
                      </button>
                  </div>

                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="w-full py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
                  >
                      Start Watching
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default WatchParty;