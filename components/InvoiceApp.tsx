
import React, { useState, useEffect } from 'react';
import { Contact, TestAppointment } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  initialData?: any;
  onComplete: () => void;
}

const InvoiceApp: React.FC<Props> = ({ onComplete, initialData }) => {
  const [invoiceNumber] = useState('INV-' + Math.floor(1000 + Math.random() * 9000));
  const [invoiceDate] = useState(new Date().toLocaleDateString());
  
  const [billTo, setBillTo] = useState<Contact>({
    name: initialData?.name || '',
    company: initialData?.company || '',
    address: initialData?.address || '',
    cityState: initialData?.cityState || '',
    phone: initialData?.phone || '',
    email: initialData?.email || ''
  });

  const [items, setItems] = useState<TestAppointment[]>([
    {
      id: '1',
      type: 'OBD',
      truckNumber: initialData?.truckNumber || '',
      details: 'Clean Truck Check OBD Verification',
      amount: 75.00,
      date: new Date().toLocaleDateString()
    }
  ]);

  const [includeReview, setIncludeReview] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const addItem = (type: 'OBD' | 'OVI' | 'OTHER') => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      truckNumber: '',
      details: type === 'OBD' ? 'Standard OBD Scan' : type === 'OVI' ? 'Visual Inspection' : '',
      amount: 75.00,
      date: new Date().toLocaleDateString()
    }]);
    triggerHaptic('light');
  };

  const updateItem = (id: string, field: keyof TestAppointment, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const handleShare = (method: 'sms' | 'email') => {
    const text = `Invoice ${invoiceNumber} for ${billTo.company || billTo.name}: $${total.toFixed(2)}. Pay here: https://stripe.com/pay/${invoiceNumber}`;
    if (method === 'sms') {
      window.location.href = `sms:${billTo.phone}?body=${encodeURIComponent(text)}`;
    } else {
      window.location.href = `mailto:${billTo.email}?subject=Invoice ${invoiceNumber}&body=${encodeURIComponent(text)}`;
    }
  };

  const handlePickContact = async () => {
    const nav = navigator as any;
    if (!('contacts' in nav && 'select' in nav.contacts)) {
      alert("Contact Picker is only available on modern mobile browsers (iOS Safari/Android Chrome).");
      return;
    }

    try {
      triggerHaptic('medium');
      const props = ['name', 'email', 'tel'];
      const [contact] = await nav.contacts.select(props, { multiple: false });
      
      if (contact) {
        setBillTo({
          ...billTo,
          name: contact.name?.[0] || billTo.name,
          email: contact.email?.[0] || billTo.email,
          phone: contact.tel?.[0] || billTo.phone,
          company: contact.name?.[0] || billTo.company // Use name as default company if empty
        });
        triggerHaptic('success');
      }
    } catch (err) {
      console.error("Contact Pick Error:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-40 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8 px-2">
        <button onClick={onComplete} className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">‹ Back to Hub</button>
        <div className="flex gap-4">
           <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[9px] font-black text-slate-500 uppercase italic">Review Link</span>
              <div 
                onClick={() => { triggerHaptic('light'); setIncludeReview(!includeReview); }}
                className={`w-10 h-5 rounded-full relative transition-colors ${includeReview ? 'bg-carb-green' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${includeReview ? 'left-6' : 'left-1'}`}></div>
              </div>
           </label>
        </div>
      </div>

      <div className="bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-white/10 relative overflow-hidden">
        {/* Branding */}
        <div className="flex justify-between items-start mb-12">
           <div className="space-y-1">
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">NORCAL <span className="text-carb-green">CARB</span></h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.4em]">Mobile Compliance LLC</p>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</p>
              <p className="text-xl font-black italic text-slate-900 leading-none">{invoiceNumber}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">{invoiceDate}</p>
           </div>
        </div>

        {/* Recipient */}
        <div className="mb-12 space-y-4">
           <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-carb-accent uppercase tracking-widest italic">Bill To:</p>
              <button 
                onClick={handlePickContact}
                className="text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                📇 Pick from Contacts
              </button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                placeholder="CLIENT NAME" 
                value={billTo.name} 
                onChange={e => setBillTo({...billTo, name: e.target.value})}
                className="w-full bg-slate-50 border-b border-slate-100 p-2 text-sm font-bold uppercase outline-none focus:border-carb-accent"
              />
              <input 
                placeholder="COMPANY" 
                value={billTo.company} 
                onChange={e => setBillTo({...billTo, company: e.target.value})}
                className="w-full bg-slate-50 border-b border-slate-100 p-2 text-sm font-bold uppercase outline-none focus:border-carb-accent"
              />
              <input 
                placeholder="PHONE" 
                value={billTo.phone} 
                onChange={e => setBillTo({...billTo, phone: e.target.value})}
                className="w-full bg-slate-50 border-b border-slate-100 p-2 text-sm font-bold outline-none focus:border-carb-accent"
              />
              <input 
                placeholder="EMAIL" 
                value={billTo.email} 
                onChange={e => setBillTo({...billTo, email: e.target.value})}
                className="w-full bg-slate-50 border-b border-slate-100 p-2 text-sm font-bold outline-none focus:border-carb-accent"
              />
           </div>
        </div>

        {/* Line Items */}
        <div className="space-y-8 mb-12">
           <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest">Services</span>
              <div className="flex gap-2">
                {['OBD', 'OVI', 'OTHER'].map(t => (
                  <button key={t} onClick={() => addItem(t as any)} className="bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg text-[8px] font-black transition-colors">{t}+</button>
                ))}
              </div>
           </div>

           <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="py-6 space-y-4 group">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-black italic">{item.type}</span>
                        <input 
                          placeholder="TRUCK #" 
                          value={item.truckNumber} 
                          onChange={e => updateItem(item.id, 'truckNumber', e.target.value.toUpperCase())}
                          className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-black uppercase w-28 outline-none border border-transparent focus:border-carb-accent"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number"
                          value={item.amount} 
                          onChange={e => updateItem(item.id, 'amount', e.target.value)}
                          className="w-20 text-right font-black italic text-lg outline-none"
                        />
                        <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-red-500 transition-colors">✕</button>
                      </div>
                   </div>
                   <textarea 
                      placeholder="Line Item Details / OVI Notes..."
                      value={item.details}
                      onChange={e => updateItem(item.id, 'details', e.target.value)}
                      className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-medium italic text-slate-500 min-h-[60px] outline-none border border-transparent focus:border-carb-accent resize-none"
                   />
                </div>
              ))}
           </div>
        </div>

        {/* Totals & Payments */}
        <div className="flex flex-col items-end gap-6">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total Due</p>
              <h2 className="text-5xl font-black italic tracking-tighter text-slate-900">${total.toFixed(2)}</h2>
           </div>

           <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-between pt-8 border-t border-slate-100">
              <div className="flex flex-col items-center sm:items-start gap-2">
                 <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-200">
                    {/* Simulated QR Code */}
                    <div className="grid grid-cols-4 gap-1 p-2">
                       {Array.from({length: 16}).map((_, i) => <div key={i} className={`w-3 h-3 ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`}></div>)}
                    </div>
                 </div>
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Scan to Pay</span>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                 <button onClick={() => setShowPaymentModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active-haptic shadow-xl">💳 Pay with Stripe</button>
                 <div className="flex gap-2">
                    {['PayPal', 'Venmo', 'Apple', 'Google'].map(p => (
                      <button key={p} className="bg-slate-100 px-4 py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">{p}</button>
                    ))}
                 </div>
              </div>
           </div>

           {includeReview && (
             <div className="w-full mt-8 p-6 bg-carb-accent/10 rounded-3xl border border-carb-accent/20 text-center space-y-2">
                <p className="text-[9px] font-black text-carb-accent uppercase tracking-[0.3em] italic">Complimentary Compliance Audit Complete</p>
                <p className="text-[10px] font-bold text-slate-600 uppercase">Support local business: Leave a 5-star review</p>
                <a href="https://g.page/norcalcarb/review" className="text-xs font-black underline text-carb-accent">Open Google Profile</a>
             </div>
           )}
        </div>
      </div>

      {/* Share Actions */}
      <div className="mt-12 grid grid-cols-2 gap-4 px-2">
         <button onClick={() => handleShare('sms')} className="py-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active-haptic">
            <span className="text-2xl">📱</span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Text Invoice</span>
         </button>
         <button onClick={() => handleShare('email')} className="py-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active-haptic">
            <span className="text-2xl">📧</span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Email Invoice</span>
         </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white italic font-black">S</div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Secure Stripe Merchant</span>
                 </div>
                 <button onClick={() => setShowPaymentModal(false)} className="text-2xl">✕</button>
              </div>
              <div className="p-10 text-center space-y-10">
                 <div className="space-y-2">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Authorization Total</p>
                    <p className="text-6xl font-black italic tracking-tighter text-slate-900">${total.toFixed(2)}</p>
                 </div>
                 <button 
                  onClick={() => { triggerHaptic('success'); alert("Authorized. Record Sent to Wave."); setShowPaymentModal(false); onComplete(); }}
                  className="w-full py-7 bg-slate-900 text-white font-black rounded-[2.5rem] uppercase tracking-widest text-xs italic active-haptic shadow-2xl"
                 >
                   Confirm Settlement
                 </button>
                 <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Powered by Stripe Connect & Make.ai</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceApp;
