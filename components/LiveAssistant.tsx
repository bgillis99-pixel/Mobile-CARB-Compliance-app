
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { triggerHaptic } from '../services/haptics';

const LiveAssistant: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    initLiveSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const initLiveSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const binary = '';
              const bytes = new Uint8Array(int16.buffer);
              let b64 = '';
              for (let i = 0; i < bytes.byteLength; i++) b64 += String.fromCharCode(bytes[i]);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: { data: btoa(b64), mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const b64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (b64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(b64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => setError("Connection Lost"),
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a real-time CARB compliance voice assistant. Speak naturally and help the user with Clean Truck Check regulations.'
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      setError("Microphone access or key error.");
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
       <div className="absolute top-8 right-8">
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white text-xl">✕</button>
       </div>

       <div className="space-y-12">
          <div className="relative">
             <div className={`w-48 h-48 rounded-full border-4 border-carb-accent/20 flex items-center justify-center transition-all ${isActive ? 'scale-110 shadow-[0_0_80px_rgba(59,130,246,0.3)]' : 'opacity-40'}`}>
                <div className={`w-32 h-32 rounded-full bg-carb-accent flex items-center justify-center text-5xl animate-pulse ${!isActive ? 'grayscale' : ''}`}>🎙️</div>
             </div>
             {isActive && (
               <div className="absolute inset-0 border-4 border-carb-accent rounded-full animate-ping opacity-20"></div>
             )}
          </div>

          <div className="space-y-4">
             <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">
                {isConnecting ? 'Initializing Link...' : isActive ? 'Live Conversation' : 'Session Ended'}
             </h2>
             <p className="text-[10px] font-black text-carb-accent uppercase tracking-[0.5em] italic">
                {error ? error : isConnecting ? 'Authenticating with Gemini...' : 'Real-Time Voice Support Active'}
             </p>
          </div>

          {isActive && (
            <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-3xl">
               <p className="text-xs text-slate-400 italic">"How do I register my fleet in TRUCRS?"</p>
            </div>
          )}
       </div>
       
       <button onClick={onClose} className="mt-20 text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Terminate Protocol</button>
    </div>
  );
};

export default LiveAssistant;
