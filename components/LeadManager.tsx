
import React, { useState, useMemo, useRef } from 'react';
import { User, Lead, Order, LeadStatus } from '../types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface LeadManagerProps {
  moderators: User[];
  leads: Lead[];
  orders: Order[];
  onAssignLeads: (leads: Lead[]) => void;
  onBulkUpdateLeads: (leadIds: string[], modId: string, date: string) => void;
  onDeleteLead: (id: string) => void;
}

interface EnrichedContact {
  phone: string;
  name: string;
  address: string;
  leadId: string | null;
  lastOrderDate: string | null;
  lastCallDate: string | null;
  daysSinceCall: number | null;
  daysSinceOrder: number | null;
  totalOrders: number;
  currentStatus: LeadStatus | 'unassigned';
  moderatorId: string | null;
}

const LeadManager: React.FC<LeadManagerProps> = ({ moderators, leads, orders, onAssignLeads, onBulkUpdateLeads, onDeleteLead }) => {
  const [selectedModId, setSelectedModId] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [minDaysSinceCall, setMinDaysSinceCall] = useState<string>('');
  const [minDaysSinceOrder, setMinDaysSinceOrder] = useState<string>('');
  const [strategicSelectedPhones, setStrategicSelectedPhones] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all' | 'unassigned'>('all');
  const [searchPhone, setSearchPhone] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanPhoneNumber = (raw: any) => {
    if (!raw) return "";
    let cleaned = String(raw).replace(/[^\d]/g, '');
    if (cleaned.startsWith('880')) cleaned = cleaned.substring(3);
    else if (cleaned.startsWith('88')) cleaned = cleaned.substring(2);
    if (cleaned.length === 10) cleaned = '0' + cleaned;
    if (cleaned.length === 11 && cleaned.startsWith('0')) return cleaned;
    return cleaned.length >= 10 ? cleaned : "";
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const getValueByFlexibleKey = (row: any, searchKeys: string[]) => {
    const keys = Object.keys(row);
    for (const searchKey of searchKeys) {
      const normalizedSearch = searchKey.toLowerCase().replace(/[\s_]/g, '');
      const foundKey = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === normalizedSearch);
      if (foundKey && row[foundKey]) return row[foundKey];
    }
    return "";
  };

  const contacts = useMemo(() => {
    const contactMap: Record<string, EnrichedContact> = {};
    const now = new Date();

    leads.forEach(l => {
      if (!l.phoneNumber) return;
      const phone = cleanPhoneNumber(l.phoneNumber);
      const callDate = l.status !== 'pending' ? new Date(l.createdAt) : null;
      if (!contactMap[phone]) {
        contactMap[phone] = {
          phone, name: l.customerName || 'Prospect', address: l.address || '',
          leadId: l.id, lastCallDate: callDate?.toISOString() || null,
          daysSinceCall: callDate ? Math.floor((now.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24)) : null,
          lastOrderDate: null, daysSinceOrder: null, totalOrders: 0,
          currentStatus: l.status, moderatorId: l.moderatorId
        };
      } else {
        contactMap[phone].moderatorId = l.moderatorId;
        contactMap[phone].currentStatus = l.status;
        contactMap[phone].leadId = l.id;
      }
    });

    orders.forEach(o => {
      const phone = cleanPhoneNumber(o.customerPhone);
      const orderDate = new Date(o.createdAt);
      if (!contactMap[phone]) {
        contactMap[phone] = {
          phone, name: o.customerName, address: o.customerAddress,
          leadId: null, lastCallDate: null, daysSinceCall: null,
          lastOrderDate: o.createdAt,
          daysSinceOrder: Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)),
          totalOrders: 1, currentStatus: 'unassigned', moderatorId: null
        };
      } else {
        contactMap[phone].totalOrders += 1;
        const currentLastOrder = contactMap[phone].lastOrderDate ? new Date(contactMap[phone].lastOrderDate) : null;
        if (!currentLastOrder || orderDate > currentLastOrder) {
          contactMap[phone].lastOrderDate = o.createdAt;
          contactMap[phone].daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    });

    return Object.values(contactMap);
  }, [leads, orders]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (searchPhone && !c.phone.includes(searchPhone)) return false;
      if (statusFilter === 'unassigned') {
        if (c.moderatorId && c.moderatorId !== 'null' && c.moderatorId !== '') return false;
      } else if (statusFilter !== 'all') {
        if (c.currentStatus !== statusFilter) return false;
      }
      if (minDaysSinceCall !== '') {
        const threshold = parseInt(minDaysSinceCall);
        if (c.daysSinceCall === null || c.daysSinceCall < threshold) return false;
      }
      if (minDaysSinceOrder !== '') {
        const threshold = parseInt(minDaysSinceOrder);
        if (c.daysSinceOrder === null || c.daysSinceOrder < threshold) return false;
      }
      return true;
    }).sort((a, b) => {
      const dateA = a.lastOrderDate || a.lastCallDate || '0';
      const dateB = b.lastOrderDate || b.lastCallDate || '0';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [contacts, statusFilter, searchPhone, minDaysSinceCall, minDaysSinceOrder]);

  const handleApplyRange = () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    if (isNaN(start) || isNaN(end)) {
      alert("⚠️ Valid S.N. Range দিন!");
      return;
    }
    const rangeContacts = filteredContacts.slice(start - 1, end);
    const rangePhones = rangeContacts.map(c => c.phone);
    setStrategicSelectedPhones(rangePhones);
    showToast(`${rangePhones.length} টি লিড সিলেক্ট করা হয়েছে!`);
  };

  const handleStrategicDeployment = async () => {
    if (strategicSelectedPhones.length === 0 || !selectedModId) {
      alert("⚠️ মডারেটর এবং লিড সিলেক্ট করুন!");
      return;
    }
    setIsProcessing(true);
    const selectedFullContacts = contacts.filter(c => strategicSelectedPhones.includes(c.phone));
    
    const existingLeadIds = selectedFullContacts
      .filter(c => c.leadId !== null)
      .map(c => c.leadId!);
      
    const newLeadsToCreate: Lead[] = selectedFullContacts
      .filter(c => c.leadId === null)
      .map((c, idx) => ({
        id: `rev-${Date.now()}-${idx}`,
        businessId: 'system',
        phoneNumber: c.phone, 
        customerName: c.name, 
        address: c.address,
        moderatorId: selectedModId, 
        status: 'pending' as LeadStatus, 
        assignedDate, 
        createdAt: new Date().toISOString()
      }));

    try {
      if (existingLeadIds.length > 0) {
        await onBulkUpdateLeads(existingLeadIds, selectedModId, assignedDate);
      }
      if (newLeadsToCreate.length > 0) {
        await onAssignLeads(newLeadsToCreate);
      }
      const modName = moderators.find(m => String(m.id) === String(selectedModId))?.name || 'Agent';
      showToast(`🎯 ${strategicSelectedPhones.length} লিড ${modName}-কে দেওয়া হয়েছে!`);
      setStrategicSelectedPhones([]);
      setRangeStart('');
      setRangeEnd('');
    } catch (err) { 
      alert("Deployment failed."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        let data: any[] = [];
        
        if (file.name.endsWith('.csv')) {
          const results = Papa.parse(bstr as string, { header: true, skipEmptyLines: true });
          data = results.data;
        } else {
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          data = XLSX.utils.sheet_to_json(ws);
        }
        
        processRawLeads(data);
      } catch (err) {
        console.error("File Read Error:", err);
        alert("Error reading file. Please check format.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const processRawLeads = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      alert("No data found in file.");
      return;
    }

    const newLeads: Lead[] = data.map((row, idx) => {
      // Find phone using multiple potential header names including 'Recipient Phone'
      const phoneRaw = getValueByFlexibleKey(row, ['phone', 'mobile', 'number', 'contact', 'recipientphone', 'customerphone', 'phone_number']);
      const phone = cleanPhoneNumber(phoneRaw);
      
      if (!phone) return null;

      // Find name and address including 'Recipient Name' and 'Recipient Address'
      const name = getValueByFlexibleKey(row, ['name', 'customer', 'customername', 'fullname', 'recipientname', 'receivername']);
      const address = getValueByFlexibleKey(row, ['address', 'location', 'fulladdress', 'recipientaddress', 'receiveraddress']);

      return {
        id: `upl-${Date.now()}-${idx}`,
        businessId: 'system',
        phoneNumber: phone,
        customerName: String(name || 'Prospect').trim(),
        address: String(address || '').trim(),
        moderatorId: '', 
        status: 'pending' as LeadStatus,
        assignedDate: '',
        createdAt: new Date().toISOString()
      };
    }).filter(Boolean) as Lead[];

    if (newLeads.length > 0) {
      onAssignLeads(newLeads);
      showToast(`${newLeads.length} টি লিড সফলভাবে সিস্টেমে যোগ হয়েছে!`);
    } else {
      alert("⚠️ ফাইল থেকে কোনো ভ্যালিড ডাটা পাওয়া যায়নি। নিশ্চিত করুন আপনার এক্সেল শিটে 'Recipient Phone' বা 'Phone' হেডার আছে।");
    }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl font-black uppercase text-[10px] tracking-[0.3em] animate-in slide-in-from-top-4">
          🚀 {successMsg}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Intelligence Command</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 italic">Unit Data Strategy & Deployment</p>
        </div>
        <div className="flex gap-4">
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.xlsx,.xls" />
           <button 
             onClick={() => fileInputRef.current?.click()} 
             disabled={isProcessing}
             className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
           >
             {isProcessing ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : '📁'} 
             Bulk Import Leads
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl border border-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4 italic">Deployment Radar</h3>
            <div className="space-y-5">
               <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-3">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select By S.N. Range</p>
                 <div className="flex gap-2">
                    <input type="number" placeholder="Start" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="w-1/2 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs font-black outline-none focus:border-indigo-500" />
                    <input type="number" placeholder="End" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="w-1/2 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs font-black outline-none focus:border-indigo-500" />
                 </div>
                 <button onClick={handleApplyRange} className="w-full py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600/40 transition-all">Apply Range</button>
               </div>

               <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                 <p className="text-[9px] font-black text-slate-500 uppercase">Selected</p>
                 <p className="text-2xl font-black text-indigo-400">{strategicSelectedPhones.length}</p>
               </div>
               
               <div className="space-y-4 pt-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Assign To Moderator</label>
                 <select value={selectedModId} onChange={(e) => setSelectedModId(e.target.value)} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black outline-none appearance-none">
                   <option value="" className="bg-slate-900 text-white italic">Choose Agent...</option>
                   {moderators.map(m => <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.name}</option>)}
                 </select>
                 <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Duty Date</label>
                 <input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black outline-none" />
               </div>
               <button onClick={handleStrategicDeployment} disabled={isProcessing || strategicSelectedPhones.length === 0} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">
                 {isProcessing ? 'Processing...' : 'Execute Assignment'}
               </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 italic">Strategic Filters</h3>
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Last Order (Min Days)</label>
                 <input type="number" value={minDaysSinceOrder} onChange={(e) => setMinDaysSinceOrder(e.target.value)} placeholder="E.g. 30" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none" />
               </div>
               <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Last Called (Min Days)</label>
                 <input type="number" value={minDaysSinceCall} onChange={(e) => setMinDaysSinceCall(e.target.value)} placeholder="E.g. 15" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none" />
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
              <input type="text" placeholder="Search Identity (Name or Phone)..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className="flex-1 px-8 py-5 bg-slate-50 border border-slate-200 rounded-[2.5rem] text-[11px] font-black outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"/>
              <div className="flex bg-slate-100 p-2 rounded-[2rem] border border-slate-200 overflow-x-auto">
                {['all', 'unassigned', 'pending', 'confirmed'].map(stat => (
                  <button key={stat} onClick={() => setStatusFilter(stat as any)} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase transition-all tracking-widest whitespace-nowrap ${statusFilter === stat ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>{stat}</button>
                ))}
              </div>
           </div>

           <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950">
                    <tr>
                      <th className="px-4 py-7 text-[9px] font-black text-slate-500 uppercase text-center border-r border-white/5">S.N.</th>
                      <th className="px-6 py-7 text-[9px] font-black text-slate-500 uppercase text-center border-r border-white/5">
                        <input type="checkbox" onChange={(e) => {
                          if (e.target.checked) setStrategicSelectedPhones(filteredContacts.map(c => c.phone));
                          else setStrategicSelectedPhones([]);
                        }} className="w-5 h-5" />
                      </th>
                      <th className="px-10 py-7 text-[9px] font-black text-slate-500 uppercase tracking-widest">Client Identity</th>
                      <th className="px-10 py-7 text-[9px] font-black text-slate-500 uppercase tracking-widest">Agent Handle</th>
                      <th className="px-10 py-7 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Operational Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredContacts.length === 0 ? (
                      <tr><td colSpan={5} className="py-24 text-center opacity-20 italic font-black uppercase tracking-widest">No Records in Radar</td></tr>
                    ) : (
                      filteredContacts.map((contact, idx) => {
                        const modName = moderators.find(m => String(m.id) === String(contact.moderatorId))?.name || 'Unassigned';
                        return (
                          <tr key={contact.phone} className={`group hover:bg-slate-50/50 transition-all ${strategicSelectedPhones.includes(contact.phone) ? 'bg-indigo-50/30' : ''}`}>
                            <td className="px-4 py-8 text-center text-[10px] font-black text-slate-400 border-r border-slate-50 italic">{idx + 1}</td>
                            <td className="px-6 py-8 text-center border-r border-slate-50">
                               <input type="checkbox" checked={strategicSelectedPhones.includes(contact.phone)} onChange={() => { setStrategicSelectedPhones(prev => prev.includes(contact.phone) ? prev.filter(p => p !== contact.phone) : [...prev, contact.phone]); }} className="w-6 h-6 rounded-xl cursor-pointer" />
                            </td>
                            <td className="px-10 py-8">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase">{contact.name.charAt(0)}</div>
                                  <div>
                                    <p className="font-black text-slate-900 text-base font-mono tracking-tighter">{contact.phone}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate max-w-[150px]">{contact.name}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-8">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${contact.moderatorId && contact.moderatorId !== 'null' ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                                  <p className={`text-[11px] font-black uppercase tracking-widest ${contact.moderatorId && contact.moderatorId !== 'null' ? 'text-indigo-600' : 'text-slate-400 italic'}`}>{modName}</p>
                               </div>
                            </td>
                            <td className="px-10 py-8 text-right">
                               <div className="flex flex-col items-end">
                                  <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${contact.currentStatus === 'unassigned' ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                    {contact.currentStatus}
                                  </span>
                                  {contact.lastCallDate && <p className="text-[7px] font-black text-slate-300 uppercase mt-2 tracking-widest italic">Last Call: {new Date(contact.lastCallDate).toLocaleDateString()}</p>}
                               </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LeadManager;
