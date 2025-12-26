import React from 'react';

const ComplianceGuide: React.FC = () => {
  const steps = [
    {
      icon: "🏢",
      title: "1. Register Entity",
      desc: "Create your CTC-VIS account on the official CARB portal. Required for all fleets.",
      url: "https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/RegisterEntity"
    },
    {
      icon: "🚛",
      title: "2. List Vehicles",
      desc: "Input your VINs and pay the $30 per vehicle annual compliance fee.",
      url: "https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleManagement"
    },
    {
      icon: "🔌",
      title: "3. OBD Testing",
      desc: "Starting 2025, bi-annual emissions testing is mandatory. Find a mobile tester.",
      url: "#",
      internalAction: true
    }
  ];

  return (
    <div className="space-y-6 mt-10">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Compliance Protocol</h3>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">LIVE GUIDANCE</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {steps.map((step, idx) => (
          <div 
            key={idx}
            className="glass p-5 rounded-3xl flex items-start gap-4 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
            onClick={() => step.internalAction ? document.getElementById('find-tester-trigger')?.click() : window.open(step.url, '_blank')}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              {step.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm tracking-tight">{step.title}</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
            </div>
            <div className="text-gray-700 font-thin text-xl">›</div>
          </div>
        ))}
      </div>

      <div className="bg-green-500/5 border border-green-500/10 p-6 rounded-[2.5rem] flex flex-col items-center text-center space-y-2">
        <div className="text-green-500 text-xs font-black uppercase tracking-widest">Compliance Deadline</div>
        <div className="text-2xl font-light text-white">Jan 1st, 2025</div>
        <p className="text-[10px] text-gray-500 font-medium px-6">Mandatory bi-annual testing begins for all CA diesel vehicles over 14,000 lbs GVWR.</p>
      </div>
    </div>
  );
};

export default ComplianceGuide;