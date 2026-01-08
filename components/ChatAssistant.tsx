
import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, speakText } from '../services/geminiService';
import { Message } from '../types';
import { trackEvent } from '../services/analytics';

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: 'Hello! I am VIN DIESEL AI. Ask me anything about CARB CTC regulations. I can help you find nearby testing stations or explain the law.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | undefined>(undefined);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location access denied for maps grounding.")
      );
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: input, 
        timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await sendMessage(input, history, location);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls
      }]);

      if (voiceEnabled && response.text) {
        speakText(response.text);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Connection error. CARB site offline?", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-200px)] animate-in fade-in duration-500">
      <div className="bg-blue-600 p-6 rounded-t-[3rem] flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                  <h2 className="text-sm font-black text-white italic uppercase tracking-widest">VIN DIESEL AI</h2>
                  <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em]">
                    {location ? '📍 Location Grounding Active' : 'ONLY CTC RELATED ANSWERS'}
                  </p>
              </div>
          </div>
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${voiceEnabled ? 'bg-white text-blue-600' : 'bg-blue-700 text-blue-300'}`}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/20 backdrop-blur-3xl border-x border-white/5">
          {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-3xl text-xs font-medium leading-relaxed shadow-xl ${
                      msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white/5 text-gray-300 border border-white/5 rounded-tl-none'
                  }`}>
                      {msg.text}
                      {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                              <p className="text-[8px] font-black uppercase text-gray-500">SOURCES & LOCATIONS:</p>
                              {msg.groundingUrls.map((url, i) => (
                                  <a key={i} href={url.uri} target="_blank" className="flex items-center gap-2 text-blue-400 hover:underline truncate italic">
                                      <span>🔗</span>
                                      <span className="truncate">{url.title}</span>
                                  </a>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          ))}
          {loading && <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Syncing with Google Cloud...</div>}
          <div ref={scrollRef} />
      </div>

      <div className="p-6 bg-black/40 rounded-b-[3rem] border-x border-b border-white/5 shadow-2xl">
          <div className="flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Find local testers or ask regulations..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-black text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
              />
              <button onClick={handleSend} className="bg-blue-600 text-white px-6 rounded-2xl active-haptic">➔</button>
          </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
