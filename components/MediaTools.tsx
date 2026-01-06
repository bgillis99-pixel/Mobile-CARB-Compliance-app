
import React, { useState, useMemo } from 'react';
import { trackEvent } from '../services/analytics';

interface Tester {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  isCredentialed: boolean;
  locationLabel: string;
}

const MediaTools: React.FC = () => {
  const [zipInput, setZipInput] = useState('');
  const [showResults, setShowResults] = useState(false);

  const getTesterForZip = (zip: string): Tester => {
    let location = "CALIFORNIA REGION";
    if (zip === '90210') location = "LOS ANGELES TESTER";
    if (zip === '95819') location = "SACRAMENTO TESTER";
    
    // Defaulting to user's specified priority tester (NorCal Smoke Pros)
    return {
      id: 'priority-1',
      name: 'NorCal Smoke Pros',
      phone: '617-359-6953',
      email: 'test@norcalcarb.com',
      rating: 5,
      isCredentialed: true,
      locationLabel: location
    };
  };

  const tester = useMemo(() => getTesterForZip(zipInput), [zipInput]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-700'}>★</span>
    ));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="bg-black/40 border border-white/10 rounded-[3rem] p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Tester Results</h2>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Credentialed Fleet Inspectors</p>
          </div>

          <div className="space-y-4">
              <input 
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Enter Zip for Local Tester"
                className="w-full bg-black/60 p-6 rounded-3xl border border-white/10 outline-none text-sm font-black text-white uppercase italic text-center focus:border-blue-500 transition-colors"
              />
              <button 
                onClick={() => zipInput.length === 5 && setShowResults(true)}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs italic shadow-lg active-haptic disabled:opacity-30"
                disabled={zipInput.length !== 5}
              >
                Find Testers Near You
              </button>
          </div>
      </div>

      {showResults && (
        <div className="space-y-6 animate-in slide-in-from-bottom-6">
            <div className="px-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic mb-4">Available Inspectors</h3>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-2xl space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-blue-600/10 text-blue-400 px-4 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest">
                    {tester.locationLabel}
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {tester.isCredentialed && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tight">{tester.name}</h4>
                    </div>
                    <div className="flex gap-1 text-sm">{renderStars(tester.rating)}</div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">CARB Verified Inspector #1125</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <a href={`tel:${tester.phone}`} className="flex-1 py-4 bg-white text-carb-navy rounded-2xl font-black text-[10px] text-center uppercase tracking-widest active-haptic italic shadow-lg">Voice / SMS</a>
                    <a href={`mailto:${tester.email}`} className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black text-[10px] text-center uppercase tracking-widest border border-white/10 active-haptic italic">Email</a>
                </div>
            </div>

            <div className="px-8 text-center">
                <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.4em] italic">Testing Slots Filling Fast for 12/26 Window</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default MediaTools;
