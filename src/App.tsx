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
  Paperclip,
  Image as ImageIcon,
  Play,
  FileUp,
  Github,
  History,
  Key
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { minecraftChat, generateMinecraftContent, generateMinecraftSkinImage } from './lib/gemini';
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
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'chat' | 'generator' | 'hub' | 'account' | 'history';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('chat');
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>(localStorage.getItem('gemini_custom_key') || '');
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

  // Allow unauthenticated users to use the app in guest mode
  const isGuest = !user;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-forge-bg text-forge-text-primary">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:relative z-50 h-full flex flex-col transition-all duration-300 ease-in-out border-r border-forge-border bg-forge-sidebar",
          isSidebarOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        <div className="py-6 flex items-center justify-center relative">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-forge-accent rounded-sm flex items-center justify-center shadow-lg border border-white/10">
            <Pickaxe className="text-white" size={window.innerWidth < 1024 ? 20 : 28} />
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="absolute right-4 top-1/2 -translate-y-1/2 lg:hidden text-gray-500"
          >
            <X size={20} />
          </button>
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
            active={activeView === 'history'} 
            onClick={() => setActiveView('history')}
            icon={<History size={24} />}
            label="History"
            myanmarLabel="မှတ်တမ်း"
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
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-forge-input rounded transition-colors text-forge-text-secondary"
            title="Settings / သတ်မှတ်ချက်များ"
          >
            <Settings size={20} />
          </button>
          
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-forge-input rounded transition-colors text-forge-text-secondary"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <ChevronRight size={16} className={cn("transition-transform", isSidebarOpen && "rotate-180")} />
          </button>
          
          {!isGuest ? (
            <button 
              onClick={() => logout()}
              className="p-2 hover:bg-red-500/10 rounded transition-colors text-red-500/50 hover:text-red-500"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button 
              onClick={() => setActiveView('account')}
              className="p-2 hover:bg-forge-accent/10 rounded transition-colors text-forge-accent/50 hover:text-forge-accent"
              title="Login"
            >
              <UserIcon size={20} />
            </button>
          )}

          <div className={cn(
            "w-8 h-8 rounded overflow-hidden border border-forge-border shadow-inner",
            isGuest ? "bg-forge-sidebar border-gray-700" : "bg-forge-input"
          )}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className={cn(
                "w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-600",
                isGuest ? "bg-gray-800" : "bg-gradient-to-br from-[#795548] to-[#5D4037]"
              )}>
                {isGuest ? '?' : ''}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-forge-border px-4 lg:px-8 flex items-center justify-between bg-forge-header text-forge-text-secondary">
          <div className="flex items-center gap-3 lg:gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 lg:hidden hover:bg-forge-input rounded transition-colors"
            >
              <div className="w-5 h-0.5 bg-forge-accent mb-1"></div>
              <div className="w-3 h-0.5 bg-forge-accent mb-1"></div>
              <div className="w-5 h-0.5 bg-forge-accent"></div>
            </button>
            <h1 className="text-base lg:text-lg font-bold tracking-tight truncate max-w-[120px] sm:max-w-none">
              MINER <span className="text-forge-accent">AI</span>
            </h1>
            <span className="hidden xs:block px-2 py-0.5 bg-forge-sidebar text-[10px] uppercase tracking-widest text-gray-500 rounded border border-forge-border">v1.4</span>
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 animate-bounce shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              )}></div>
              <span className="text-[10px] sm:text-xs text-gray-500">
                {isOnline ? (
                  <span className="hidden xs:inline">STATUS: <span className="text-green-500/80 font-black tracking-tighter">STABLE</span></span>
                ) : (
                  <span className="text-red-500/80 font-black">LOCAL_MEMORY_ONLY</span>
                )}
              </span>
            </div>
            {/* PWA / Offline AI Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-forge-accent/5 border border-forge-accent/20 rounded-full">
               <div className="w-1 h-1 bg-forge-accent rounded-full animate-ping"></div>
               <span className="text-[9px] text-forge-accent font-black uppercase tracking-widest">Offline_Sync_Ready</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 border-l border-forge-border pl-6">
               <span className="text-[10px] text-gray-600 font-mono">LATENCY: {isOnline ? '24ms' : 'OFFLINE'}</span>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeView === 'chat' && <ChatView user={user} setActiveView={setActiveView} customApiKey={customApiKey} key="chat" />}
            {activeView === 'generator' && <GeneratorView user={user} setActiveView={setActiveView} customApiKey={customApiKey} key="gen" />}
            {activeView === 'history' && <HistoryView user={user} setActiveView={setActiveView} key="history" />}
            {activeView === 'hub' && <HubView key="hub" />}
            {activeView === 'account' && <AccountView user={user} customApiKey={customApiKey} setCustomApiKey={setCustomApiKey} key="acc" />}
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {isSettingsOpen && (
            <SettingsModal 
              onClose={() => setIsSettingsOpen(false)} 
              apiKey={customApiKey} 
              onSave={(newKey) => {
                setCustomApiKey(newKey);
                localStorage.setItem('gemini_custom_key', newKey);
                // Also update firebase if user is logged in
                if (user) {
                  setDoc(doc(db, 'users', user.uid), { customApiKey: newKey }, { merge: true });
                }
              }} 
            />
          )}
        </AnimatePresence>

        <footer className="h-10 lg:h-8 bg-forge-sidebar border-t border-forge-border px-4 lg:px-6 flex items-center justify-between text-[9px] lg:text-[10px] text-gray-600 font-mono">
          <div className="flex gap-3 lg:gap-4 truncate">
            <span>PING: {isOnline ? '24ms' : 'N/A'}</span>
            <span className="hidden sm:inline text-forge-accent">ESTABLISHED</span>
          </div>
          <div className="flex gap-3 lg:gap-4 uppercase font-bold text-right">
            <span className="hidden sm:inline">BUILD: 44.1</span>
            <span className="text-gray-700">© 2026 FORGE</span>
          </div>
        </footer>
      </main>
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

function ChatView({ user, setActiveView, customApiKey }: { user: FirebaseUser | null, setActiveView: (view: View) => void, customApiKey?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history from Firestore with real-time sync
  useEffect(() => {
    if (!user) {
      setIsInitialLoading(false);
      setMessages([{ id: '1', role: 'model', text: "Hello! I've analyzed your current session. You're exploring in Guest Mode. Need some help with crafting recipes or mob behavior patterns? (မြန်မာလိုလည်း ပြောနိုင်သည်)" }]);
      return;
    }
    
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        history.push({ id: doc.id, role: data.role, text: data.text });
      });

      if (history.length === 0) {
        setMessages([{ id: '1', role: 'model', text: "Hello! I've analyzed your current session. You're exploring a new biome. Need some help with crafting recipes or mob behavior patterns?" }]);
      } else {
        setMessages(history);
      }
      setIsInitialLoading(false);
    }, (err) => {
      console.error("Chat history sync error:", err);
      setIsInitialLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleClearHistory = async () => {
    if (!user || !window.confirm("Clear all neural chat logs? / မှတ်တမ်းအားလုံးကို ဖြတ်ထုတ်မည်လား?")) return;
    
    try {
      const q = query(collection(db, 'chats'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !mediaFile) || isLoading) return;

    const userText = input;
    const hasMedia = !!mediaFile;
    const mediaName = mediaFile?.name;
    
    let displayMsg = userText;
    if (hasMedia) {
      displayMsg = `📎 **Attached:** ${mediaName}\n\n${userText}`;
    }

    setInput('');
    setMediaFile(null);
    setIsLoading(true);

    // Only save to Firestore if user is present
    if (user) {
      await saveMessage('user', displayMsg);
    } else {
      // Local state fallback for guests
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: displayMsg }]);
    }

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const prompt = hasMedia ? `[User uploaded file: ${mediaName}] ${userText}` : userText;
      const response = await minecraftChat(prompt, history, customApiKey);
      const botText = response || 'Neural link severed. Attempting reconnect...';
      
      if (user) {
        await saveMessage('model', botText);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: botText }]);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = "Connection error. Check your uplink (internet) and try again.";
      if (user) {
        // Optional: don't save errors to long-term history?
      }
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: errorMsg }]);
    } finally {
      setIsLoading(false);
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
      className="flex h-full p-4 lg:p-6 gap-6 max-w-[1400px] mx-auto w-full overflow-hidden"
    >
      <div className="flex-1 lg:flex-[1.2] forge-card flex flex-col relative overflow-hidden">
        <div className="p-4 border-b border-forge-border flex items-center justify-between bg-forge-sidebar/50">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-forge-accent"></div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-forge-text-secondary">Companion Chat</h2>
          </div>
          {user && (
            <button 
              onClick={handleClearHistory}
              className="text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2"
              title="Clear Memory"
            >
              <AlertTriangle size={12} />
              <span className="hidden sm:inline">Purge Memory / ဖြတ်ထုတ်ရန်</span>
            </button>
          )}
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-forge-border scrollbar-track-transparent"
        >
          {!user && (
            <div className="p-3 bg-forge-accent/5 border border-dashed border-forge-accent/30 rounded flex items-center justify-between mb-4">
              <span className="text-[10px] text-forge-accent uppercase font-bold tracking-tighter">Guest Session Active / ဧည့်သည်အဖြစ်သုံးနေသည်</span>
              <span className="text-[9px] text-gray-600 italic">No persistence</span>
            </div>
          )}
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

        <div className="p-3 lg:p-4 bg-black/20 border-t border-forge-border">
          {mediaFile && (
            <div className="mb-2 p-2 bg-forge-input border border-forge-accent/30 rounded flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <Paperclip size={12} className="text-forge-accent" />
                <span className="text-gray-400 uppercase font-mono max-w-[120px] sm:max-w-[200px] truncate">{mediaFile.name}</span>
              </div>
              <button onClick={() => setMediaFile(null)} className="text-gray-600 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="relative flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 mr-2 px-2 border-r border-forge-border">
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
            </div>
            
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Query the forge..."
              className="flex-1 bg-forge-input border border-forge-border py-2.5 lg:py-3 pl-3 lg:pl-4 pr-10 lg:pr-12 text-sm focus:outline-none focus:border-forge-accent transition-all text-forge-text-primary placeholder:text-gray-600 rounded-sm"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="absolute right-1.5 lg:right-2 px-3 lg:px-4 py-1.5 bg-forge-accent text-white text-[9px] lg:text-[10px] font-bold uppercase rounded-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
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

function GeneratorView({ user, setActiveView, customApiKey }: { user: FirebaseUser | null, setActiveView: (view: View) => void, customApiKey?: string }) {
  const [type, setType] = useState<'addon' | 'skin' | 'world' | 'mod'>('addon');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [skinImage, setSkinImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [creations, setCreations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const generatorFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'creations'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCreations(history);
    }, (err) => {
      console.error("Creations snapshot error:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const saveCreation = async (creationType: string, content: string, nameOverride?: string) => {
    if (!user) return;
    try {
      const creationName = nameOverride || content.split('\n')[0].replace('#', '').trim() || `New ${creationType}`;
      await addDoc(collection(db, 'creations'), {
        userId: user.uid,
        type: creationType,
        name: creationName,
        content: content,
        createdAt: serverTimestamp(),
        isPublic: true
      });
      setSaveStatus('success');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setSaveStatus('idle');
    setSkinImage(null);
    try {
      const fullPrompt = referenceFile ? `[Reference File: ${referenceFile.name}] ${prompt}` : prompt;
      const res = await generateMinecraftContent(type, fullPrompt, customApiKey);
      if (res) {
        setResult(res);
        await saveCreation(type, res);
      }
    } catch (err) {
      console.error(err);
      setResult("### Critical Failure\nGeneration cycle interrupted by server timeout.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (item: any) => {
    setResult(item.content);
    setType(item.type);
    setSkinImage(null); // Clear skin image when loading old one for now to avoid confusion
    setSaveStatus('success');
  };

  const handleGenerateSkinImage = async () => {
    if (!result || type !== 'skin' || isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const img = await generateMinecraftSkinImage(prompt, customApiKey);
      setSkinImage(img);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
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
    
    let extension = '.md';
    if (type === 'addon' || type === 'mod') extension = '.mcpack';
    if (type === 'world') extension = '.mcworld';
    if (type === 'skin') extension = '.txt';

    a.download = `miner_forge_${type}_${Date.now()}${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col lg:flex-row h-full max-w-[1600px] mx-auto w-full overflow-hidden"
    >
      {/* History Sidebar */}
      <aside className={cn(
        "bg-forge-sidebar/30 border-r border-forge-border transition-all duration-300 flex flex-col",
        showHistory ? "w-72" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-forge-border flex justify-between items-center bg-black/20">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-forge-accent">Creation_Log / မှတ်တမ်း</h3>
          <button onClick={() => setShowHistory(false)}><X size={14} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {!user ? (
            <div className="flex flex-col items-center gap-4 text-center mt-10">
              <History size={32} className="text-gray-800" />
              <p className="text-[10px] text-gray-600 font-bold uppercase leading-relaxed px-4">
                Login Required for History Persistence.<br/>
                မှတ်တမ်းများသိမ်းဆည်းရန် အကောင့်ဝင်ပါ။
              </p>
              <button 
                onClick={() => setActiveView('account')}
                className="forge-btn text-[9px] px-4 py-2 border-forge-accent/30 text-forge-accent"
              >
                Sign In
              </button>
            </div>
          ) : creations.length === 0 ? (
            <div className="text-[10px] text-gray-700 font-mono italic text-center mt-10">NO ENTRIES FOUND</div>
          ) : (
            creations.map((item) => (
              <button 
                key={item.id}
                onClick={() => loadFromHistory(item)}
                className="w-full text-left p-3 border border-forge-border bg-forge-input/20 hover:border-forge-accent group transition-all rounded-sm"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] font-bold text-forge-accent uppercase tracking-tighter">{item.type}</span>
                  <span className="text-[8px] text-gray-600 font-mono">
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Pending'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 truncate group-hover:text-white transition-colors">{item.name}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-y-auto relative">
        {!showHistory && (
          <button 
            onClick={() => setShowHistory(true)}
            className="absolute left-4 top-4 lg:left-6 lg:top-6 z-10 p-2 bg-forge-sidebar border border-forge-border rounded-full text-forge-accent hover:scale-110 transition-all shadow-xl"
            title="Show History"
          >
            <History size={18} />
          </button>
        )}

        {!user && (
          <div className="mb-4 p-3 bg-forge-accent/5 border border-forge-accent/20 rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-forge-accent/10 flex items-center justify-center">
                <Info size={16} className="text-forge-accent" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-white uppercase tracking-widest">Guest Mode Active</p>
                <p className="text-[9px] text-gray-500">Creations will not be stored in neural history. / ဖန်တီးမှုများမှတ်တမ်းတင်မည်မဟုတ်ပါ။</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveView('account')}
              className="text-[9px] font-bold text-forge-accent uppercase hover:underline"
            >
              Sign In to Store Data
            </button>
          </div>
        )}

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
                <div className="flex flex-col gap-6">
                  {type === 'skin' && (
                    <div className="flex flex-col items-center gap-4 p-4 bg-forge-sidebar/30 border border-forge-border rounded">
                      {skinImage ? (
                        <div className="relative group">
                          <img 
                            src={skinImage} 
                            alt="Minecraft Skin Preview" 
                            className="w-full max-w-[300px] h-auto rounded border-2 border-forge-accent/20 shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Rendered by Gemini 2.0</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-[300px] aspect-square bg-forge-input border border-dashed border-forge-border rounded flex flex-col items-center justify-center gap-3 text-gray-600">
                          <ImageIcon size={32} />
                          <button 
                            onClick={handleGenerateSkinImage}
                            disabled={isGeneratingImage}
                            className="px-4 py-2 bg-forge-accent/10 border border-forge-accent/30 text-forge-accent text-[10px] font-bold uppercase hover:bg-forge-accent/20 transition-all disabled:opacity-30"
                          >
                            {isGeneratingImage ? "SYNTHESIZING..." : "Generate 3D Visual / ပုံထုတ်မည်"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="markdown-body">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
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
      className="flex flex-col h-full p-4 sm:p-10 max-w-5xl mx-auto w-full overflow-y-auto"
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

function LoginView({ inline = false }: { inline?: boolean }) {
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
        setError(`Connection failed [${err.code || 'unknown'}]. Please try again. / ချိတ်ဆက်မှု မအောင်မြင်ပါ။ ပြန်ကြိုးစားကြည့်ပါ။`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className={cn("forge-card w-full p-6 md:p-8 flex flex-col items-center gap-6", !inline && "max-w-md shadow-2xl")}>
      <div className="w-16 h-16 md:w-20 md:h-20 bg-forge-accent rounded-sm flex items-center justify-center shadow-lg border border-white/10">
        <Pickaxe className="text-white" size={window.innerWidth < 768 ? 32 : 48} />
      </div>
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-minecraft tracking-tight">MINER <span className="text-forge-accent">AI</span></h1>
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
              </div>
           </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-700 font-mono text-center max-w-[280px]">
        By connecting your neural link, you agree to the Automated Asset Generation Protocols.
      </p>
    </div>
  );

  if (inline) return content;

  return (
    <div className="h-screen w-full bg-forge-bg flex items-center justify-center p-4">
      {content}
    </div>
  );
}

function SystemMonitor() {
  return (
    <section className="forge-card p-6 bg-forge-sidebar/20 border-forge-border">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-forge-text-secondary mb-4 flex items-center gap-2">
        <Bot size={14} /> System Diagnostics / စနစ်စစ်ဆေးချက်
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-forge-input border border-forge-border rounded flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Offline Manifest</span>
           <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-500">
             ENABLED
           </span>
        </div>
        <div className="p-3 bg-forge-input border border-forge-border rounded flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Real-time Stream</span>
           <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-500">
             ACTIVE
           </span>
        </div>
      </div>
    </section>
  );
}

function SettingsModal({ onClose, apiKey, onSave }: { onClose: () => void, apiKey: string, onSave: (key: string) => void }) {
  const [input, setInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(input);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="forge-card max-w-md w-full p-6 lg:p-8 space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 bg-forge-accent/20 rounded flex items-center justify-center text-forge-accent">
            <Key size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Forge Settings / စနစ်သတ်မှတ်ချက်များ</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">External Neuro-Link Config</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Gemini API Key</label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[9px] text-forge-accent hover:underline uppercase font-bold flex items-center gap-1"
              >
                Get Key <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input 
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="w-full bg-forge-input border border-forge-border p-3 text-xs text-white focus:border-forge-accent outline-none transition-all pr-10 rounded-sm"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700">
                <Key size={14} />
              </div>
            </div>
            <p className="text-[9px] text-gray-500 leading-relaxed italic">
              Your key is only stored in this browser's local cache. It is used to overcome rate limits when generating assets.
            </p>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleSave}
              className={cn(
                "w-full py-4 text-[10px] font-black tracking-[0.2em] uppercase transition-all rounded-sm border",
                saved 
                  ? "bg-green-500/20 border-green-500 text-green-500" 
                  : "bg-forge-accent/10 border-forge-accent/40 text-forge-accent hover:bg-forge-accent hover:text-white"
              )}
            >
              {saved ? "DATA_COMMITTED ✓" : "SAVE_CONFIG / သိမ်းဆည်းမည်"}
            </button>
          </div>
        </div>

        <div className="p-4 bg-forge-sidebar/30 border border-forge-border rounded-sm">
           <div className="flex items-start gap-3">
              <Info size={14} className="text-forge-accent mt-0.5" />
              <p className="text-[9px] text-gray-500 leading-relaxed">
                If the forge becomes unresponsive or reports "Quota Exceeded," providing your own key will restore functionality immediately.
              </p>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HistoryView({ user, setActiveView }: { user: FirebaseUser | null, setActiveView: (view: View) => void }) {
  const [activeTab, setActiveTab] = useState<'chats' | 'creations'>('chats');
  const [chats, setChats] = useState<any[]>([]);
  const [creations, setCreations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Chats
        const chatQuery = query(
          collection(db, 'chats'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const chatSnap = await getDocs(chatQuery);
        setChats(chatSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Creations
        const creationQuery = query(
          collection(db, 'creations'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const creationSnap = await getDocs(creationQuery);
        setCreations(creationSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-forge-input border border-forge-border rounded-full flex items-center justify-center mb-6">
          <History size={40} className="text-gray-700" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Neural History Locked / မှတ်တမ်းကိုပိတ်ထားသည်</h2>
        <p className="text-xs text-gray-500 max-w-sm mb-6 uppercase font-bold tracking-tighter">Please synchronize your identity to access past cognitive logs and forged assets.</p>
        <button 
          onClick={() => setActiveView('account')}
          className="forge-btn text-forge-accent border-forge-accent/20 px-8 py-3 hover:bg-forge-accent hover:text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto w-full h-full flex flex-col p-4 sm:p-6 lg:p-10"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white">Neural History</h1>
          <p className="text-[10px] text-forge-accent font-bold uppercase tracking-widest">Accessing Archived Memory Banks / ယခင်မှတ်တမ်းများ</p>
        </div>
        <div className="flex bg-forge-input p-1 rounded-sm border border-forge-border">
          <button 
            onClick={() => setActiveTab('chats')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
              activeTab === 'chats' ? "bg-forge-accent text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Chat Logs
          </button>
          <button 
            onClick={() => setActiveTab('creations')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
              activeTab === 'creations' ? "bg-forge-accent text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Forge Output
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono text-[10px] text-forge-accent animate-pulse">
            DECRYPTING_ARCHIVES...
          </div>
        ) : activeTab === 'chats' ? (
          chats.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 font-mono italic text-xs">
              NO NEURAL ECHOES DETECTED
            </div>
          ) : (
            chats.map(msg => (
              <div key={msg.id} className="forge-card p-4 border-l-2 border-l-forge-accent/40 hover:border-l-forge-accent transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                    msg.role === 'user' ? "bg-blue-500/10 text-blue-400" : "bg-forge-accent/10 text-forge-accent"
                  )}>
                    {msg.role === 'user' ? 'Internal Prompt' : 'Neural Response'}
                  </span>
                  <span className="text-[9px] text-gray-600 font-mono">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed max-h-20 overflow-hidden line-clamp-3">{msg.text}</p>
              </div>
            ))
          )
        ) : (
          creations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 font-mono italic text-xs">
              VOID_MANIFEST: NO ASSETS RECORDED
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
              {creations.map(item => (
                <div key={item.id} className="forge-card p-5 group hover:border-forge-accent transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 bg-forge-input border border-forge-border rounded flex items-center justify-center text-forge-accent group-hover:scale-110 transition-transform">
                      {item.type === 'skin' ? <UserIcon size={20} /> : <Wand2 size={20} />}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-forge-accent uppercase block">{item.type}</span>
                      <span className="text-[8px] text-gray-600 font-mono">ID: {item.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 group-hover:text-forge-accent transition-colors">{item.name}</h3>
                  <div className="flex justify-between items-center pt-3 border-t border-forge-border mt-auto">
                    <span className="text-[9px] text-gray-600">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Syncing'}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle re-download or view logic
                      }}
                      className="text-[9px] font-bold text-white hover:text-forge-accent"
                    >
                      OPEN_MANIFEST
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}

function AccountView({ user, customApiKey, setCustomApiKey }: { user: FirebaseUser | null, customApiKey: string, setCustomApiKey: (key: string) => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(customApiKey);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchProfile = async () => {
      try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
          const data = uDoc.data();
          setProfile(data);
          if (data.customApiKey && !localStorage.getItem('gemini_custom_key')) {
            setCustomApiKey(data.customApiKey);
            setApiKeyInput(data.customApiKey);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      localStorage.setItem('gemini_custom_key', apiKeyInput);
      setCustomApiKey(apiKeyInput);
      
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          customApiKey: apiKeyInput,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      alert("Settings updated successfully. / စနစ်သတ်မှတ်ချက်များ ပြုပြင်ပြီးပါပြီ။");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const clearCreationLogs = async () => {
    if (!user || clearing) return;
    if (!confirm("Are you sure you want to delete all generated creations history? This cannot be undone.")) return;
    
    setClearing(true);
    try {
      const q = query(collection(db, 'creations'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach(d => batch.delete(d.ref));
      await batch.commit();
      alert("Creation logs purged successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to purge creations history.");
    } finally {
      setClearing(false);
    }
  };

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

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
           <div className="w-20 h-20 bg-gray-800 rounded-full mx-auto flex items-center justify-center border border-forge-border">
              <UserIcon size={40} className="text-gray-600" />
           </div>
           <div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-forge-text-primary mb-2">Guest Access / ဧည့်သည်အဖြစ်ဝင်ရောက်ထားသည်</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Connect your account to save your creations, access your history, and join the community hub.
                <br/>
                သင့်ဖန်တီးမှုများကို သိမ်းဆည်းရန်နှင့် မှတ်တမ်းများကြည့်ရန် အကောင့်ဝင်ပါ။
              </p>
           </div>
           <LoginView inline />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto p-4 sm:p-10 w-full overflow-y-auto"
    >
      <div className="forge-card p-4 sm:p-10 flex flex-col md:flex-row gap-8 lg:gap-10">
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

          <section className="p-4 bg-forge-accent/5 border border-forge-accent/20 rounded-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-forge-accent mb-4 flex items-center gap-2">
              <Key size={14} /> External API Configuration / API သတ်မှတ်ချက်
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Gemini API Key (Optional)</label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[9px] text-forge-accent hover:underline uppercase font-bold">Get Key</a>
                </div>
                <div className="relative">
                  <input 
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter Custom API Key..."
                    className="w-full bg-forge-input border border-forge-border p-3 text-xs text-white focus:border-forge-accent outline-none transition-all pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                    <Key size={14} />
                  </div>
                </div>
                <p className="text-[9px] text-gray-600 leading-relaxed mt-2">
                  Providing your own API key allows for higher rate limits and specialized model access. 
                  Your key is stored locally and securely in your neural profile.
                </p>
              </div>
              <button 
                onClick={saveSettings}
                disabled={isSavingSettings}
                className="w-full py-3 bg-forge-accent/10 border border-forge-accent/40 text-forge-accent text-[10px] font-bold uppercase hover:bg-forge-accent transition-all hover:text-white"
              >
                {isSavingSettings ? 'Synchronizing...' : 'Commit Settings / ပြောင်းလဲမှုများကိုသိမ်းဆည်းမည်'}
              </button>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-forge-border">
            <button onClick={clearCreationLogs} className="forge-btn text-forge-accent border-forge-accent/30 hover:bg-forge-accent/10 whitespace-nowrap">Purge Creations / ဖန်တီးမှုများဖျက်ရန်</button>
            <button onClick={clearChatLogs} className="forge-btn text-orange-500 border-orange-500/30 hover:bg-orange-500/10 whitespace-nowrap">Purge Chat Logs / မှတ်တမ်းဖျက်ရန်</button>
            <button onClick={() => logout()} className="forge-btn text-red-500 border-red-500/30 hover:bg-red-500/10 whitespace-nowrap">Terminate Session / ထွက်ရန်</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
