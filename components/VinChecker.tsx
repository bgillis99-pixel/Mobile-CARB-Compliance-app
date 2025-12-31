import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, findTestersNearby, validateVINCheckDigit, isValidVinFormat } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const APPLE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const ANDROID_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 576 512" fill="currentColor">
    <path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm378.7-151.1l33.8-58.5a11 11 0 0 0-3.9-15.1 11.2 11.2 0 0 0-15.2 4L515 139.75c-50.7-42.3-116.3-65.6-187-65.6s-136.3 23.3-187 65.6l-33.8-58.5a11.2 11.2 0 0 0-15.2-4 11 11 0 0 0-3.9 15.1l33.8 58.5C51.5 197.6 0 285.5 0 384h576c0-98.5-51.5-186.4-121.85-233.17z" />
  </svg>
);

interface Props {
  onAddToHistory: (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => void;
  onNavigateChat: () => void;
  onShareApp: () => void;
  onNavigateTools: () => void;
}

const getCountyFromZip = (zip: string): string => {
  const z = parseInt(zip);
  if (z >= 90001 && z <= 90899) return "Los Angeles";
  if (z >= 94101 && z <= 94188) return "San Francisco";
  if (z >= 95811 && z <= 95899) return "Sacramento";
  if (z >= 92101 && z <= 92199) return "San Diego";
  if (z >= 95101 && z <= 95199) return "Santa Clara";
  if (z >= 93701 && z <= 93799) return "Fresno";
  if (z >= 92601 && z <= 92899) return "Orange";
  if (z >= 94501 && z <= 94899) return "Contra Costa / Alameda";
  if (z >= 95601 && z <= 95799) return "Placer / El Dorado";
  return "California Service Region";
};

const VinChecker: React.FC<Props> = ({ onAddToHistory, onNavigateChat, onShareApp, onNavigateTools }) => {
  const [inputVal, setInputVal] = useState('');
  const [searchMode, setSearchMode] = useState<'VIN' | 'OWNER'>('VIN');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('DIAGNOSING...');
  const [showTesterSearch, setShowTesterSearch] = useState(false);
  const [testerResult, setTesterResult] = useState<{ county: string, text?: string, locations?: any[] } | null>(null);
  const [searchingTesters, setSearchingTesters] = useState(false);
  
  const [scanResult, setScanResult] = useState<{vin: string, details: string} | null>(null);
  const [editedVin, setEditedVin] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState<NHTSAVehicle | null>(null); 
  const [formatError, setFormatError] = useState<string | null>(null);
  
  const [showQuestions, setShowQuestions] = useState(false);
  const [showSuccessReceipt, setShowSuccessReceipt] = useState(false);
  const [answers, setAnswers] = useState({ smoke: false, engine: false, visual: false });

  const [zipCode, setZipCode] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkNHTSA = async () => {
        if (searchMode === 'VIN' && isValidVinFormat(inputVal)) {
            setFormatError(null);
            const data = await decodeVinNHTSA(inputVal);
            if (data && data.valid) {
                setVehicleDetails(data);
                trackEvent('nhtsa_lookup_success', { make: data.make, year: data.year });
            }
        } else if (searchMode === 'VIN' && inputVal.length > 0) {
            setVehicleDetails(null);
            if (inputVal.length < 17) {
                setFormatError('VIN must be 17 characters');
            } else if (/[IOQ]/.test(inputVal)) {
                setFormatError('VIN cannot contain I, O, or Q');
            } else {
                setFormatError('Invalid VIN pattern');
            }
        } else {
            setVehicleDetails(null);
            setFormatError(null);
        }
    };
    const timer = setTimeout(checkNHTSA, 800);
    return () => clearTimeout(timer);
  }, [inputVal, searchMode]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatusMessage('ANALYZING OPTICS...');
    try {
      const result = await extractVinFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setInputVal(result.vin);
          setScanResult({ vin: result.vin, details: result.description });
          setEditedVin(result.vin);
          setSearchMode('VIN'); 
          trackEvent('vin_scan_success', { confidence: result.confidence });
      } else {
          alert("Optical sensor couldn't identify a valid VIN. TIP: Try scanning the barcode on the door jam sticker if the metal plate is worn or reflective.");
      }
    } catch (err) {
      alert("Intelligence Link Interrupted.");
    } finally {
      setLoading(false);
      if(cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleTesterSearch = async () => {
    if (zipCode.length < 5) return;
    setSearchingTesters(true);
    const county = getCountyFromZip(zipCode);
    try {
      const mapResult = await findTestersNearby(zipCode);
      setTesterResult({ county, text: mapResult.text, locations: mapResult.locations });
    } catch (error) {
      setTesterResult({ county });
    } finally {
      setSearchingTesters(false);
    }
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    if (!val) return;
    
    if (searchMode === 'VIN') {
        if (!isValidVinFormat(val)) {
            let msg = "Invalid VIN format.";
            if (val.length !== 17) msg = "VIN must be exactly 17 characters.";
            else if (/[IOQ]/.test(val)) msg = "VIN cannot contain I, O, or Q (use 1, 0, or 0).";
            alert(msg);
            return;
        }
        if (!validateVINCheckDigit(val)) {
            if (!confirm("VIN check digit verification failed (MOD 11). This usually indicates a typo. Are you sure you want to proceed with this protocol?")) {
                return;
            }
        }
    }

    onAddToHistory(val, searchMode === 'OWNER' ? 'ENTITY' : 'VIN');
    setShowQuestions(true);
  };

  const finishProtocol = () => {
    if (!answers.smoke || !answers.engine || !answers.visual) {
        alert("All protocol steps must be confirmed for certification.");
        return;
    }
    setShowQuestions(false);
    setShowSuccessReceipt(true);
    trackEvent('compliance_receipt_view');
  };

  if (showQuestions) {
      return (
          <div className="fixed inset-0 z-[200] bg-carb-navy overflow-y-auto p-6 animate-in slide-in-from-bottom duration-500">
              <div className="max-w-md mx-auto py-12 space-y-10">
                  <header className="text-center space-y-2">
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase">Compliance Protocol</h2>
                      <p className="text-[10px] font-black text-carb-accent tracking-[0.4em] uppercase">OVI Field Verification</p>
                  </header>
                  <div className="glass p-8 rounded-[3rem] space-y-6 border border-white/5">
                      {[
                          { key: 'smoke', label: 'Opacity Smoke Test Conducted', icon: '💨' },
                          { key: 'engine', label: 'Engine Control Label Verified', icon: '🏷️' },
                          { key: 'visual', label: 'Visual Component Inspection Passed', icon: '🔍' }
                      ].map((q) => (
                          <button 
                            key={q.key}
                            onClick={() => setAnswers({...answers, [q.key]: !answers[q.key as keyof typeof answers]})}
                            className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all active-haptic ${answers[q.key as keyof typeof answers] ? 'bg-green-500/10 border-green-500/40' : 'bg-white/5 border-white/10'}`}
                          >
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">{q.icon}</span>
                                <span className="text-[11px] font-black uppercase tracking-tight text-white text-left">{q.label}</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${answers[q.key as keyof typeof answers] ? 'bg-green-500 border-green-500' : 'border-white/20'}`}>
                                {answers[q.key as keyof typeof answers] && <span className="text-white text-[10px]">✓</span>}
                            </div>
                          </button>
                      ))}
                  </div>
                  <div className="space-y-4">
                      <button 
                        onClick={finishProtocol}
                        className="w-full py-6 bg-white text-carb-navy rounded-[2.5rem] font-black tracking-widest text-xs uppercase shadow-2xl active-haptic italic"
                      >
                        Generate Official Record
                      </button>
                      <button onClick={() => setShowQuestions(false)} className="w-full py-4 text-gray-500 font-black uppercase tracking-widest text-[9px] italic">Abort Protocol</button>
                  </div>
              </div>
          </div>
      );
  }

  if (showSuccessReceipt) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in duration-500 overflow-y-auto">
            <div className="bg-white rounded-[3.5rem] w-full max-w-sm shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden border border-white/20 my-auto">
                <div className="h-44 bg-carb-navy flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-carb-accent/20 to-transparent"></div>
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-xl border-4 border-white/10">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Protocol Recorded</h2>
                    <p className="text-[9px] font-black text-carb-accent tracking-[0.4em] uppercase mt-1">Certified Compliance</p>
                </div>
                <div className="p-10 space-y-8">
                    <div className="text-center">
                        <p className="text-sm font-black text-carb-navy leading-tight italic">
                            Congratulations! Your vehicle has been recorded.
                        </p>
                    </div>
                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Test Type</span>
                            <span className="text-[11px] font-black text-carb-navy uppercase">OVI (Opacity & Visual)</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Test Date</span>
                            <span className="text-[11px] font-black text-carb-navy">{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Test ID</span>
                            <span className="text-[11px] font-black text-carb-navy font-mono">#{Math.floor(Math.random() * 900000) + 100000}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">VIN</span>
                            <span className="text-[11px] font-black text-carb-navy font-mono truncate ml-4">{inputVal}</span>
                        </div>
                        {vehicleDetails && (
                            <div className="flex justify-between border-b border-gray-100 pb-3">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Vehicle</span>
                                <span className="text-[11px] font-black text-carb-navy uppercase ml-4">{vehicleDetails.year} {vehicleDetails.make}</span>
                            </div>
                        )}
                    </div>
                    <div className="pt-4 space-y-3">
                        <button 
                            onClick={() => window.print()}
                            className="w-full py-5 bg-carb-navy text-white font-black rounded-3xl text-[10px] tracking-widest uppercase active-haptic shadow-xl flex items-center justify-center gap-3 italic"
                        >
                            💾 Save Digital PDF
                        </button>
                        <button 
                            onClick={() => {
                                setShowSuccessReceipt(false);
                                setInputVal('');
                                setAnswers({ smoke: false, engine: false, visual: false });
                            }}
                            className="w-full py-4 border-2 border-carb-navy text-carb-navy font-black rounded-3xl text-[9px] tracking-widest uppercase active-haptic italic"
                        >
                            Dismiss Protocol
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Official CARB HD I/M Certified Record</p>
                </div>
            </div>
        </div>
    );
  }

  if (showTesterSearch) {
      return (
          <div className="fixed inset-0 z-[200] bg-carb-navy overflow-y-auto animate-in fade-in slide-in-from-right duration-500">
              <header className="pt-safe px-6 py-6 flex justify-between items-center sticky top-0 glass-dark z-20">
                  <button onClick={() => { setShowTesterSearch(false); setTesterResult(null); }} className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                      <span className="text-xl">‹</span> BACK
                  </button>
                  <h2 className="text-lg font-black tracking-tighter">TESTER DISPATCH</h2>
                  <div className="w-12"></div>
              </header>
              <div className="p-8 space-y-10 max-w-md mx-auto">
                  <div className="glass p-10 rounded-[3rem] text-center">
                      <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6 italic">Service Zone (Zip)</label>
                      <input 
                          type="tel" 
                          placeholder="00000" 
                          value={zipCode} 
                          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-transparent p-4 text-7xl font-light text-white outline-none text-center tracking-tighter"
                          maxLength={5}
                      />
                      {!testerResult && (
                        <button 
                          onClick={handleTesterSearch}
                          disabled={searchingTesters}
                          className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 bg-blue-400/10 px-6 py-2 rounded-full border border-blue-400/20 active-haptic disabled:opacity-50"
                        >
                          {searchingTesters ? 'SCANNING...' : 'Verify Zone'}
                        </button>
                      )}
                  </div>
                  {testerResult && (
                    <div className="space-y-6 animate-in zoom-in duration-300">
                      <div className="bg-white text-carb-navy rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl">
                          <h3 className="text-3xl font-black tracking-tighter uppercase italic">{testerResult.county} County</h3>
                          <div className="flex flex-col gap-3">
                            <a href="tel:6173596953" className="block w-full py-6 bg-carb-navy text-white font-black rounded-3xl text-sm tracking-widest uppercase active-haptic shadow-xl flex items-center justify-center gap-3 italic">
                               <div className="text-white">{APPLE_ICON}</div> TEXT/CALL TESTER
                            </a>
                          </div>
                      </div>
                    </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-12 pt-6">
      <button id="find-tester-trigger" onClick={() => setShowTesterSearch(true)} className="hidden"></button>
      <div className="text-center space-y-2">
          <h2 className="text-4xl font-light tracking-tighter text-white">Quick Check</h2>
          <button 
            onClick={onShareApp}
            className="text-[10px] text-carb-accent font-black uppercase tracking-[0.3em] italic hover:underline decoration-carb-accent underline-offset-4"
          >
            Download Instant Compliance Check App
          </button>
      </div>

      <div className="space-y-6">
            <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="w-full group glass py-12 rounded-[3.5rem] flex flex-col items-center justify-center gap-4 active-haptic transition-all hover:bg-white/5 border border-white/5 shadow-2xl"
            >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-carb-accent group-hover:bg-carb-accent/10 transition-all border border-transparent group-hover:border-carb-accent/20">
                    <div className="scale-150">{APPLE_ICON}</div>
                </div>
                <div className="text-center px-4">
                    <span className="font-black text-[14px] tracking-[0.2em] uppercase text-white group-hover:text-carb-accent transition-colors italic">
                        {loading ? statusMessage : 'Scan VIN with Camera'}
                    </span>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2 opacity-70 leading-tight">
                        Works on metal plates & barcodes.<br/>
                        Optimized for iPhone & Samsung sensors.
                    </p>
                </div>
            </button>
            
            <input type="file" ref={cameraInputRef} onChange={handleScan} accept="image/*" capture="environment" className="hidden" />
            
            <div className="space-y-6">
                <div className="flex gap-10 justify-center">
                    <button onClick={() => setSearchMode('VIN')} className={`py-1 text-[10px] font-black tracking-[0.3em] transition-all border-b-2 uppercase italic flex items-center gap-2 ${searchMode === 'VIN' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>
                      {APPLE_ICON} Vehicle
                    </button>
                    <button onClick={() => setSearchMode('OWNER')} className={`py-1 text-[10px] font-black tracking-[0.3em] transition-all border-b-2 uppercase italic flex items-center gap-2 ${searchMode === 'OWNER' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>
                      {ANDROID_ICON} Fleet ID
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                            placeholder={searchMode === 'VIN' ? "ENTER VIN HERE" : "ENTITY ID"}
                            className={`w-full bg-transparent text-white border-2 ${formatError ? 'border-red-500/50' : 'border-white/10'} rounded-[2.5rem] py-8 px-8 text-center font-black text-2xl placeholder:font-black placeholder:text-white/20 focus:border-carb-accent outline-none transition-all`}
                            maxLength={searchMode === 'VIN' ? 17 : 20}
                        />
                        {searchMode === 'VIN' && formatError && (
                            <p className="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-black text-red-500 uppercase tracking-widest">{formatError}</p>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={checkCompliance}
                            disabled={loading || !inputVal}
                            className="w-full py-6 bg-blue-600 text-white font-black rounded-[2.5rem] uppercase tracking-widest text-xs active-haptic shadow-xl shadow-blue-500/20 disabled:opacity-50 italic"
                        >
                            VERIFY PROTOCOL
                        </button>
                        
                        <button 
                            onClick={() => cameraInputRef.current?.click()}
                            className="text-[11px] font-black text-carb-accent uppercase tracking-widest italic text-center underline underline-offset-4 hover:text-white transition-colors"
                        >
                            Or Scan VIN with Camera
                        </button>
                    </div>
                </div>

                {vehicleDetails && (
                    <div className="glass p-6 rounded-3xl border border-green-500/30 animate-in fade-in zoom-in">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest italic">NHTSA Verified</span>
                            <span className="text-[10px] font-black text-gray-500 uppercase">GVWR: {vehicleDetails.gvwr}</span>
                        </div>
                        <h4 className="text-xl font-black text-white italic tracking-tighter uppercase">{vehicleDetails.year} {vehicleDetails.make}</h4>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{vehicleDetails.model}</p>
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-[9px] font-black text-gray-600 uppercase">Engine Manufacturer</p>
                            <p className="text-xs font-black text-white uppercase">{vehicleDetails.engineMfr}</p>
                        </div>
                    </div>
                )}
            </div>
      </div>
      
      <div className="flex flex-col gap-6">
          <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-4">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic text-center">Protocol Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={onNavigateTools} className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-white/5 border border-white/5 active-haptic hover:bg-white/10 transition-all">
                      <span className="text-2xl">⚡</span>
                      <span className="text-[8px] font-black uppercase tracking-widest">Field Tools</span>
                  </button>
                  <button onClick={onNavigateChat} className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-white/5 border border-white/5 active-haptic hover:bg-white/10 transition-all">
                      <span className="text-2xl">🤖</span>
                      <span className="text-[8px] font-black uppercase tracking-widest">Ask AI</span>
                  </button>
              </div>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-[2.5rem] flex items-center gap-4">
              <span className="text-2xl">💡</span>
              <p className="text-[10px] text-yellow-500/80 font-bold uppercase leading-relaxed italic">
                  Tip: If the VIN plate is too worn, scan the barcode usually found on the driver side door jam sticker.
              </p>
          </div>
      </div>
    </div>
  );
};

export default VinChecker;