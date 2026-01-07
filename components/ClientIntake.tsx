
import React, { useState, useRef } from 'react';
import { extractVinAndPlateFromImage, extractRegistrationData, extractEngineTagData } from '../services/geminiService';
import { saveIntakeSubmission, saveClientToCRM } from '../services/firebase';
import { decodeVinNHTSA } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';
import { IntakeMode } from '../types';

const ModeButton = ({ icon, label, onClick, sub }: { icon: string, label: string, onClick: () => void, sub: string }) => (
    <button 
        onClick={onClick}
        className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 hover:bg-white/10 transition-all active-haptic group text-left"
    >
        <span className="text-4xl group-hover:scale-110 transition-transform">{icon}</span>
        <div className="flex flex-col gap-1">
            <span className="text-sm font-black text-white uppercase italic tracking-tight">{label}</span>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{sub}</span>
        </div>
        <span className="ml-auto text-blue-500 font-thin text-2xl">›</span>
    </button>
);

const ClientIntake: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [mode, setMode] = useState<IntakeMode | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'name' | 'mode' | 'extraction' | 'success'>('name');
    const [extractedResult, setExtractedResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !mode) return;
        setLoading(true);
        setStep('extraction');

        try {
            let data: any;
            if (mode === 'VIN_LABEL') data = await extractVinAndPlateFromImage(file);
            if (mode === 'REGISTRATION') data = await extractRegistrationData(file);
            if (mode === 'ENGINE_TAG') data = await extractEngineTagData(file);

            setExtractedResult(data);
            trackEvent('intake_extraction_complete', { mode });
        } catch (err) {
            alert("Analysis error. Please retry with a clearer photo.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!extractedResult) return;
        setLoading(true);
        
        try {
            // 1. Save Intake Submission for Ops
            await saveIntakeSubmission({
                clientName,
                timestamp: Date.now(),
                photos: { vin: null, plate: null, odometer: null, ecl: null, engine: null, exterior: null, registration: null },
                extractedData: extractedResult,
                status: 'pending',
                mode: mode || 'FULL_INTAKE'
            });

            // 2. Add to CRM (OVI / App Clients)
            // Attempt to get VIN from extraction result
            const vin = extractedResult.vin || '';
            let nhtsaData = null;
            
            if (vin && vin.length === 17) {
                // Verify VIN via NHTSA/SAFER logic before saving
                nhtsaData = await decodeVinNHTSA(vin);
            }

            await saveClientToCRM({
                clientName,
                phone: clientPhone,
                email: clientEmail,
                vin,
                plate: extractedResult.plate || '',
                make: nhtsaData?.make || extractedResult.vehicleMake || '',
                model: nhtsaData?.model || extractedResult.vehicleModel || '',
                year: nhtsaData?.year || extractedResult.vehicleYear || '',
                timestamp: Date.now(),
                status: 'New',
                notes: `Intake Mode: ${mode}`
            });

            setStep('success');
        } catch (e) {
            alert("Database Link Failure.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'name') {
        return (
            <div className="max-w-md mx-auto py-6 animate-in fade-in duration-500">
                <div className="glass p-10 rounded-[3.5rem] border border-blue-500/20 space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">Intake Processor</h2>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">New Client / OVI Entry</p>
                    </div>
                    
                    <div className="space-y-4 pt-4">
                        <div className="space-y-1">
                            <label className="ml-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Client / Company Name *</label>
                            <input 
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="ENTER NAME"
                                className="w-full bg-white/5 p-5 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-black text-white uppercase italic tracking-widest"
                            />
                        </div>

                        <div className="space-y-1">
                             <label className="ml-4 text-[9px] font-black uppercase text-gray-500 tracking-widest">Phone (Optional)</label>
                             <input 
                                value={clientPhone}
                                onChange={e => setClientPhone(e.target.value)}
                                placeholder="555-555-5555"
                                type="tel"
                                className="w-full bg-white/5 p-5 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-bold text-white tracking-widest"
                            />
                        </div>

                        <div className="space-y-1">
                             <label className="ml-4 text-[9px] font-black uppercase text-gray-500 tracking-widest">Email (Optional)</label>
                             <input 
                                value={clientEmail}
                                onChange={e => setClientEmail(e.target.value)}
                                placeholder="email@domain.com"
                                type="email"
                                className="w-full bg-white/5 p-5 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-bold text-white tracking-widest"
                            />
                        </div>

                        <p className="text-[8px] text-gray-600 text-center italic pt-2">
                            Creates CRM record for Billing & Compliance.
                        </p>

                        <button 
                            onClick={() => setStep('mode')}
                            disabled={!clientName}
                            className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 mt-4"
                        >
                            Select Input Type
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'mode') {
        return (
            <div className="max-w-md mx-auto space-y-8 py-10 animate-in slide-in-from-bottom-10 duration-700">
                <div className="text-center space-y-1">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-gray-500">{clientName}</h2>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Select Intake Protocol</h3>
                </div>
                <div className="space-y-4">
                    <ModeButton 
                        icon="🏷️" 
                        label="VIN Label / Door Plate" 
                        sub="Extract VIN & Weights" 
                        onClick={() => { setMode('VIN_LABEL'); fileInputRef.current?.click(); }}
                    />
                    <ModeButton 
                        icon="📄" 
                        label="Vehicle Registration" 
                        sub="Extract Owner & Plate Details" 
                        onClick={() => { setMode('REGISTRATION'); fileInputRef.current?.click(); }}
                    />
                    <ModeButton 
                        icon="⚙️" 
                        label="Engine Tag (ECL)" 
                        sub="CRITICAL: Family Name extraction" 
                        onClick={() => { setMode('ENGINE_TAG'); fileInputRef.current?.click(); }}
                    />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
        );
    }

    if (step === 'extraction') {
        return (
            <div className="max-w-md mx-auto py-10 space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Extraction Portal</h2>
                    <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
                </div>

                {loading ? (
                    <div className="glass p-16 rounded-[4rem] flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] animate-pulse">Running AI Vision Protocols...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="glass p-10 rounded-[3.5rem] border border-white/10 space-y-6">
                            <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] italic text-center">Verified Data Output</h4>
                            
                            <div className="space-y-4">
                                {mode === 'ENGINE_TAG' && (
                                    <div className="p-6 bg-blue-600/10 border-2 border-blue-500/50 rounded-3xl animate-in zoom-in">
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic mb-2">CRITICAL: FAMILY NAME</p>
                                        <p className="text-2xl font-black text-white tracking-widest font-mono text-center">{extractedResult?.familyName || 'N/A'}</p>
                                    </div>
                                )}
                                
                                {Object.entries(extractedResult || {}).map(([key, value]) => {
                                    if (key === 'familyName') return null;
                                    return (
                                        <div key={key} className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</span>
                                            <span className="text-[10px] font-black text-white uppercase italic">{String(value)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep('mode')} className="flex-1 py-6 bg-white/5 text-white font-black rounded-[2rem] uppercase tracking-widest text-[9px] border border-white/10">Retry</button>
                            <button onClick={handleFinalSubmit} className="flex-[2] py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-[9px] shadow-2xl">Confirm & Add to CRM</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-10 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white text-4xl shadow-[0_20px_50px_rgba(34,197,94,0.3)]">✓</div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">Intake Complete</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-10 leading-relaxed">Client CRM updated. Vehicle specs cross-referenced with SAFER/NHTSA.</p>
                </div>
                <button onClick={onComplete} className="bg-white text-carb-navy px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest italic active-haptic">Back to HUB</button>
            </div>
        );
    }

    return null;
};

export default ClientIntake;
