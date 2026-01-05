import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, findTestersNearby, validateVINCheckDigit, isValidVinFormat } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const CAMERA_ICON = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

const TESTER_ICON = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

interface Props {
  onAddToHistory: (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => void;
  onNavigateChat: () => void;
  onShareApp: () => void;
  onNavigateTools: () => void;
}

const VinChecker: React.FC<Props> = ({ onAddToHistory, onNavigateChat, onShareApp, onNavigateTools }) => {
  const [inputVal, setInputVal] = useState('');
  const [searchMode, setSearchMode] = useState<'VIN' | 'OWNER'>('VIN');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('DIAGNOSING...');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<NHTSAVehicle | null>(null);
  
  const [zipCode, setZipCode] = useState('');
  const [showTesterSearch, setShowTesterSearch] = useState(false);
  const [testerResult, setTesterResult] = useState<any>(null);
  const [searchingTesters, setSearchingTesters] = useState(false);

  const [showQuestions, setShowQuestions] = useState(false);
  const [showSuccessReceipt, setShowSuccessReceipt] = useState(false);
  const [answers, setAnswers] = useState({ smoke: false, engine: false, visual: false });

  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
        const val = inputVal.trim().toUpperCase();
        if (searchMode === 'VIN' && isValidVinFormat(val)) {
            setFormatError(null);
            if (!validateVINCheckDigit(val)) {
                setFormatError('VIN Check Digit Failed (Typo likely)');
                setVehicleDetails(null);
                return;
            }
            const data = await decodeVinNHTSA(val);
            if (data && data.valid) setVehicleDetails(data);
        } else if (searchMode === 'VIN' && inputVal.length > 0) {
            setVehicleDetails(null);
            if (inputVal.length < 17) setFormatError('Incomplete VIN (17 chars required)');
            else if (/[IOQ]/.test(val)) setFormatError('VIN cannot contain I, O, or Q');
            else setFormatError('Invalid VIN format');
        } else {
            setFormatError(null);
        }
    }, 600);
    return () => clearTimeout(timer);
  }, [inputVal, searchMode]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatusMessage('ANALYZING...');
    try {
      const result = await extractVinFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setInputVal(result.vin.toUpperCase());
          setSearchMode('VIN');
          trackEvent('vin_scan_success');
      } else {
          alert("Sensor couldn't lock VIN. TIP: Scan the BARCODE on the door jam sticker.");
      }
    } catch (err) {
      alert("AI Processing Link Interrupted.");
    } finally {
      setLoading(false);
      if(cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleTesterSearch = async () => {
      if (zipCode.length < 5) return;
      setSearchingTesters(true);
      try {
          const res = await findTestersNearby(zipCode);
          setTesterResult(res);
      } catch (e) { alert("Map search failed."); } finally { setSearchingTesters(false); }
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    if (!val) return;
    if (searchMode === 'VIN') {
        if (!isValidVinFormat(val)) return alert("Invalid VIN format. 17 chars, no I, O, Q.");
        if (!validateVINCheckDigit(val)) {
            if (!confirm("VIN Check Digit failed. TYPO DETECTED in digit 9. Proceed anyway?")) return;
        }
    }
    onAddToHistory(val, searchMode === 'OWNER' ? 'ENTITY' : 'VIN');
    setShowQuestions(true);
  };

  const finishProtocol = () => {
    if (!answers.smoke || !answers.engine || !answers.visual) return alert("Verify all compliance steps!");
    setShowQuestions(false);
    setShowSuccessReceipt(true);
    trackEvent('compliance_receipt_view');
  };

  if (showQuestions) {
      return (
          <div className="fixed inset-0 z-[300] bg-carb-navy p-6 flex flex-col pt-20">
              <header className="text-center mb-10">
                  <h2 className="text-2xl font-black italic uppercase italic">OVI Verification</h2>
                  <p className="text-[10px] font-black text-carb-accent tracking-[0.4em] uppercase">Compliance Protocol</p>
              </header>
              <div className="flex-1 space-y-4">
                  {[
                      { k: 'smoke', l: 'Smoke Opacity Passed', e: '💨' },
                      { k: 'engine', l: 'ECL Label Present', e: '🏷️' },
                      { k: 'visual', l: 'Visual Inspection OK', e: '🔍' }
                  ].map(q => (
                      <button 
                        key={q.k}
                        onClick={() => setAnswers({...answers, [q.k]: !answers[q.k as keyof typeof answers]})}
                        className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all ${answers[q.k as keyof typeof answers] ? 'bg-green-500 text-black border-green-500' : 'bg-black/40 border-white/20'}`}
                      >
                          <span className={`text-[11px] font-black uppercase italic ${answers[q.k as keyof typeof answers] ? 'text-black' : 'text-white'}`}>{q.e} {q.l}</span>
                          <div className={`w-6 h-6 rounded-full border-2 ${answers[q.k as keyof typeof answers] ? 'bg-black border-black' : 'border-white/40'}`}></div>
                      </button>
                  ))}
              </div>
              <button onClick={finishProtocol} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest mt-8 italic shadow-2xl active-haptic">Confirm Record</button>
              <button onClick={() => setShowQuestions(false)} className="w-full py-4 text-gray-500 text-[10px] font-bold uppercase mt-2">Cancel</button>
          </div>
      );
  }

  if (showSuccessReceipt) {
      return (
          <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl">
              <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden text-carb-navy shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                  <div className="h-32 bg-blue-600 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl shadow-xl">✓</div>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="text-center">
                          <h2 className="text-xl font-black uppercase italic">Protocol Certified</h2>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">OVI Inspection Summary</p>
                      </div>
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                          <div className="flex justify-between text-[10px] font-bold uppercase"><span>VIN</span><span className="font-mono">{inputVal}</span></div>
                          <div className="flex justify-between text-[10px] font-bold uppercase"><span>Status</span><span className="text-green-600">Compliant</span></div>
                          <div className="flex justify-between text-[10px] font-bold uppercase"><span>Date</span><span>{new Date().toLocaleDateString()}</span></div>
                      </div>
                      <button onClick={() => window.print()} className="w-full py-4 bg-carb-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl italic active-haptic">Print PDF</button>
                      <button onClick={() => {setShowSuccessReceipt(false); setInputVal('');}} className="w-full py-4 border-2 border-carb-navy rounded-2xl font-black uppercase text-[10px] tracking-widest italic active-haptic">Dismiss</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <input type="file" ref={cameraInputRef} onChange={handleScan} accept="image/*" capture="environment" className="hidden" />

      {/* 1. MANUAL ENTRY AT THE TOP - HIGHER CONTRAST */}
      <div className="space-y-4">
          <div className="flex justify-center gap-6">
              <button onClick={() => setSearchMode('VIN')} className={`text-[9px] font-black uppercase tracking-widest italic pb-1 border-b-2 transition-all ${searchMode === 'VIN' ? 'border-blue-500 text-white' : 'border-transparent text-gray-600 hover:text-gray-400'}`}>Manual VIN</button>
              <button onClick={() => setSearchMode('OWNER')} className={`text-[9px] font-black uppercase tracking-widest italic pb-1 border-b-2 transition-all ${searchMode === 'OWNER' ? 'border-blue-500 text-white' : 'border-transparent text-gray-600 hover:text-gray-400'}`}>Entity Search</button>
          </div>

          <div className="relative">
              <input 
                value={inputVal}
                onChange={e => setInputVal(e.target.value.toUpperCase())}
                placeholder={searchMode === 'VIN' ? "ENTER 17 CHAR VIN" : "ENTER ENTITY ID"}
                className={`w-full bg-black/40 text-white border-2 rounded-[2rem] py-6 text-center text-xl font-black outline-none transition-all placeholder:text-gray-700 ${formatError ? 'border-red-500' : 'border-white/10 focus:border-blue-500'} shadow-xl`}
              />
              {formatError && <p className="absolute -bottom-5 left-0 right-0 text-center text-[8px] font-black text-red-500 uppercase tracking-widest">{formatError}</p>}
          </div>
          
          <button 
            onClick={checkCompliance} 
            disabled={loading || !inputVal} 
            className="w-full py-5 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-[11px] active-haptic shadow-[0_10px_30px_rgba(37,99,235,0.3)] disabled:opacity-30 italic transition-all hover:bg-blue-500"
          >
            Verify Compliance Protocol
          </button>
      </div>

      {/* 2. DUAL ACTION GRID: SCAN & FIND TESTER */}
      <div className="grid grid-cols-2 gap-4">
          {/* SCAN BUTTON - VIBRANT */}
          <button 
            onClick={() => cameraInputRef.current?.click()}
            disabled={loading}
            className="group relative overflow-hidden bg-white text-carb-navy p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 active-haptic shadow-2xl"
          >
              <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  {CAMERA_ICON}
              </div>
              <div className="text-center">
                  <span className="font-black text-[11px] tracking-widest uppercase italic leading-none">
                      {loading ? '...' : 'Scan VIN'}
                  </span>
                  <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">Barcode Sensor</p>
              </div>
          </button>

          {/* FIND TESTER BUTTON - ACCENT */}
          <button 
            onClick={() => setShowTesterSearch(true)}
            className="group bg-black/40 p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 active-haptic border border-white/20 shadow-xl hover:border-blue-500/50 transition-all"
          >
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  {TESTER_ICON}
              </div>
              <div className="text-center">
                  <span className="font-black text-[11px] tracking-widest uppercase italic text-white leading-none">Find Tester</span>
                  <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest mt-1">Mobile Hub</p>
              </div>
          </button>
      </div>

      {/* 3. RESULTS & EXTRAS */}
      {vehicleDetails && (
          <div className="bg-black/60 p-6 rounded-[2.5rem] border border-blue-500/40 animate-in zoom-in duration-500 shadow-2xl">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest italic">NHTSA Verified</span>
                  <span className="text-[8px] font-black text-gray-500 uppercase">GVWR: {vehicleDetails.gvwr}</span>
              </div>
              <h4 className="text-sm font-black text-white italic uppercase tracking-tight">{vehicleDetails.year} {vehicleDetails.make}</h4>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{vehicleDetails.model} • {vehicleDetails.engineMfr}</p>
          </div>
      )}

      <div className="grid grid-cols-2 gap-4">
          <button onClick={onNavigateChat} className="bg-black/40 p-4 rounded-[2rem] flex items-center gap-3 border border-white/10 active-haptic shadow-lg hover:bg-white/5 transition-colors">
              <span className="text-xl">🤖</span>
              <span className="text-[8px] font-black uppercase tracking-widest italic text-gray-400">Ask AI</span>
          </button>
          <button onClick={onNavigateTools} className="bg-black/40 p-4 rounded-[2rem] flex items-center gap-3 border border-white/10 active-haptic shadow-lg hover:bg-white/5 transition-colors">
              <span className="text-xl">🏗️</span>
              <span className="text-[8px] font-black uppercase tracking-widest italic text-gray-400">Hub</span>
          </button>
      </div>

      {showTesterSearch && (
          <div className="fixed inset-0 z-[400] bg-carb-navy p-8 pt-safe flex flex-col animate-in slide-in-from-right duration-500">
              <button onClick={() => {setShowTesterSearch(false); setTesterResult(null);}} className="text-gray-500 text-[9px] font-black uppercase mb-10 flex items-center gap-2 hover:text-white transition-colors">‹ BACK TO HUB</button>
              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/10 text-center mb-10 shadow-2xl">
                  <h3 className="text-2xl font-black italic uppercase mb-6 text-white tracking-tighter">Dispatch Station</h3>
                  <input 
                    type="tel"
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="ZIP CODE"
                    className="w-full bg-transparent text-7xl font-light text-white outline-none text-center placeholder:text-gray-800"
                    maxLength={5}
                  />
                  <button onClick={handleTesterSearch} disabled={searchingTesters || zipCode.length < 5} className="mt-8 px-10 py-4 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-xl active-haptic">
                      {searchingTesters ? 'PINGING...' : 'Verify Zone'}
                  </button>
              </div>
              {testerResult && (
                  <div className="flex-1 overflow-y-auto space-y-4">
                      {testerResult.locations.map((loc: any, i: number) => (
                          <a key={i} href={loc.uri} target="_blank" className="block p-6 bg-white rounded-3xl border border-gray-100 active-haptic shadow-lg">
                              <p className="text-[11px] font-black uppercase italic text-carb-navy">{loc.title}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Certified Clean Truck Tester</p>
                          </a>
                      ))}
                      <a href="tel:6173596953" className="block w-full py-6 bg-blue-600 text-white text-center rounded-[2rem] font-black uppercase text-xs tracking-widest italic shadow-2xl active-haptic">Contact Regional Hub</a>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default VinChecker;