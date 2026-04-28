import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pickaxe, 
  MessageSquare, 
  Wand2, 
  Globe, 
  Send, 
  User as UserIcon, 
  Bot,
  Settings,
  X,
  ExternalLink,
  ChevronRight,
  Info,
  LogOut,
  Mail,
  Download,
  CheckCircle2,
  AlertTriangle,
  Mic,
  Paperclip,
  Image as ImageIcon,
  StopCircle,
  Play,
  FileUp,
  Github
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { minecraftChat, generateMinecraftContent } from './lib/gemini';
import { 
  auth, 
  signInWithGoogle, 
  signInWithMicrosoft, 
  signInWithGithub,
  logout, 
  syncUserProfile, 
  db,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'chat' | 'generator' | 'hub' | 'account';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('chat');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        await syncUserProfile(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-forge-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-forge-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="font-minecraft text-forge-accent tracking-widest text-sm animate-pulse uppercase">Syncing Forge...</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Forge ချိတ်ဆက်နေသည်...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-forge-bg text-forge-text-primary">
      {/* Sidebar */}
      <aside 
        className={cn(
          "z-20 flex flex-col transition-all duration-300 ease-in-out border-r border-forge-border bg-forge-sidebar",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="py-6 flex items-center justify-center">
          <div className="w-12 h-12 bg-forge-accent rounded-sm flex items-center justify-center shadow-lg border border-white/10">
            <Pickaxe className="text-white" size={28} />
          </div>
        </div>

        <nav className="flex-1 flex flex-col items-center gap-6 mt-8">
          <NavButton 
            active={activeView === 'chat'} 
            onClick={() => setActiveView('chat')}
            icon={<MessageSquare size={24} />}
            label="Companion"
            myanmarLabel="အဖော်"
            isOpen={isSidebarOpen}
          />
          <NavButton 
            active={activeView === 'generator'} 
            onClick={() => setActiveView('generator')}
            icon={<Wand2 size={24} />}
            label="Creator"
            myanmarLabel="ဖန်တီးသူ"
            isOpen={isSidebarOpen}
          />
          <NavButton 
            active={activeView === 'hub'} 
            onClick={() => setActiveView('hub')}
            icon={<Globe size={24} />}
            label="Resources"
            myanmarLabel="အရင်းအမြစ်များ"
            isOpen={isSidebarOpen}
          />
          <NavButton 
            active={activeView === 'account'} 
            onClick={() => setActiveView('account')}
            icon={<UserIcon size={24} />}
            label="Account"
            myanmarLabel="အကောင့်"
            isOpen={isSidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-forge-border flex flex-col items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-forge-input rounded transition-colors text-forge-text-secondary"
          >
            <Settings size={20} />
          </button>
          
          <button 
            onClick={() => logout()}
            className="p-2 hover:bg-red-500/10 rounded transition-colors text-red-500/50 hover:text-red-500"
            title="Logout"
          >
            <LogOut size={20} />
          </button>

          <div className="w-8 h-8 rounded overflow-hidden border border-forge-border shadow-inner bg-forge-input">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#795548] to-[#5D4037]" />
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-forge-border px-8 flex items-center justify-between bg-forge-header text-forge-text-secondary">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight">
              MINER <span className="text-forge-accent">AI</span>
            </h1>
            <span className="px-2 py-0.5 bg-forge-sidebar text-[10px] uppercase tracking-widest text-gray-500 rounded border border-forge-border">v1.4.0-Stable</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-green-500 animate-pulse" : "bg-red-500 animate-bounce"
              )}></div>
              <span className="text-xs text-gray-500">
                {isOnline ? "Link Status: STABLE / ချိတ်ဆက်မှု ကောင်းမွန်သည်" : "Link Status: SEVERED / ချိတ်ဆက်မှု ပြတ်တောက်နေသည်"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 border-l border-forge-border pl-6">
               <span className="text-[10px] text-gray-600 font-mono">LATENCY: {isOnline ? '24ms' : 'OFFLINE'}</span>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeView === 'chat' && <ChatView user={user} key="chat" />}
            {activeView === 'generator' && <GeneratorView user={user} key="gen" />}
            {activeView === 'hub' && <HubView key="hub" />}
            {activeView === 'account' && <AccountView user={user} key="acc" />}
          </AnimatePresence>
        </section>

        <footer className="h-8 bg-forge-sidebar border-t border-forge-border px-6 flex items-center justify-between text-[10px] text-gray-600 font-mono">
          <div className="flex gap-4">
            <span>LATENCY: 24ms</span>
            <span>RAM_USAGE: 412MB</span>
          </div>
          <div className="flex gap-4 uppercase font-bold">
            <span className="text-forge-accent">SYSTEM_READY</span>
            <span>FORGE_CORE_BUILD: 44.1</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function PermissionGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-forge-sidebar border border-forge-accent p-8 max-w-md w-full rounded shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-minecraft text-forge-accent mb-6 flex items-center gap-3">
          <AlertTriangle size={24} /> ACCESS REQUIRED
        </h2>
        <div className="space-y-6 text-sm text-gray-300 leading-relaxed font-sans">
          <div className="space-y-2">
            <p className="font-bold text-white uppercase text-[10px] tracking-widest text-forge-accent">English Guide</p>
            <p>
              To use voice logs, you must grant microphone access. Look for the <span className="text-forge-accent">lock icon 🔒</span> or <span className="text-forge-accent">camera icon 📹</span> in your browser's address bar and set Microphone to <span className="text-green-500 font-bold underline">Allow</span>.
            </p>
          </div>
          <div className="space-y-2 pt-4 border-t border-forge-border">
            <p className="font-bold text-white uppercase text-[10px] tracking-widest text-forge-accent">မြန်မာဘာသာ လမ်းညွှန်</p>
            <p>
              အသံဖြင့် အသုံးပြုနိုင်ရန် မိုက်ခရိုဖုန်းကို ခွင့်ပြုပေးရပါမည်။ Browser ၏ အပေါ်ဘက် (address bar) ရှိ <span className="text-forge-accent text-lg">သော့ခတ်ပုံ 🔒</span> သို့မဟုတ် <span className="text-forge-accent text-lg">ကင်မရာပုံ 📹</span> ကိုနှိပ်ပြီး Microphone ကို <span className="text-green-500 font-bold underline">Allow (ခွင့်ပြုမည်)</span> ကို ရွေးချယ်ပေးပါ။
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="mt-8 w-full bg-forge-accent text-white py-4 font-bold uppercase tracking-[0.2em] text-[10px] hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(58,142,60,0.3)]"
        >
          SYNC_ACKNOWLEDGED / နားလည်ပါပြီ
        </button>
      </motion.div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, myanmarLabel, isOpen }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, myanmarLabel: string, isOpen: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-md transition-all duration-200",
        active 
          ? "bg-[#333] border-l-4 border-forge-accent text-white" 
          : "text-gray-500 hover:bg-[#252525] hover:text-gray-300",
        isOpen && "w-full flex items-center gap-4 px-4 justify-start"
      )}
    >
      <div>{icon}</div>
      {isOpen && (
        <div className="flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold tracking-wide">{label}</span>
          <span className="text-[9px] text-gray-500 font-bold uppercase">{myanmarLabel}</span>
        </div>
      )}
    </button>
  );
}

function ChatView({ user }: { user: FirebaseUser | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history from Firestore on mount
  useEffect(() => {
    if (!user) return;
    
    const loadHistory = async () => {
      try {
        const q = query(
          collection(db, 'chats'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'asc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        const history: ChatMessage[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          history.push({ id: doc.id, role: data.role, text: data.text });
        });

        if (history.length === 0) {
          // Default greeting if no history
          setMessages([{ id: '1', role: 'model', text: "Hello! I've analyzed your current session. You're exploring a new biome. Need some help with crafting recipes or mob behavior patterns?" }]);
        } else {
          setMessages(history);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
        // Fallback to minimal state
        setMessages([{ id: '1', role: 'model', text: "Welcome back! I couldn't load our old logs, but I'm ready for new commands." }]);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        handleSendVoice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setIsRecording(false);
      
      const isPermissionError = err.name === 'NotAllowedError' || err.message?.includes('denied') || err.message?.includes('Permission');
      
      if (isPermissionError) {
        setShowGuide(true);
      }

      let errorMsg = "Microphone access denied.";
      let myanmarMsg = "မိုက်ခရိုဖုန်း အသုံးပြုခွင့် ငြင်းပယ်ခံရသည်။";

      if (isPermissionError) {
        errorMsg = "Microphone permission was denied. Please click the camera/mic icon in your browser address bar to allow access.";
        myanmarMsg = "မိုက်ခရိုဖုန်း အသုံးပြုခွင့်ကို ပိတ်ထားသည်။ Browser settings တွင် ခွင့်ပြုပေးပါ။";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "No microphone found on this device.";
        myanmarMsg = "မိုက်ခရိုဖုန်း ရှာမတွေ့ပါ။";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Microphone is already in use by another application.";
        myanmarMsg = "မိုက်ခရိုဖုန်းကို အခြားနေရာတွင် အသုံးပြုနေသည်။";
      }

      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: `⚠️ **System Error / စနစ် အမှား:**\n\n${errorMsg}\n\n${myanmarMsg}\n\nTo use voice messages, please ensure your microphone is connected and permissions are granted.\n\n[CLICK_HERE_FOR_HELP]` 
      }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveMessage = async (role: 'user' | 'model', text: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'chats'), {
        userId: user.uid,
        role,
        text,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to save message to history:", err);
    }
  };

  const handleSendVoice = async (blob: Blob) => {
    if (!user || isLoading) return;
    setIsLoading(true);
    
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: "🎤 *Sent a voice message*" }]);
    saveMessage('user', "🎤 *Sent a voice message*");

    try {
      const response = await minecraftChat("User sent a voice message. Please acknowledge it and provide a friendly Minecraft tip.", []);
      const botText = response || 'Neural link severed. Attempting reconnect...';
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: botText }]);
      saveMessage('model', botText);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !mediaFile) || isLoading || !user) return;

    const userText = input;
    const hasMedia = !!mediaFile;
    const mediaName = mediaFile?.name;
    const userMsgId = Date.now().toString();
    
    let displayMsg = userText;
    if (hasMedia) {
      displayMsg = `📎 **Attached:** ${mediaName}\n\n${userText}`;
    }

    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: displayMsg }]);
    setInput('');
    setMediaFile(null);
    setIsLoading(true);

    saveMessage('user', displayMsg);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const prompt = hasMedia ? `[User uploaded file: ${mediaName}] ${userText}` : userText;
      const response = await minecraftChat(prompt, history);
      const botText = response || 'Neural link severed. Attempting reconnect...';
      const botMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: botText }]);
      saveMessage('model', botText);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "Connection error. Check your uplink (internet) and try again." }]);
    } finally {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-50 animate-pulse font-mono text-xs text-forge-accent">
        <div className="w-8 h-8 border-2 border-forge-accent border-t-transparent rounded-full animate-spin mb-4" />
        RESTORING NEURAL CHAT LOGS...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex h-full p-6 gap-6 max-w-[1400px] mx-auto w-full"
    >
      {showGuide && <PermissionGuide onClose={() => setShowGuide(false)} />}
      <div className="flex-[1.2] forge-card flex flex-col relative">
        <div className="p-4 border-b border-forge-border flex items-center gap-3 bg-forge-sidebar/50">
          <div className="w-3 h-3 bg-forge-accent"></div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-forge-text-secondary">Companion Chat</h2>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-forge-border scrollbar-track-transparent"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}
            >
              <span className="text-[10px] text-gray-500 uppercase mb-1 tracking-widest px-1">
                {msg.role === 'user' ? 'PLAYER' : 'FORGE_AI'}
              </span>
              <div className={cn(
                "p-3 text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-forge-accent text-white rounded-tl-xl rounded-br-xl rounded-bl-xl shadow-lg border border-white/10" 
                  : "bg-forge-input text-forge-text-primary rounded-tr-xl rounded-br-xl rounded-bl-xl border border-forge-border"
              )}>
                <div className="markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex flex-col gap-1 items-start animate-pulse">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest px-1">FORGE_AI</span>
              <div className="bg-forge-input/50 p-2 border border-dashed border-forge-border text-[10px] uppercase font-bold tracking-tighter">
                Processing Logic...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-black/20 border-t border-forge-border">
          {mediaFile && (
            <div className="mb-2 p-2 bg-forge-input border border-forge-accent/30 rounded flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <Paperclip size={12} className="text-forge-accent" />
                <span className="text-gray-400 uppercase font-mono max-w-[200px] truncate">{mediaFile.name}</span>
              </div>
              <button onClick={() => setMediaFile(null)} className="text-gray-600 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="relative flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2 px-2 border-r border-forge-border">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*,.txt,.json,.md"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-forge-accent transition-colors"
                title="Attach asset"
              >
                <Paperclip size={18} />
              </button>
              <button 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                className={cn(
                  "p-2 transition-colors relative",
                  isRecording ? "text-red-500 animate-pulse" : "text-gray-500 hover:text-forge-accent"
                )}
                title="Hold to record neural log"
              >
                {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
                {isRecording && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1 rounded animate-bounce">REC</span>
                )}
              </button>
            </div>
            
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Listening..." : "Query the forge..."}
              className="flex-1 bg-forge-input border border-forge-border py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-forge-accent transition-all text-forge-text-primary placeholder:text-gray-600"
              disabled={isRecording}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || isRecording}
              className="absolute right-2 px-4 py-1.5 bg-forge-accent text-white text-[10px] font-bold uppercase rounded-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
            >
              SEND
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 hidden lg:flex flex-col gap-6">
        <div className="forge-card p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Task Overview</h3>
            <span className="text-[10px] text-forge-accent font-mono animate-pulse">MONITOR_ACTIVE</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-gray-500">
              <span>Biome Analysis</span>
              <span className="text-white">COMPLETED</span>
            </div>
            <div className="w-full h-1 bg-forge-input rounded-full overflow-hidden">
              <div className="h-full bg-forge-accent w-[85%] shadow-[0_0_8px_rgba(58,142,60,0.5)]"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-gray-500 mt-4">
              <span>Entity Patterns</span>
              <span className="text-forge-accent">CALCULATING...</span>
            </div>
            <div className="w-full h-1 bg-forge-input rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="h-full bg-forge-accent w-[40%] opacity-50"
              ></motion.div>
            </div>
          </div>
        </div>

        <div className="flex-1 forge-card flex flex-col">
          <div className="p-4 border-b border-forge-border bg-forge-header/50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest">System Assets</h3>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-forge-accent"></div>
              <div className="w-2 h-2 bg-forge-border"></div>
              <div className="w-2 h-2 bg-forge-border"></div>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-2 border border-forge-border bg-forge-input/30 flex items-center gap-3 group hover:border-forge-accent transition-colors">
                <div className="w-10 h-10 bg-forge-border rounded-sm flex items-center justify-center text-gray-600 group-hover:text-forge-accent">
                  <Pickaxe size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase">Cached_Asset_0{i}</p>
                  <p className="text-[9px] text-gray-600 uppercase">Memory Index 42-X</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-forge-border text-center">
            <button className="text-[9px] font-bold uppercase tracking-widest text-forge-accent hover:underline">Clear Buffer</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GeneratorView({ user }: { user: FirebaseUser | null }) {
  const [type, setType] = useState<'addon' | 'skin' | 'world' | 'mod'>('addon');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const generatorFileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setSaveStatus('idle');
    try {
      const fullPrompt = referenceFile ? `[Reference File: ${referenceFile.name}] ${prompt}` : prompt;
      const res = await generateMinecraftContent(type, fullPrompt);
      setResult(res || null);
    } catch (err) {
      console.error(err);
      setResult("### Critical Failure\nGeneration cycle interrupted by server timeout.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!result || !user || isSaving) return;
    setIsSaving(true);
    try {
      const creationName = result.split('\n')[0].replace('#', '').trim() || `New ${type}`;
      await addDoc(collection(db, 'creations'), {
        userId: user.uid,
        type,
        name: creationName,
        content: result,
        createdAt: serverTimestamp(),
        isPublic: true
      });
      setSaveStatus('success');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minecraft_${type}_idea.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full p-6 max-w-5xl mx-auto w-full overflow-y-auto"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-6">
          <div className="forge-card flex flex-col">
            <div className="p-4 border-b border-forge-border bg-forge-sidebar/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-forge-text-secondary">Core Parameters / အခြေခံသတ်မှတ်ချက်များ</h2>
              <span className="text-[10px] text-forge-accent font-mono">STEP_01</span>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-3">Model Type Select / အမျိုးအစားရွေးပါ</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['addon', 'skin', 'world', 'mod'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        "forge-btn py-3",
                        type === t && "border-forge-accent text-forge-accent bg-forge-accent/10"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Input Manifest / အချက်အလက်</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Define object properties, biome constraints, or texture requirements... (မြန်မာလိုလည်း ရေးနိုင်သည်)"
                  className="w-full bg-forge-input border border-forge-border p-4 text-sm focus:outline-none focus:border-forge-accent transition-all h-32 text-forge-text-primary placeholder:text-gray-700"
                />
              </div>

              <div className="flex flex-col gap-3">
                <input 
                  type="file" 
                  ref={generatorFileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept="image/*,.json,.txt"
                />
                {!referenceFile ? (
                   <button 
                    onClick={() => generatorFileInputRef.current?.click()}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-forge-accent transition-colors"
                  >
                    <FileUp size={14} /> Attach Reference Asset / ဖိုင်တွဲရန်
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-forge-input border border-forge-accent/20 rounded">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={14} className="text-forge-accent" />
                      <span className="text-[10px] font-mono text-gray-400">{referenceFile.name} (တွဲထားပြီး)</span>
                    </div>
                    <button onClick={() => setReferenceFile(null)} className="text-gray-600 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <button 
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className="forge-btn-primary w-full py-4 text-xs font-bold tracking-[0.2em] flex items-center justify-center gap-3"
                >
                  {isLoading ? "EXECUTING CRAFT_SYNC..." : "INITIALIZE GENERATION / စတင်ထုတ်လုပ်မည်"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col h-full min-h-[400px]">
          <div className="forge-card flex-1 flex flex-col">
            <div className="p-4 border-b border-forge-border bg-forge-sidebar/50 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-forge-text-secondary">Output Preview</h3>
              <div className="flex items-center gap-2">
                {result && (
                  <>
                    <button 
                      onClick={handleDownload}
                      className="p-1.5 hover:bg-forge-input rounded text-gray-500 transition-colors"
                      title="Download as Markdown"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving || saveStatus === 'success'}
                      className={cn(
                        "px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded transition-all flex items-center gap-2",
                        saveStatus === 'success' ? "bg-forge-accent/20 text-forge-accent border border-forge-accent" : "bg-forge-input text-forge-accent border border-forge-accent/30 hover:bg-forge-accent/10"
                      )}
                    >
                      {isSaving ? "SAVING..." : saveStatus === 'success' ? <><CheckCircle2 size={12} /> STORED</> : <><Download size={12} /> ARCHIVE</>}
                    </button>
                  </>
                )}
                <div className="px-2 py-0.5 bg-forge-input text-[9px] text-forge-accent border border-forge-accent rounded-sm">VIRTUALIZED</div>
              </div>
            </div>
            <div className={cn(
              "flex-1 p-6 overflow-y-auto bg-black/10",
              !result && "flex items-center justify-center text-gray-700 font-mono text-xs italic"
            )}>
              {result ? (
                <div className="markdown-body">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-800 flex items-center justify-center rounded">
                    <Pickaxe className="text-gray-800" size={32} />
                  </div>
                  <p>Awaiting Input Parameters...</p>
                </div>
              )}
            </div>
            {result && (
              <div className="p-3 border-t border-forge-border bg-forge-sidebar">
                <button 
                  onClick={handleDownload}
                  className="forge-btn w-full flex items-center justify-center gap-2 text-forge-accent border-forge-accent/30"
                >
                  <ExternalLink size={14} /> EXPORT_TO_MANIFEST
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HubView() {
  const resources = [
    { name: "Official Wiki", desc: "Mechanical Database", url: "https://minecraft.wiki" },
    { name: "Planet Hub", desc: "Asset Repository", url: "https://planetminecraft.com" },
    { name: "Curse Console", desc: "Modular Environment", url: "https://curseforge.com/minecraft" }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex flex-col h-full p-10 max-w-5xl mx-auto w-full overflow-y-auto"
    >
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {resources.map((res) => (
          <a 
            key={res.name}
            href={res.url}
            target="_blank"
            rel="noreferrer"
            className="forge-card p-6 group hover:border-forge-accent transition-all hover:-translate-y-1 block"
          >
            <div className="flex items-center justify-between mb-4">
              <Globe className="text-gray-500 group-hover:text-forge-accent" size={24} />
              <ExternalLink size={14} className="text-gray-700" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-forge-text-primary mb-1">{res.name}</h3>
            <p className="text-[10px] text-gray-600 font-mono italic">{res.desc}</p>
          </a>
        ))}
      </div>

      <div className="forge-card flex-1 flex flex-col">
        <div className="p-4 border-b border-forge-border bg-forge-header/50 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest">Global Terminal Guides / လမ်းညွှန်ချက်များ</h3>
          <span className="text-[10px] text-gray-600 font-mono italic">3 ACTIVE PATCHES</span>
        </div>
        <div className="flex-1 p-0 flex divide-x divide-forge-border overflow-hidden">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {['Redstone Logic', 'Speedrun Optimization', 'Architectural Theory'].map((guide, idx) => (
              <div key={guide} className="group cursor-pointer">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-[10px] font-mono text-forge-accent">0{idx + 1}</span>
                  <h4 className="text-sm font-bold uppercase tracking-wide group-hover:text-forge-accent transition-colors">{guide}</h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed pl-8">Analyzing complex systems within the voxel environment to optimize throughput and structural integrity.</p>
                <div className="pl-8 mt-2 flex items-center gap-2">
                  <div className="h-[1px] flex-1 bg-forge-border"></div>
                  <span className="text-[9px] font-bold text-gray-600 uppercase">Read_More</span>
                  <ChevronRight size={10} className="text-gray-600" />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:flex w-72 bg-forge-sidebar/30 p-6 flex-col justify-between italic text-gray-600 text-xs leading-relaxed">
            <div>
              <Info size={20} className="mb-4 text-forge-accent" />
              <p>"The forge serves as your gateway to the blocky void. Use the Companion to decode history and the Creator to build the future."</p>
            </div>
            <div className="p-4 border border-forge-border bg-forge-bg text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-2">Network Status</span>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-3 bg-forge-accent"></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LoginView() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'microsoft' | 'github') => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (provider === 'google') await signInWithGoogle();
      else if (provider === 'microsoft') await signInWithMicrosoft();
      else await signInWithGithub();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked! Please allow popups for this site. / Popup ကို ပိတ်ထားသည်။ ခွင့်ပြုပေးပါ။");
      } else if (err.code === 'auth/cancelled-by-user') {
        setError("Login cancelled. / အကောင့်ဝင်ခြင်းကို ဖျက်သိမ်းလိုက်သည်။");
      } else {
        setError("Connection failed. Please try again. / ချိတ်ဆက်မှု မအောင်မြင်ပါ။ ပြန်ကြိုးစားကြည့်ပါ။");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-forge-bg flex items-center justify-center p-4">
      <div className="forge-card w-full max-w-md p-8 flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-forge-accent rounded-sm flex items-center justify-center shadow-lg border border-white/10">
          <Pickaxe className="text-white" size={48} />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-minecraft tracking-tight">MINER <span className="text-forge-accent">AI</span></h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Connect to Minecraft AI Forge</p>
          <p className="text-[10px] text-forge-accent/70 font-bold uppercase tracking-widest">မြန်မာဘာသာဖြင့် အသုံးပြုနိုင်သည်</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-xs font-medium text-center"
          >
            <AlertTriangle className="inline-block mr-2" size={14} />
            {error}
          </motion.div>
        )}

        <div className="w-full space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase text-center mb-4 leading-relaxed">
              Sign in with your social account to start creating.<br/>
              အကောင့်ဖွင့်ရန် အောက်ပါ ခလုတ်များကို နှိပ်ပါ။
            </p>
            <button 
              onClick={() => handleSocialLogin('google')}
              disabled={isSubmitting}
              className="forge-btn w-full flex items-center justify-between px-6 py-4 hover:border-forge-accent text-sm group transition-all"
            >
              <div className="flex items-center gap-4">
                <Globe size={20} className="text-blue-500" />
                <div className="text-left">
                  <div className="font-bold text-white leading-none">Google Account</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mt-1">Google ဖြင့် အကောင့်ဝင်မည်</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-700 group-hover:text-forge-accent" />
            </button>
            
            <button 
              onClick={() => handleSocialLogin('microsoft')}
              disabled={isSubmitting}
              className="forge-btn w-full flex items-center justify-between px-6 py-4 hover:border-forge-accent text-sm group transition-all"
            >
              <div className="flex items-center gap-4">
                <Pickaxe size={20} className="text-orange-500" />
                <div className="text-left">
                  <div className="font-bold text-white leading-none">Microsoft Account</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mt-1">Microsoft ဖြင့် အကောင့်ဝင်မည်</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-700 group-hover:text-forge-accent" />
            </button>

            <button 
              onClick={() => handleSocialLogin('github')}
              disabled={isSubmitting}
              className="forge-btn w-full flex items-center justify-between px-6 py-4 hover:border-forge-accent text-sm group transition-all"
            >
              <div className="flex items-center gap-4">
                <Github size={20} className="text-white" />
                <div className="text-left">
                  <div className="font-bold text-white leading-none">GitHub Account</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mt-1">GitHub ဖြင့် အကောင့်ဝင်မည်</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-700 group-hover:text-forge-accent" />
            </button>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-forge-border opacity-30" />
            <span className="text-[10px] text-gray-700 font-bold uppercase">System Info</span>
            <div className="h-[1px] flex-1 bg-forge-border opacity-30" />
          </div>

          <div className="p-4 bg-forge-sidebar/30 border border-forge-border rounded space-y-3">
             <div className="flex items-start gap-3">
                <Info size={16} className="text-forge-accent mt-0.5 shrink-0" />
                <div className="text-[11px] leading-relaxed text-gray-400">
                  <span className="text-white font-bold">Account Opening:</span> Login with Google, Microsoft, or GitHub. No complex forms required.
                  <br/><br/>
                  <span className="text-forge-accent font-bold italic">PRO TIP:</span> If login fails inside the GitHub or Vercel app browser, please open this link in a standard browser like <span className="text-white">Chrome</span> or <span className="text-white">Safari</span>.
                </div>
             </div>
             <div className="flex items-start gap-3 border-t border-forge-border pt-3">
                <div className="text-[11px] leading-relaxed text-gray-400">
                  <span className="text-white font-bold">အကောင့်ဖွင့်နည်း:</span> Google, Microsoft (သို့မဟုတ်) GitHub အကောင့်တစ်ခုခုဖြင့် တိုက်ရိုက်ဝင်နိုင်ပါသည်။
                  <br/><br/>
                  <span className="text-forge-accent font-bold italic">အကြံပြုချက်:</span> အကယ်၍ GitHub (သို့မဟုတ်) Vercel app browser များအတွင်း အကောင့်ဝင်မရပါက Chrome သို့မဟုတ် Safari browser တွင် ဖွင့်၍ အသုံးပြုပါ။
                </div>
             </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-700 font-mono text-center max-w-[280px]">
          By connecting your neural link, you agree to the Automated Asset Generation Protocols.
        </p>
      </div>
    </div>
  );
}

function SystemMonitor() {
  const [micStatus, setMicStatus] = useState<PermissionState | 'unknown'>('unknown');
  
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then(status => {
        setMicStatus(status.state);
        status.onchange = () => setMicStatus(status.state);
      }).catch(() => setMicStatus('unknown'));
    }
  }, []);

  return (
    <section className="forge-card p-6 bg-forge-sidebar/20 border-forge-border">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-forge-text-secondary mb-4 flex items-center gap-2">
        <Bot size={14} /> System Diagnostics / စနစ်စစ်ဆေးချက်
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-forge-input border border-forge-border rounded flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Microphone / မိုက်</span>
           <span className={cn(
             "text-[9px] font-mono font-bold px-2 py-0.5 rounded",
             micStatus === 'granted' ? "bg-green-500/20 text-green-500" : 
             micStatus === 'denied' ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"
           )}>
             {micStatus.toUpperCase()}
           </span>
        </div>
        <div className="p-3 bg-forge-input border border-forge-border rounded flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Offline Manifest</span>
           <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-500">
             ENABLED
           </span>
        </div>
      </div>
      {micStatus === 'denied' && (
        <p className="mt-3 text-[10px] text-orange-500 italic leading-relaxed">
          ⚠️ Mic access is blocked. Click the lock icon in your browser address bar to reset permissions.<br/>
          မိုက်ခရိုဖုန်းကို ပိတ်ထားသည်။ Browser ၏ Address bar ရှိ သော့ပုံကိုနှိပ်၍ ခွင့်ပြုချက် ပြန်ပေးပါ။
        </p>
      )}
    </section>
  );
}

function AccountView({ user }: { user: FirebaseUser | null }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) setProfile(uDoc.data());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const clearChatLogs = async () => {
    if (!user || clearing) return;
    if (!confirm("Are you sure you want to delete all chat history? This cannot be undone.")) return;
    
    setClearing(true);
    try {
      const q = query(collection(db, 'chats'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach(d => batch.delete(d.ref));
      await batch.commit();
      alert("Neural chat logs purged successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to purge logs.");
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <div className="p-10 text-center opacity-50 animate-pulse font-mono text-xs text-forge-accent">Accessing Profile Data... / ကိုယ်ရေးအချက်အလက်များကို ရယူနေသည်...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto p-10 w-full overflow-y-auto"
    >
      <div className="forge-card p-10 flex flex-col md:flex-row gap-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded bg-forge-input border-2 border-forge-accent p-1 shadow-2xl overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-forge-border flex items-center justify-center">
                <UserIcon size={48} className="text-forge-accent" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-forge-accent font-mono border border-forge-accent px-2 py-0.5 rounded tracking-tighter">UUID: {user?.uid.slice(0, 12)}...</span>
        </div>

        <div className="flex-1 space-y-8">
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-forge-text-secondary mb-4 flex items-center gap-2">
              <UserIcon size={14} /> Profile Credentials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 uppercase">Display Name</label>
                <div className="bg-forge-input border border-forge-border p-3 text-sm font-semibold text-forge-text-primary">{user?.displayName || 'Anonymous Crafter'}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 uppercase">Primary Email</label>
                <div className="bg-forge-input border border-forge-border p-3 text-sm font-semibold text-forge-text-primary">{user?.email}</div>
              </div>
            </div>
          </section>

          <SystemMonitor />

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-forge-text-secondary mb-4 flex items-center gap-2">
              <Settings size={14} /> System Protocols
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-forge-input/50 border border-forge-border rounded group hover:border-forge-accent transition-colors">
                <div>
                  <p className="text-xs font-bold uppercase group-hover:text-forge-accent transition-colors">Neural Feedback (Notifications)</p>
                  <p className="text-[10px] text-gray-600">Receive alerts when generation cycles complete.</p>
                </div>
                <div className="w-12 h-6 bg-forge-accent rounded-full p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-forge-input/50 border border-forge-border rounded group hover:border-forge-accent transition-colors">
                <div>
                  <p className="text-xs font-bold uppercase group-hover:text-forge-accent transition-colors">Private Manifest (Incognito)</p>
                  <p className="text-[10px] text-gray-600">Hide your creations from the community resource hub.</p>
                </div>
                <div className="w-12 h-6 bg-forge-border rounded-full p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-gray-400 rounded-full" />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-6 border-t border-forge-border">
            <button onClick={clearChatLogs} className="forge-btn text-orange-500 border-orange-500/30 hover:bg-orange-500/10">Purge Logs / မှတ်တမ်းဖျက်ရန်</button>
            <button onClick={() => logout()} className="forge-btn text-red-500 border-red-500/30 hover:bg-red-500/10">Terminate Session / ထွက်ရန်</button>
            <button className="forge-btn-primary px-8">Update Profiles</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
