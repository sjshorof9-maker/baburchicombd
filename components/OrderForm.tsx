
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Order, OrderStatus, User, OrderItem, Lead, CourierConfig } from '../types';
import { fetchCustomerSuccessRate } from '../services/courierService';

interface OrderFormProps {
  products: Product[];
  currentUser: User;
  onOrderCreate: (order: Order) => Promise<void>;
  leads?: Lead[];
  allOrders?: Order[];
  courierConfig: CourierConfig;
}

const OrderForm: React.FC<OrderFormProps> = ({ products, currentUser, onOrderCreate, leads = [], allOrders = [], courierConfig }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState<'inside' | 'outside'>('inside');
  const [selectedItems, setSelectedItems] = useState<{productId: string, quantity: number}[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successRate, setSuccessRate] = useState<string | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const deliveryCharges = { inside: 70, outside: 130 };

  useEffect(() => {
    const cleanPhone = customerPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length === 11) {
      setIsLoadingRate(true);
      fetchCustomerSuccessRate(cleanPhone, courierConfig).then(rate => {
        setSuccessRate(rate);
        setIsLoadingRate(false);
      }).catch(() => {
        setSuccessRate("N/A");
        setIsLoadingRate(false);
      });

      const existingOrder = allOrders.find(o => o.customerPhone.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
      if (existingOrder) {
        setCustomerName(existingOrder.customerName);
        setCustomerAddress(existingOrder.customerAddress);
        setDeliveryRegion(existingOrder.deliveryRegion === 'inside' ? 'inside' : 'outside');
        return;
      }
      const existingLead = leads.find(l => l.phoneNumber.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
      if (existingLead) {
        if (existingLead.customerName) setCustomerName(existingLead.customerName);
        if (existingLead.address) setCustomerAddress(existingLead.address);
      }
    } else {
      setSuccessRate(null);
    }
  }, [customerPhone, allOrders, leads, courierConfig]);

  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }, [selectedItems, products]);

  const grandTotal = useMemo(() => {
    const total = subtotal + deliveryCharges[deliveryRegion];
    return Math.max(0, total - (advanceAmount || 0));
  }, [subtotal, deliveryRegion, advanceAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      alert("⚠️ অন্তত একটি প্রোডাক্ট সিলেক্ট করুন।");
      return;
    }
    
    if (isSubmitting) return;

    const phoneClean = customerPhone.replace(/\D/g, '');
    if (phoneClean.length !== 11) {
      alert("⚠️ সঠিক ১১ ডিজিটের ফোন নম্বর দিন।");
      return;
    }

    if (customerAddress.trim().length < 5) {
      alert("⚠️ কুরিয়ারের জন্য বিস্তারিত ঠিকানা প্রয়োজন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems: OrderItem[] = selectedItems.map((item, idx) => {
        const product = products.find(p => p.id === item.productId)!;
        return {
          id: `oi-${Date.now()}-${idx}`,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price
        };
      });

      const uniqueId = `ORD-${Date.now().toString().slice(-6)}`;

      // Fix: Add businessId and ensure advanceAmount is included in types.ts
      const newOrder: Order = {
        id: uniqueId,
        businessId: currentUser.businessId,
        moderatorId: currentUser.id,
        customerName: customerName.trim(),
        customerPhone: phoneClean,
        customerAddress: customerAddress.trim(),
        deliveryRegion: deliveryRegion as any,
        deliveryCharge: deliveryCharges[deliveryRegion],
        items: orderItems,
        totalAmount: subtotal,
        advanceAmount: advanceAmount || 0,
        grandTotal: grandTotal,
        status: OrderStatus.PENDING,
        createdAt: new Date().toISOString(),
        notes: notes.trim(),
        successRate: successRate || '0%'
      };

      await onOrderCreate(newOrder);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset Form
      setCustomerName(''); 
      setCustomerPhone(''); 
      setCustomerAddress('');
      setSelectedItems([]); 
      setAdvanceAmount(0); 
      setNotes(''); 
      setSuccessRate(null);
    } catch (err: any) {
      // Error handled in App.tsx alert, just stop loading here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-10 py-5 rounded-3xl shadow-2xl font-black uppercase text-xs tracking-widest animate-in slide-in-from-top-4">
          🎊 Order Confirmed & Deployed!
        </div>
      )}

      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Asset Intake</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Operational Unit Command</p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl hidden md:block border border-white/5 shadow-xl">
           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Authorized Agent</p>
           <p className="text-xs font-black italic">{currentUser.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
             {successRate && successRate !== "N/A" && (
               <div className={`absolute top-0 right-0 px-8 py-2 text-[10px] font-black uppercase tracking-widest text-white transform rotate-45 translate-x-10 translate-y-5 shadow-lg ${
                 parseFloat(successRate) < 50 ? 'bg-rose-500' : 'bg-emerald-500'
               }`}>
                 {successRate.split('%')[0]}% Success
               </div>
             )}

             <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shadow-lg">1</div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Shipping Asset Identity</h3>
             </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phone Pulse</label>
                  {isLoadingRate && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>}
                </div>
                <input 
                  required 
                  type="tel" 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                  placeholder="017XXXXXXXX" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Receiver Name</label>
                <input 
                  required 
                  type="text" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                  placeholder="Full Identity" 
                />
              </div>

              {successRate && (
                <div className="md:col-span-2 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4 animate-in fade-in duration-300">
                   <div className="text-2xl">📊</div>
                   <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Steadfast Intelligence Feed</p>
                      <p className="text-sm font-black text-indigo-900">Success Rate: {successRate}</p>
                   </div>
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Detail Asset Location</label>
                 <textarea 
                  required 
                  rows={2} 
                  value={customerAddress} 
                  onChange={(e) => setCustomerAddress(e.target.value)} 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:bg-white transition-all resize-none shadow-inner" 
                  placeholder="House, Road, Area, District..." 
                 />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                {['inside', 'outside'].map(r => (
                  <button key={r} type="button" onClick={() => setDeliveryRegion(r as any)} className={`py-5 rounded-2xl text-[10px] font-black uppercase border transition-all ${deliveryRegion === r ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 hover:border-slate-300'}`}>
                    {r === 'inside' ? 'Inside CTG' : 'Outside CTG'} (৳{deliveryCharges[r as keyof typeof deliveryCharges]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg">2</div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Inventory Allocation</h3>
            </div>
            <div className="space-y-4">
              {selectedItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 animate-in zoom-in-95 duration-200">
                  <select value={item.productId} onChange={(e) => {
                    const newItems = [...selectedItems];
                    newItems[index].productId = e.target.value;
                    setSelectedItems(newItems);
                  }} className="flex-1 bg-white p-3 rounded-xl font-bold text-sm outline-none border border-slate-200">
                    <option value="" disabled>প্রোডাক্ট সিলেক্ট করুন</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>)}
                  </select>
                  <input type="number" value={item.quantity} onChange={(e) => {
                    const newItems = [...selectedItems];
                    newItems[index].quantity = parseInt(e.target.value) || 1;
                    setSelectedItems(newItems);
                  }} className="w-20 p-3 rounded-xl font-black text-center border border-slate-200" min="1" />
                  <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="text-rose-500 font-bold p-2 hover:bg-rose-50 rounded-lg transition-colors">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setSelectedItems([...selectedItems, {productId: products[0]?.id || '', quantity: 1}])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-[10px] uppercase hover:bg-slate-50 transition-all">+ Add Product Asset</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#0f172a] p-10 rounded-[3.5rem] text-white shadow-2xl sticky top-8 border border-white/5">
            <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
               <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-xl font-black shadow-orange-500/20 shadow-lg">3</div>
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Operational Invoice</h3>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>Subtotal</span><span>৳{subtotal}</span></div>
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>Shipping</span><span>৳{deliveryCharges[deliveryRegion]}</span></div>
              
              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 italic underline decoration-orange-500/30">Advance Protocol (৳)</label>
                <input type="number" value={advanceAmount || ''} onChange={(e) => setAdvanceAmount(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-2xl outline-none focus:border-orange-500 text-orange-500 shadow-inner" placeholder="0" />
              </div>

              <div className="pt-8 border-t border-white/10">
                <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1 italic">Collectable COD Asset</p>
                <p className="text-5xl font-black tracking-tighter italic">৳{grandTotal.toLocaleString()}</p>
              </div>

              <div className="space-y-3 mt-8">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 italic">Instruction Meta</label>
                 <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 min-h-[100px] resize-none" placeholder="Notes for dispatch team..."/>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || selectedItems.length === 0} 
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-50 mt-4 group"
              >
                {isSubmitting ? 'Syncing...' : (
                  <span className="flex items-center justify-center gap-2">
                    🚀 Dispatch Operation <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
