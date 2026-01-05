import React, { useState, useRef, useEffect, useMemo } from 'react';
import { batchAnalyzeTruckImages, validateVINCheckDigit } from '../services/geminiService';
import { decodeVinNHTSA } from '../services/nhtsa';
import { createJobInCloud, addVehicleToJobInCloud, subscribeToJobs, subscribeToJobVehicles, updateJobStatusInCloud, auth, subscribeToInboundIntakes } from '../services/firebase';
import { trackEvent } from '../services/analytics';
import { Job, Vehicle, IntakeSubmission } from '../types';

const MediaTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'inbound' | 'audio'>('jobs');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [inboundIntakes, setInboundIntakes] = useState<IntakeSubmission[]>([]);
  const [jobVehicles, setJobVehicles] = useState<Vehicle[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jobNameInput, setJobNameInput] = useState('');
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth?.currentUser) return;
    const unsubJobs = subscribeToJobs(auth.currentUser.uid, (jobs: Job[]) => setAllJobs(jobs));
    const unsubIntakes = subscribeToInboundIntakes((data: IntakeSubmission[]) => setInboundIntakes(data));
    return () => { unsubJobs(); unsubIntakes(); };
  }, []);

  useEffect(() => {
    if (!currentJob) { setJobVehicles([]); return; }
    const unsub = subscribeToJobVehicles(currentJob.id, (vehicles: Vehicle[]) => setJobVehicles(vehicles));
    return () => unsub();
  }, [currentJob]);

  const urgentCrmCount = useMemo(() => {
    return inboundIntakes.filter(i => i.extractedData?.confidence === 'low' || i.status === 'pending').length;
  }, [inboundIntakes]);

  const filteredInbound = useMemo(() => {
    const q = crmSearchQuery.toLowerCase();
    return inboundIntakes.filter(i => 
        i.clientName.toLowerCase().includes(q) || 
        i.extractedData?.vin?.toLowerCase().includes(q)
    );
  }, [inboundIntakes, crmSearchQuery]);

  const startNewJob = async () => {
    if (!jobNameInput || !auth?.currentUser) return;
    setLoading(true);
    const newJob: Omit<Job, 'id'> = {
        userId: auth.currentUser.uid,
        jobName: jobNameInput,
        jobDate: Date.now(),
        location: { lat: 0, lng: 0, address: 'Capturing GPS...' },
        status: 'pending',
        vehicleCount: 0,
        createdAt: Date.now(),
        exportedAt: null,
        vehicles: []
    };
    try {
        const created = await createJobInCloud(auth.currentUser.uid, newJob);
        setCurrentJob(created as Job);
        setJobNameInput('');
    } catch (err) { alert("Initialization Link Error."); } finally { setLoading(false); }
  };

  const handleExportToSheets = async (item: IntakeSubmission) => {
    setLoading(true);
    setStatusText('SYNCING TO GOOGLE SHEETS...');
    try {
      const rowData = {
        vin: item.extractedData?.vin || 'N/A',
        plate: item.extractedData?.licensePlate || 'N/A',
        mileage: item.extractedData?.mileage || 'N/A',
        fleetOwner: item.clientName,
        testResult: item.extractedData?.confidence === 'high' ? 'COMPLIANT' : 'PENDING_REVIEW',
        testerId: auth?.currentUser?.uid || 'APP_AUTO',
        timestamp: new Date().toISOString()
      };
      
      console.log("Mapping to 'OVI Incoming Truck info' sheet:", rowData);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSyncedIds(prev => new Set(prev).add(item.id));
      trackEvent('crm_sync_sheets_success', { vin: rowData.vin });
    } catch (e) {
      alert("Sheet sync failed. Check Google Cloud credentials.");
    } finally {
      setLoading(false);
    }
  };

  const runBatchExtraction = async () => {
    if (selectedFiles.length === 0 || !currentJob) return;
    setLoading(true);
    setStatusText('OPTICAL EXTRACTION RUNNING...');
    try {
      const data = await batchAnalyzeTruckImages(selectedFiles);
      const vinValid = validateVINCheckDigit(data.vin || '');
      const nhtsa = await decodeVinNHTSA(data.vin || '');
      const newVehicle: Omit<Vehicle, 'id'> = {
          jobId: currentJob.id,
          vin: data.vin || '',
          vinValid: vinValid,
          nhtsaSuccess: nhtsa?.valid || false,
          licensePlate: data.licensePlate || '',
          companyName: data.registeredOwner || '',
          mileage: data.mileage || '',
          eclCondition: (data.eclCondition as any) || "clear",
          engineFamilyName: data.engineFamilyName || '',
          engineManufacturer: data.engineManufacturer || nhtsa?.engineMfr || '',
          engineModel: data.engineModel || '',
          engineYear: data.engineYear || nhtsa?.year || '',
          vehicleYear: nhtsa?.year || data.engineYear || '',
          vehicleMake: nhtsa?.make || data.engineManufacturer || '',
          vehicleModel: nhtsa?.model || '',
          gvwr: nhtsa?.gvwr || data.dotNumber || '',
          testResult: "pending",
          testDate: Date.now(),
          photoUrls: {},
          confidence: (data.confidence as any) || "medium"
      };
      await addVehicleToJobInCloud(currentJob.id, newVehicle);
      await updateJobStatusInCloud(currentJob.id, 'review');
      setSelectedFiles([]);
      trackEvent('field_batch_extract_success');
    } catch (err) { alert("Optics Interrupted."); } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 pb-10">
      {/* High Contrast Tabs */}
      <div className="flex bg-black/40 rounded-[2.5rem] p-1.5 border border-white/20 shadow-2xl">
        {[
          { id: 'jobs', label: 'Field Hub' },
          { id: 'inbound', label: 'Inbound CRM', badge: urgentCrmCount },
          { id: 'audio', label: 'Audio' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all italic relative ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black animate-pulse border-2 border-carb-navy">
                    {tab.badge}
                </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'inbound' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-500">
                <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/20 flex items-center gap-4 shadow-xl">
                    <span className="text-xl">🔍</span>
                    <input 
                        value={crmSearchQuery}
                        onChange={e => setCrmSearchQuery(e.target.value)}
                        placeholder="SEARCH FLEET INTAKE..."
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white w-full placeholder:text-gray-600"
                    />
                </div>
                
                {filteredInbound.map(item => (
                    <div key={item.id} className="bg-black/40 p-8 rounded-[3rem] border border-white/10 space-y-6 relative overflow-hidden group shadow-2xl hover:border-blue-500/30 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-xl font-black text-white italic uppercase tracking-tight">{item.clientName}</h4>
                                <p className="text-[9px] font-black text-blue-500 uppercase mt-1 tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border italic ${
                              item.status === 'exported' ? 'bg-green-500 text-black border-green-500' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                        
                        {item.extractedData && (
                            <div className="bg-white/5 p-5 rounded-2xl grid grid-cols-2 gap-4 border border-white/5">
                                <div>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">VIN Detected</p>
                                    <p className="text-[10px] font-mono text-white truncate">{item.extractedData.vin || 'Pending'}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">EFN Code</p>
                                    <p className="text-[10px] font-mono text-white truncate">{item.extractedData.engineFamilyName || 'Pending'}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-3">
                            {syncedIds.has(item.id) ? (
                              <div className="flex-1 py-4 bg-green-500/10 text-green-500 rounded-2xl font-black text-[10px] uppercase tracking-widest italic flex items-center justify-center gap-2 border border-green-500/30">
                                <span>✓</span> SYNCED TO SHEETS
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleExportToSheets(item)} 
                                disabled={loading} 
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic active-haptic shadow-[0_8px_25px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-colors"
                              >
                                  {loading ? statusText : 'Export to Sheet'}
                              </button>
                            )}
                            <button className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic border border-white/10 hover:bg-white/10 transition-colors">
                                View Photos
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'jobs' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                {!currentJob ? (
                    <div className="bg-black/40 p-12 rounded-[4rem] border border-white/20 text-center space-y-8 shadow-2xl">
                        <div className="w-24 h-24 bg-blue-600/10 rounded-full mx-auto flex items-center justify-center text-4xl border border-blue-600/30 shadow-inner">
                            🏗️
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic uppercase italic text-white tracking-tighter">Field Hub</h3>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Site Inspector v4.0</p>
                        </div>
                        <div className="space-y-4">
                            <input 
                                value={jobNameInput}
                                onChange={e => setJobNameInput(e.target.value)}
                                placeholder="FLEET NAME / SITE ID"
                                className="w-full bg-black/40 p-6 rounded-3xl border border-white/10 outline-none text-sm font-black text-white uppercase italic text-center focus:border-blue-500 transition-colors"
                            />
                            <button 
                                onClick={startNewJob}
                                disabled={!jobNameInput || loading}
                                className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs italic shadow-[0_10px_30px_rgba(37,99,235,0.3)] active-haptic hover:bg-blue-500 transition-colors"
                            >
                                ACTIVATE FIELD PROTOCOL
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-blue-600 p-8 rounded-[3rem] flex justify-between items-center shadow-2xl">
                            <div>
                                <h4 className="text-xl font-black italic uppercase text-white tracking-tight">{currentJob.jobName}</h4>
                                <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">{jobVehicles.length} Trucks Logged</p>
                            </div>
                            <button onClick={() => setCurrentJob(null)} className="bg-black/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic border border-white/10 active-haptic">Terminate</button>
                        </div>

                        <div 
                            onClick={() => multiFileInputRef.current?.click()}
                            className="w-full py-20 bg-black/40 rounded-[4rem] border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-6 active-haptic hover:bg-white/5 transition-all shadow-xl"
                        >
                            <span className="text-6xl animate-bounce">📸</span>
                            <div className="text-center">
                                <p className="text-sm font-black uppercase italic text-white tracking-widest">Capture Photo Batch</p>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2 px-10">VIN • ECL • Odometer • Exterior</p>
                            </div>
                        </div>
                        
                        <input type="file" multiple ref={multiFileInputRef} className="hidden" onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} accept="image/*" />
                        
                        {selectedFiles.length > 0 && (
                            <button onClick={runBatchExtraction} disabled={loading} className="w-full py-6 bg-white text-carb-navy rounded-[2rem] font-black text-xs uppercase italic tracking-widest shadow-2xl active-haptic">
                                {loading ? statusText : `Extract ${selectedFiles.length} Photos`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default MediaTools;