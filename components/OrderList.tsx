
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, User, Product, CourierConfig, UserRole } from '../types';
import { STATUS_COLORS } from '../constants';
import { syncOrderWithCourier } from '../services/courierService';

interface OrderListProps {
  orders: Order[];
  currentUser: User;
  products: Product[];
  moderators: User[];
  courierConfig: CourierConfig;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, courierData?: { id: string, status: string }) => void;
  onBulkUpdateStatus: (orderIds: string[], newStatus: OrderStatus) => void;
  logoUrl?: string | null;
}

const OrderList: React.FC<OrderListProps> = ({ orders, currentUser, products, moderators, courierConfig, onUpdateStatus, onBulkUpdateStatus, logoUrl }) => {
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  const filteredOrders = useMemo(() => {
    // Determine the base list: Admins see all, Moderators only see theirs
    let list = isAdmin ? [...orders] : orders.filter(o => String(o.moderatorId) === String(currentUser.id));
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(o => 
        o.customerPhone.includes(s) || 
        o.customerName.toLowerCase().includes(s) || 
        o.id.toLowerCase().includes(s)
      );
    }
    
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (regionFilter !== 'all') list = list.filter(o => o.deliveryRegion === regionFilter);

    // Sort by creation date descending
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, isAdmin, currentUser.id, searchTerm, statusFilter, regionFilter]);

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedOrders.length === filteredOrders.length) setSelectedOrders([]);
    else setSelectedOrders(filteredOrders.map(o => o.id));
  };

  const isNewOrder = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 300000; // 5 minutes mark for "New"
  };

  const handleBulkStatusChange = (status: OrderStatus) => {
    if (selectedOrders.length === 0) return;
    onBulkUpdateStatus(selectedOrders, status);
    setSelectedOrders([]);
  };

  const handleManualSync = async (order: Order) => {
    if (!isAdmin || order.steadfastId) return;
    setSyncingId(order.id);
    try {
      const res = await syncOrderWithCourier(order, courierConfig);
      onUpdateStatus(order.id, OrderStatus.CONFIRMED, { id: res.consignmentId, status: res.status });
    } catch (err: any) {
      alert("Sync Failed: " + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleBulkSync = async () => {
    if (selectedOrders.length === 0 || isBulkSyncing) return;
    if (!confirm(`Are you sure you want to dispatch ${selectedOrders.length} orders to Steadfast?`)) return;

    setIsBulkSyncing(true);
    let successCount = 0;
    
    for (const orderId of selectedOrders) {
      const order = orders.find(o => o.id === orderId);
      if (order && !order.steadfastId) {
        try {
          const res = await syncOrderWithCourier(order, courierConfig);
          onUpdateStatus(order.id, OrderStatus.CONFIRMED, { id: res.consignmentId, status: res.status });
          successCount++;
        } catch (err) {
          console.error(`Failed to sync ${orderId}`);
        }
      }
    }
    
    alert(`Successfully dispatched ${successCount} orders to Steadfast.`);
    setIsBulkSyncing(false);
    setSelectedOrders([]);
  };

  return (
    <div className="space-y-8 pb-32 relative animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Advanced Logistics</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{filteredOrders.length} Operations Ready</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search phone or name..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="flex-1 md:w-56 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 font-bold text-xs shadow-sm transition-all" 
          />
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase outline-none shadow-sm">
              <option value="all">All Status</option>
              {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedOrders.length > 0 && isAdmin && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 p-6 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-6 border border-white/10 animate-in slide-in-from-bottom-20 duration-500 min-w-[320px] md:min-w-0">
          <div className="flex items-center gap-4 md:border-r border-white/10 md:pr-6">
             <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-600/20">{selectedOrders.length}</div>
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Operations<br/>Selected</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Action Protocol</span>
               <div className="flex items-center gap-3">
                  <select 
                    onChange={(e) => e.target.value && handleBulkStatusChange(e.target.value as OrderStatus)} 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="" className="text-slate-900 italic">Bulk Update...</option>
                    {Object.values(OrderStatus).map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
                  </select>
                  
                  <button 
                    onClick={handleBulkSync}
                    disabled={isBulkSyncing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isBulkSyncing ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : '🚚 Dispatch All'}
                  </button>
               </div>
             </div>
             <button onClick={() => setSelectedOrders([])} className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-400 tracking-widest ml-4 px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Select All Toggle */}
      <div className="bg-white px-8 py-5 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-sm">
        <input 
          type="checkbox" 
          checked={selectedOrders.length > 0 && selectedOrders.length === filteredOrders.length} 
          onChange={selectAll} 
          className="w-5 h-5 rounded-lg border-slate-200 text-orange-600 focus:ring-orange-500 cursor-pointer" 
        />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Master Operations Control</span>
      </div>

      {/* Order Cards Grid */}
      <div className="grid grid-cols-1 gap-5">
        {filteredOrders.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100 italic">
             <span className="text-5xl block mb-6 opacity-20">📦</span>
             <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">No Operational Records Found</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isSyncing = syncingId === order.id;
            const hasSteadfast = !!order.steadfastId;
            const isSelected = selectedOrders.includes(order.id);
            const fresh = isNewOrder(order.createdAt);

            return (
              <div 
                key={order.id} 
                className={`group relative bg-white p-8 rounded-[3rem] shadow-sm border transition-all duration-500 flex flex-col md:flex-row items-start md:items-center gap-8 ${isSelected ? 'ring-4 ring-indigo-500/10 border-indigo-500 bg-indigo-50/5' : 'border-slate-100 hover:border-indigo-200'}`}
              >
                {fresh && (
                  <div className="absolute -top-3 left-10 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl animate-pulse">
                    🆕 NEW
                  </div>
                )}
                
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => toggleSelect(order.id)} 
                    className="w-6 h-6 rounded-xl border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                  />
                  
                  <div className="flex items-center gap-5 flex-1 md:flex-none">
                     <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex flex-col items-center justify-center border border-white/5 shadow-xl transition-transform group-hover:scale-105">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">ID</span>
                        <span className="text-xs font-black text-white">{order.id.split('-')[1] || order.id.slice(-5)}</span>
                     </div>
                     <div>
                        <p className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5">{order.customerName}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-[11px] font-bold text-slate-400 font-mono tracking-tighter">{order.customerPhone}</p>
                           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 w-full">
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Region</p>
                     <p className="text-xs font-black text-slate-800 capitalize">
                       📍 {order.deliveryRegion}
                     </p>
                  </div>

                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Impact</p>
                     <p className="text-base font-black text-slate-900 tracking-tighter">৳{order.grandTotal.toLocaleString()}</p>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Operational Status</p>
                     <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${STATUS_COLORS[order.status] || 'bg-slate-50'}`}>
                       {order.status}
                     </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-50 pt-6 md:pt-0 md:pl-8">
                   {isAdmin && (
                     <div className="flex flex-col gap-3 w-full md:w-auto">
                        <select 
                          value={order.status} 
                          onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className="px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/5 cursor-pointer shadow-sm"
                        >
                          {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                        
                        {!hasSteadfast && (
                          <button 
                            onClick={() => handleManualSync(order)}
                            disabled={isSyncing}
                            className="w-full bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                          >
                            {isSyncing ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <><span>🚚</span> Dispatch</>
                            )}
                          </button>
                        )}
                        {hasSteadfast && (
                           <div className="px-5 py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl text-[9px] font-black uppercase tracking-tighter text-center">
                             SF ID: {order.steadfastId}
                           </div>
                        )}
                     </div>
                   )}
                   
                   {!isAdmin && (
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                        Secured Record
                      </div>
                   )}

                   <button className="w-14 h-14 bg-white border border-slate-200 text-slate-900 rounded-[1.5rem] flex items-center justify-center text-xl shadow-sm hover:bg-slate-50 hover:border-indigo-300 transition-all active:scale-95">
                     👁️
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderList;
