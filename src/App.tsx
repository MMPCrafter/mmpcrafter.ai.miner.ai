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
  Download,
  AlertTriangle,
  History,
  Key,
  CloudLightning,
  Menu,
  Paperclip,
  FileUp,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { minecraftChat, generateMinecraftContent, generateMinecraftSkinImage } from './lib/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'chat' | 'generator' | 'hub' | 'history';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('chat');
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(localStorage.getItem('gemini_custom_key') || '');
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
            label="Knowledge Hub"
            myanmarLabel="ပညာပေးဗဟို"
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
            {activeView === 'chat' && (
              <ChatView 
                setActiveView={setActiveView} 
                customApiKey={customApiKey} 
                targetMessageId={targetMessageId}
                onMessageFocused={() => setTargetMessageId(null)}
                key="chat" 
              />
            )}
            {activeView === 'generator' && <GeneratorView setActiveView={setActiveView} customApiKey={customApiKey} key="gen" />}
            {activeView === 'history' && (
              <HistoryView 
                setActiveView={setActiveView} 
                setTargetMessageId={setTargetMessageId} 
                key="history" 
              />
            )}
            {activeView === 'hub' && <HubView key="hub" />}
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

function ChatView({ setActiveView, customApiKey, targetMessageId, onMessageFocused }: { 
  setActiveView: (view: View) => void, 
  customApiKey?: string,
  targetMessageId?: string | null,
  onMessageFocused?: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load local chat history
  useEffect(() => {
    const localHistory = JSON.parse(localStorage.getItem('miner_ai_local_chats') || '[]');
    if (localHistory.length === 0) {
      setMessages([{ id: '1', role: 'model', text: "Hello! I'm your Minecraft AI Companion. Need some help with crafting recipes or mob behavior patterns? (မြန်မာလိုလည်း ပြောနိုင်သည်)" }]);
    } else {
      setMessages(localHistory);
    }
    setIsInitialLoading(false);
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm("Clear all neural chat logs? / မှတ်တမ်းအားလုံးကို ဖြတ်ထုတ်မည်လား?")) return;
    localStorage.removeItem('miner_ai_local_chats');
    setMessages([{ id: '1', role: 'model', text: "Local memory purged. System reset complete." }]);
  };

  useEffect(() => {
    if (scrollRef.current && !targetMessageId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, targetMessageId]);

  useEffect(() => {
    if (targetMessageId && messages.length > 0) {
      // Small timeout to ensure DOM is ready after potential re-render
      const timer = setTimeout(() => {
        const el = document.getElementById(`msg-${targetMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-forge-accent/50', 'ring-offset-2', 'ring-offset-forge-bg', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-forge-accent/50', 'ring-offset-2', 'ring-offset-forge-bg');
            onMessageFocused?.();
          }, 3000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetMessageId, messages, onMessageFocused]);

  const saveMessage = async (role: 'user' | 'model', text: string) => {
    const localHistory = JSON.parse(localStorage.getItem('miner_ai_local_chats') || '[]');
    const newMsg = { id: Date.now().toString(), role, text, createdAt: new Date().toISOString() };
    localHistory.push(newMsg);
    localStorage.setItem('miner_ai_local_chats', JSON.stringify(localHistory.slice(-100)));
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

    // Save to persistence
    await saveMessage('user', displayMsg);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: displayMsg }]);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const prompt = hasMedia ? `[User uploaded file: ${mediaName}] ${userText}` : userText;
      const response = await minecraftChat(prompt, history, customApiKey);
      const botText = response || 'Neural link severed. Attempting reconnect...';
      
      await saveMessage('model', botText);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: botText }]);
    } catch (err) {
      console.error(err);
      const errorMsg = "Connection error. Check your uplink (internet) and try again.";
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
          <button 
            onClick={handleClearHistory}
            className="text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2"
            title="Clear Memory"
          >
            <AlertTriangle size={12} />
            <span className="hidden sm:inline">Purge Memory / ဖြတ်ထုတ်ရန်</span>
          </button>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-forge-border scrollbar-track-transparent"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
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

function GeneratorView({ setActiveView, customApiKey }: { setActiveView: (view: View) => void, customApiKey?: string }) {
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
    const localCreations = JSON.parse(localStorage.getItem('miner_ai_local_creations') || '[]');
    setCreations(localCreations.reverse());
  }, []);

  const saveCreation = async (creationType: string, content: string, nameOverride?: string) => {
    const creationName = nameOverride || content.split('\n')[0].replace('#', '').trim() || `New ${creationType}`;
    
    const localCreations = JSON.parse(localStorage.getItem('miner_ai_local_creations') || '[]');
    const newItem = { 
      id: Date.now().toString(), 
      type: creationType, 
      name: creationName, 
      content, 
      createdAt: new Date().toISOString() 
    };
    localCreations.push(newItem);
    localStorage.setItem('miner_ai_local_creations', JSON.stringify(localCreations.slice(-20)));
    setCreations(prev => [newItem, ...prev].slice(0, 20));
    setSaveStatus('success');
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
    if (!result || isSaving) return;
    setIsSaving(true);
    try {
      const creationName = result.split('\n')[0].replace('#', '').trim() || `New ${type}`;
      await saveCreation(type, result, creationName);
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
          {creations.length === 0 ? (
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
                    {new Date(item.createdAt).toLocaleDateString()}
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
    { name: "Official Wiki", desc: "Mechanical Database", url: "https://minecraft.wiki", category: "Core" },
    { name: "Planet Hub", desc: "Asset Repository", url: "https://planetminecraft.com", category: "Community" },
    { name: "Education Edition", desc: "Classroom Learning", url: "https://education.minecraft.net", category: "Education" },
    { name: "Server Connection", desc: "Multiplayer Guide", url: "https://help.minecraft.net/hc/en-us/articles/4410316619533-Minecraft-Multiplayer-Connection-Issues-FAQ", category: "Guides" }
  ];

  const educationModules = [
    { 
      title: "Redstone Fundamentals", 
      desc: "Learn logic gates, clock circuits, and automation components. The electricity of Minecraft.",
      level: "Intermediate",
      tags: ["Logic", "Engineering"]
    },
    { 
      title: "Command Block Mastery", 
      desc: "Use syntax to manipulate the game world, create custom events, and scripted sequences.",
      level: "Advanced",
      tags: ["Coding", "Automation"]
    },
    { 
      title: "Ecology & Biomes", 
      desc: "Understand entity spawning, climate mechanics, and resource distribution across dimensions.",
      level: "Beginner",
      tags: ["Biology", "Geology"]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex flex-col h-full p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar"
    >
      <header className="mb-10">
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
          Knowledge Base
          <span className="text-[10px] bg-forge-accent/20 text-forge-accent px-2 py-0.5 rounded border border-forge-accent/30">Educational Protocol</span>
        </h2>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Expanding your blocky intellect / ဗဟုသုတများ တိုးပွားစေရန်</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {resources.map((res) => (
          <a 
            key={res.name}
            href={res.url}
            target="_blank"
            rel="noreferrer"
            className="forge-card p-5 group hover:border-forge-accent transition-all hover:-translate-y-1 block relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-forge-bg border border-forge-border rounded text-gray-400 group-hover:text-forge-accent transition-colors">{res.category}</span>
              <ExternalLink size={12} className="text-gray-700" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-forge-text-primary mb-1 relative z-10">{res.name}</h3>
            <p className="text-[10px] text-gray-600 font-mono italic relative z-10">{res.desc}</p>
            <div className="absolute bottom-0 right-0 p-2 opacity-5">
              <Globe size={40} className="text-white" />
            </div>
          </a>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="forge-card flex flex-col">
            <div className="p-4 border-b border-forge-border bg-forge-header/50 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-forge-text-secondary">Educational Modules / သင်ခန်းစာများ</h3>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-forge-accent/40"></div>)}
              </div>
            </div>
            <div className="p-0 divide-y divide-forge-border">
              {educationModules.map((module, idx) => (
                <div key={module.title} className="p-6 hover:bg-forge-input/30 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-forge-accent bg-forge-accent/10 px-2 py-0.5 rounded border border-forge-accent/20">MODULE_0{idx + 1}</span>
                      <h4 className="text-sm font-bold uppercase tracking-tight group-hover:text-forge-accent transition-colors">{module.title}</h4>
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 uppercase border border-forge-border px-2 py-0.5 rounded">{module.level}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-2xl mb-4">{module.desc}</p>
                  <div className="flex items-center gap-3">
                    {module.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-mono text-gray-700 bg-forge-bg px-2 py-0.5 rounded">#{tag}</span>
                    ))}
                    <div className="flex-1"></div>
                    <button className="flex items-center gap-2 text-[10px] font-black text-forge-accent group-hover:translate-x-1 transition-transform">
                      ACCESS_NODE <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="forge-card p-6 bg-forge-accent/5 border-forge-accent/20 relative overflow-hidden">
            <CloudLightning className="absolute -top-4 -right-4 text-forge-accent opacity-10" size={100} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-forge-accent mb-4">Did You Know? / သိကောင်းစရာ</h3>
            <div className="space-y-4 relative z-10">
              <p className="text-xs text-gray-400 leading-relaxed italic">
                "Minecraft was originally called 'Cave Game' and was created in just six days."
              </p>
              <div className="h-[1px] bg-forge-accent/20 w-12"></div>
              <p className="text-xs text-gray-400 leading-relaxed italic">
                "Endermen speak English in reverse and at a much lower, distorted frequency."
              </p>
              <div className="h-[1px] bg-forge-accent/20 w-12"></div>
              <p className="text-xs text-gray-400 leading-relaxed italic">
                "Redstone can be used to build working computers, including basic CPUs and storage."
              </p>
            </div>
          </div>

          <div className="forge-card p-6 bg-forge-sidebar/50">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-4">Connection Protocol</h3>
            <div className="space-y-3">
              <div className="p-3 bg-forge-bg border border-forge-border rounded text-[10px] group hover:border-forge-accent transition-colors">
                <p className="text-gray-500 font-bold uppercase mb-1">Local Network</p>
                <p className="text-white font-mono">192.168.1.XX:25565</p>
              </div>
              <div className="p-3 bg-forge-bg border border-forge-border rounded text-[10px] group hover:border-forge-accent transition-colors">
                <p className="text-gray-500 font-bold uppercase mb-1">Global Uplink</p>
                <p className="text-white font-mono truncate">connect.miner-ai-forge.net</p>
              </div>
              <button className="w-full py-2 bg-forge-accent/10 border border-forge-accent/40 text-forge-accent text-[9px] font-black uppercase tracking-widest hover:bg-forge-accent hover:text-white transition-all">
                Test Signal Stability
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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

function HistoryView({ setActiveView, setTargetMessageId }: { setActiveView: (view: View) => void, setTargetMessageId: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'chats' | 'creations'>('chats');
  const [chats, setChats] = useState<any[]>([]);
  const [creations, setCreations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch from Local Storage
      const localChats = JSON.parse(localStorage.getItem('miner_ai_local_chats') || '[]');
      setChats([...localChats].reverse());
      
      const localCreations = JSON.parse(localStorage.getItem('miner_ai_local_creations') || '[]');
      setCreations([...localCreations].reverse());
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto w-full h-full flex flex-col p-4 sm:p-6 lg:p-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
            Neural History 
            <span className="text-[8px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">Local Memory</span>
          </h1>
          <p className="text-[10px] text-forge-accent font-bold uppercase tracking-widest">
            Browsing Temporary Ghost Logs / ယာယီမှတ်တမ်း
          </p>
        </div>
        <div className="flex bg-forge-input p-1 rounded-sm border border-forge-border self-start sm:self-center">
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
        {chats.length > 0 && activeTab === 'chats' && (
          <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-sm flex items-center justify-between shadow-inner">
            <span className="text-[9px] text-orange-400 font-bold uppercase">Note: These logs are stored in your browser only. / ဤမှတ်တမ်းများသည် သင့်လှည့်လည်ကိရိယာတွင်သာ ရှိသည်။</span>
            <button 
              onClick={() => {
                if(window.confirm("Purge local chat cache? / ယာယီမှတ်တမ်းများကို ဖျက်မည်လား?")) {
                  localStorage.removeItem('miner_ai_local_chats');
                  setChats([]);
                }
              }}
              className="text-[9px] font-black text-orange-400 hover:text-orange-300 uppercase border-b border-orange-400/30"
            >
              PURGE_LOCAL
            </button>
          </div>
        )}

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
              <div 
                key={msg.id} 
                onClick={() => {
                  setTargetMessageId(msg.id);
                  setActiveView('chat');
                }}
                className="forge-card p-4 border-l-2 border-l-forge-accent/40 hover:border-l-forge-accent transition-all cursor-pointer hover:bg-forge-input/50 group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                    msg.role === 'user' ? "bg-blue-500/10 text-blue-400" : "bg-forge-accent/10 text-forge-accent"
                  )}>
                    {msg.role === 'user' ? 'Internal Prompt' : 'Neural Response'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-600 font-mono">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                    <ChevronRight size={12} className="text-gray-700 group-hover:text-forge-accent transition-colors" />
                  </div>
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
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle re-download or view logic
                      }}
                      className="text-[9px] font-black text-white hover:text-forge-accent"
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


