
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, User, Product, CourierConfig, UserRole } from '../types';
import { STATUS_COLORS } from '../constants';
import { syncOrderWithCourier, fetchOrderStatus } from '../services/courierService';
import InvoiceModal from './InvoiceModal';
import * as XLSX from 'xlsx';

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
  const isAdmin = currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.OWNER;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    let list = isAdmin ? [...orders] : orders.filter(o => String(o.moderatorId) === String(currentUser.id));
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(o => o.customerPhone.includes(s) || o.customerName.toLowerCase().includes(s) || o.id.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, isAdmin, currentUser.id, searchTerm, statusFilter]);

  const handleManualSync = async (order: Order) => {
    if (!isAdmin) return;
    setSyncingId(order.id);
    try {
      if (!order.steadfastId) {
        const res = await syncOrderWithCourier(order, courierConfig);
        onUpdateStatus(order.id, OrderStatus.CONFIRMED, { id: res.consignmentId, status: res.status });
      } else {
        const res = await fetchOrderStatus(order.steadfastId, courierConfig);
        onUpdateStatus(order.id, res.status, { id: order.steadfastId, status: res.rawStatus });
      }
    } catch (err: any) {
      alert(`❌ Error for Order ${order.id}: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleBulkSync = async () => {
    if (!isAdmin || selectedOrders.length === 0) return;
    setIsBulkSyncing(true);
    let successCount = 0;
    
    for (const id of selectedOrders) {
      const order = orders.find(o => o.id === id);
      if (order && !order.steadfastId) {
        try {
          const res = await syncOrderWithCourier(order, courierConfig);
          onUpdateStatus(order.id, OrderStatus.CONFIRMED, { id: res.consignmentId, status: res.status });
          successCount++;
        } catch (err) {
          console.error(`Bulk sync failed for ${id}`, err);
        }
      }
    }
    
    alert(`🛰️ Bulk operation complete! ${successCount} orders booked.`);
    setIsBulkSyncing(false);
    setSelectedOrders([]);
  };

  const exportToExcel = () => {
    const data = filteredOrders.filter(o => selectedOrders.includes(o.id)).map((o, idx) => ({
      "SL": idx + 1,
      "Order ID": o.id,
      "Customer": o.customerName,
      "Phone": o.customerPhone,
      "Address": o.customerAddress,
      "COD": o.grandTotal,
      "Status": o.status.toUpperCase(),
      "Consignment": o.steadfastId || 'N/A',
      "Moderator": moderators.find(m => String(m.id) === String(o.moderatorId))?.name || 'Unknown'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `Orders_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      {invoiceToPrint && <InvoiceModal order={invoiceToPrint} products={products} logoUrl={logoUrl} onClose={() => setInvoiceToPrint(null)} />}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Order Buffer</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Scanning {filteredOrders.length} Records</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 md:w-64 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-xs shadow-sm" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase outline-none shadow-sm cursor-pointer">
            <option value="all">All Status</option>
            {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {isAdmin && selectedOrders.length > 0 && (
        <div className="bg-slate-950 p-6 rounded-[2rem] flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2">
           <p className="text-white text-[10px] font-black uppercase tracking-widest ml-4">{selectedOrders.length} Orders Selected</p>
           <div className="flex gap-4">
             <button onClick={handleBulkSync} disabled={isBulkSyncing} className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50">
               {isBulkSyncing ? 'Processing...' : '🚀 Bulk Book Courier'}
             </button>
             <button onClick={exportToExcel} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Download Excel</button>
           </div>
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-8 text-[9px] font-black text-slate-400 uppercase text-center italic border-r">
                   <input type="checkbox" onChange={(e) => setSelectedOrders(e.target.checked ? filteredOrders.map(o => o.id) : [])} className="w-4 h-4" />
                </th>
                <th className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
                <th className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Value</th>
                <th className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Moderator</th>
                <th className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order, index) => {
                const isSyncing = syncingId === order.id;
                const isSelected = selectedOrders.includes(order.id);
                const moderator = moderators.find(m => String(m.id) === String(order.moderatorId));
                return (
                  <tr key={order.id} className={`group hover:bg-slate-50/50 transition-all ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-10 text-center text-[11px] font-black text-slate-300 italic border-r">
                      <input type="checkbox" checked={isSelected} onChange={() => setSelectedOrders(prev => isSelected ? prev.filter(i => i !== order.id) : [...prev, order.id])} className="w-4 h-4 rounded border-slate-200" />
                    </td>
                    <td className="px-10 py-10">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase italic">{order.customerName.charAt(0)}</div>
                         <div>
                           <p className="font-black text-slate-900 text-sm uppercase italic">{order.customerName}</p>
                           <p className="text-[10px] font-bold text-indigo-500 mt-1 font-mono">{order.customerPhone}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-10 text-center">
                      <p className="text-lg font-black text-slate-900 tracking-tighter italic">৳{order.grandTotal}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">COD Impact</p>
                    </td>
                    <td className="px-10 py-10 text-center">
                       <p className="text-xs font-black text-slate-700">{moderator?.name || 'Unknown'}</p>
                       <p className="text-[8px] font-black text-slate-400 uppercase">Agent</p>
                    </td>
                    <td className="px-10 py-10 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${STATUS_COLORS[order.status]}`}>
                           {order.status}
                         </span>
                         {order.steadfastId && (
                           <div className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                             <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">CID:</span>
                             <span className="text-[9px] font-black text-indigo-600 font-mono italic">{order.steadfastId}</span>
                           </div>
                         )}
                       </div>
                    </td>
                    <td className="px-10 py-10 text-right">
                       <div className="flex justify-end gap-3">
                          <button onClick={() => setInvoiceToPrint(order)} className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-lg shadow-sm">🖨️</button>
                          {isAdmin && (
                            <button 
                              onClick={() => handleManualSync(order)} 
                              disabled={isSyncing}
                              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${order.steadfastId ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}
                            >
                              {isSyncing ? '...' : (order.steadfastId ? '🛰️ Sync' : '🚀 Book')}
                            </button>
                          )}
                       </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderList;
