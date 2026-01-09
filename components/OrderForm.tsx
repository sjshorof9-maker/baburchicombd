
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Order, OrderStatus, User, OrderItem, Lead } from '../types';

interface OrderFormProps {
  products: Product[];
  currentUser: User;
  onOrderCreate: (order: Order) => Promise<void>;
  leads?: Lead[];
  allOrders?: Order[];
}

const OrderForm: React.FC<OrderFormProps> = ({ products, currentUser, onOrderCreate, leads = [], allOrders = [] }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState<'inside' | 'outside'>('inside');
  const [selectedItems, setSelectedItems] = useState<{productId: string, quantity: number}[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [lookupData, setLookupData] = useState<{
    status: 'none' | 'found-lead' | 'found-customer';
    ltv: number;
    orderCount: number;
    isVip: boolean;
  }>({ status: 'none', ltv: 0, orderCount: 0, isVip: false });

  const deliveryCharges = {
    inside: 70,
    outside: 130
  };

  useEffect(() => {
    const phone = customerPhone.trim();
    if (phone.length >= 11) {
      const customerOrders = allOrders.filter(o => o.customerPhone === phone);
      
      if (customerOrders.length > 0) {
        const lastOrder = customerOrders[0];
        if (!customerName) setCustomerName(lastOrder.customerName);
        if (!customerAddress) setCustomerAddress(lastOrder.customerAddress);
        
        const ltv = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        setLookupData({
          status: 'found-customer',
          ltv,
          orderCount: customerOrders.length,
          isVip: customerOrders.length >= 3 || ltv > 5000
        });
        return;
      }

      const matchLead = leads.find(l => l.phoneNumber.includes(phone));
      if (matchLead) {
        if (matchLead.customerName && !customerName) setCustomerName(matchLead.customerName);
        if (matchLead.address && !customerAddress) setCustomerAddress(matchLead.address);
        setLookupData({ status: 'found-lead', ltv: 0, orderCount: 0, isVip: false });
      } else {
        setLookupData({ status: 'none', ltv: 0, orderCount: 0, isVip: false });
      }
    } else {
      setLookupData({ status: 'none', ltv: 0, orderCount: 0, isVip: false });
    }
  }, [customerPhone, leads, allOrders]);

  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }, [selectedItems, products]);

  const grandTotal = useMemo(() => {
    return (subtotal + deliveryCharges[deliveryRegion]) - (advanceAmount || 0);
  }, [subtotal, deliveryRegion, advanceAmount]);

  const addItem = () => {
    const available = products.find(p => p.stock > 0);
    if (!available) {
      alert("⚠️ স্টকে কোনো প্রোডাক্ট নেই!");
      return;
    }
    setSelectedItems(prev => [...prev, { productId: available.id, quantity: 1 }]);
  };

  const updateItem = (index: number, productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let finalQty = Math.max(1, quantity);
    if (finalQty > product.stock) {
      alert(`⚠️ Only ${product.stock} units available for ${product.name}`);
      finalQty = product.stock;
    }

    const newItems = [...selectedItems];
    newItems[index] = { productId, quantity: finalQty };
    setSelectedItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const items: OrderItem[] = selectedItems.map((item, idx) => {
        const product = products.find(p => p.id === item.productId)!;
        return {
          id: `oi-${Date.now()}-${idx}`,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price
        };
      });

      const newOrder: Order = {
        id: `ORD-${Math.floor(100000 + Math.random() * 899999)}`,
        moderatorId: currentUser.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryRegion,
        deliveryCharge: deliveryCharges[deliveryRegion],
        items,
        totalAmount: subtotal,
        advanceAmount: advanceAmount || 0,
        grandTotal: grandTotal,
        status: OrderStatus.PENDING,
        createdAt: new Date().toISOString(),
        notes: notes.trim()
      };

      await onOrderCreate(newOrder);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setSelectedItems([]);
      setAdvanceAmount(0);
      setNotes('');
    } catch (err) {
      alert("অর্ডার তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-700 relative">
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl font-black uppercase text-[10px] tracking-widest animate-in slide-in-from-top-4">
          <span className="mr-3">🎊</span> Order Placed Successfully!
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Advanced Order</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Intelligent Order Hub v4.0</p>
        </div>
        
        {lookupData.status !== 'none' && (
          <div className={`flex items-center gap-4 px-6 py-4 rounded-[2.5rem] border shadow-2xl animate-in slide-in-from-right-4 duration-500 ${
            lookupData.isVip ? 'bg-slate-950 text-white border-white/10' : 'bg-white text-slate-900 border-slate-100'
          }`}>
             <div className="flex flex-col text-xs">
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Identity Found</span>
               <div className="flex items-center gap-2">
                  <span className="font-black">{lookupData.status === 'found-customer' ? 'Elite Client' : 'Fresh Lead'}</span>
                  {lookupData.isVip && <span className="bg-orange-500 text-white text-[7px] px-1.5 py-0.5 rounded-lg font-black uppercase tracking-tighter">VIP Member</span>}
               </div>
             </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 border-b border-slate-50 pb-4 italic">Customer Protocol</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input required type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-6 py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none transition-all font-black text-xl tracking-tighter" placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
                <input required type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-6 py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none transition-all font-black text-sm" placeholder="Full Name" />
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shipping Address</label>
                <textarea required rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full px-6 py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none transition-all font-bold resize-none text-sm" placeholder="Full Address..." />
              </div>

              <div className="md:col-span-2 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-4 italic">Delivery Region</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'inside', label: 'Inside Chittagong', price: 70 },
                    { id: 'outside', label: 'Outside Chittagong', price: 130 }
                  ].map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => setDeliveryRegion(region.id as any)}
                      className={`group py-4 md:py-5 rounded-[2rem] text-[10px] font-black uppercase transition-all border relative overflow-hidden ${
                        deliveryRegion === region.id 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-105 z-10' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="relative z-10">{region.label}</span>
                      <span className={`block text-[8px] mt-1.5 font-bold ${deliveryRegion === region.id ? 'text-indigo-400' : 'opacity-40'}`}>৳{region.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Item Selection</h3>
              <button type="button" onClick={addItem} className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-6 md:px-8 py-3 md:py-3.5 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">+ Add Product</button>
            </div>
            
            <div className="space-y-4 md:space-y-6">
              {selectedItems.map((item, index) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={index} className="flex flex-col md:flex-row gap-4 md:gap-6 items-center bg-slate-50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 group">
                    <div className="flex-1 w-full">
                      <select value={item.productId} onChange={(e) => updateItem(index, e.target.value, item.quantity)} className="w-full px-5 py-3 md:py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs outline-none appearance-none cursor-pointer group-hover:border-indigo-200 transition-colors">
                        {products.map(p => (
                          <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                            {p.name} — ৳{p.price}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <button type="button" onClick={() => updateItem(index, item.productId, item.quantity - 1)} className="px-4 md:px-5 py-2.5 md:py-3.5 font-black text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">−</button>
                        <span className="px-4 md:px-5 font-black text-slate-800 text-sm w-10 md:w-12 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => updateItem(index, item.productId, item.quantity + 1)} className="px-4 md:px-5 py-2.5 md:py-3.5 font-black text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all active:scale-90">+</button>
                      </div>
                      <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm">🗑️</button>
                    </div>
                  </div>
                );
              })}
              {selectedItems.length === 0 && (
                <div className="text-center py-10 md:py-20 opacity-20 italic">
                  <span className="text-5xl block mb-6">🛒</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Cart is Empty</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-950 p-8 md:p-10 rounded-[3rem] text-white shadow-2xl sticky top-8 border border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 md:mb-10 border-b border-white/5 pb-4 italic">Order Summary</h3>
            
            <div className="space-y-6 md:space-y-8">
              <div className="flex justify-between items-center group">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subtotal</span>
                <span className="text-base md:text-lg font-black tracking-tighter">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Delivery Charge</span>
                <span className="text-base md:text-lg font-black tracking-tighter">৳{deliveryCharges[deliveryRegion]}</span>
              </div>
              
              <div className="pt-6 border-t border-white/5 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block ml-1">Advance Payment</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">৳</span>
                   <input 
                     type="number" 
                     value={advanceAmount || ''} 
                     onChange={(e) => setAdvanceAmount(Number(e.target.value))} 
                     className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-black focus:border-indigo-500 focus:bg-white/10 outline-none transition-all" 
                     placeholder="0"
                   />
                </div>
              </div>

              <div className="pt-8 border-t border-white/10 flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 italic">Cash on Delivery</span>
                <div className="flex justify-between items-end">
                   <span className="text-4xl md:text-5xl font-black tracking-tighter">৳{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-8">
                <button 
                  type="submit" 
                  disabled={isSubmitting || selectedItems.length === 0}
                  className={`w-full font-black py-5 md:py-6 rounded-3xl transition-all shadow-2xl uppercase tracking-[0.2em] text-[10px] md:text-[11px] flex items-center justify-center gap-4 relative overflow-hidden group ${
                    isSubmitting || selectedItems.length === 0 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <><span>🚀</span> Create Order</>
                  )}
                </button>
              </div>

              <div className="pt-8 space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 block italic">Internal Notes</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-xs text-slate-300 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all resize-none font-medium h-24"
                  placeholder="Private instructions..."
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
