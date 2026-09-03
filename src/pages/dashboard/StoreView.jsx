import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, doc, getDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { ShoppingCart, Settings, Plus, Loader2, Search, CheckCircle, Tag } from 'lucide-react';
import { formatNaira } from '../../utils/prospectusFees';

// Default categories
const ITEM_CATEGORIES = [
  'Uniforms',
  'P.E. Wear',
  'Jackets',
  'Sports Wear',
  'Exercise Books',
  'Textbooks'
];

const StoreView = () => {
  const [activeTab, setActiveTab] = useState('sell'); // 'sell', 'inventory', 'history'
  const [inventory, setInventory] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Sale State
  const [selectedCategory, setSelectedCategory] = useState(ITEM_CATEGORIES[0]);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [studentRef, setStudentRef] = useState('');
  const [savingSale, setSavingSale] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState('');

  // Inventory State
  const [invCategory, setInvCategory] = useState(ITEM_CATEGORIES[0]);
  const [invItemName, setInvItemName] = useState('');
  const [invPrice, setInvPrice] = useState('');
  const [savingInv, setSavingInv] = useState(false);

  useEffect(() => {
    fetchStoreData();
  }, []);

  // Update unit price when item name changes (if exists in inventory)
  useEffect(() => {
    if (inventory[selectedCategory] && inventory[selectedCategory][itemName]) {
      setUnitPrice(inventory[selectedCategory][itemName]);
    } else {
      setUnitPrice('');
    }
  }, [itemName, selectedCategory, inventory]);

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Inventory Pricing
      const invDoc = await getDoc(doc(db, 'settings', 'store_inventory'));
      if (invDoc.exists()) {
        setInventory(invDoc.data());
      } else {
        setInventory({});
      }

      // 2. Fetch Recent Sales
      const salesQ = query(collection(db, 'store_sales'), orderBy('createdAt', 'desc'), limit(50));
      const salesSnap = await getDocs(salesQ);
      const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSalesHistory(sales);
    } catch (err) {
      console.error("Error fetching store data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!itemName || !unitPrice || quantity < 1) return;
    
    setSavingSale(true);
    try {
      const totalAmount = Number(unitPrice) * Number(quantity);
      await addDoc(collection(db, 'store_sales'), {
        category: selectedCategory,
        itemName,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalAmount,
        studentRef: studentRef || 'Walk-in / Cash',
        createdAt: serverTimestamp(),
      });
      
      setSaleSuccess('Sale recorded successfully!');
      setTimeout(() => setSaleSuccess(''), 3000);
      
      setItemName('');
      setQuantity(1);
      setUnitPrice('');
      setStudentRef('');
      
      fetchStoreData(); // Refresh history
    } catch (err) {
      console.error("Error recording sale:", err);
      alert("Failed to record sale.");
    } finally {
      setSavingSale(false);
    }
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    if (!invItemName || !invPrice) return;

    setSavingInv(true);
    try {
      const updatedInv = { ...inventory };
      if (!updatedInv[invCategory]) {
        updatedInv[invCategory] = {};
      }
      updatedInv[invCategory][invItemName] = Number(invPrice);

      await setDoc(doc(db, 'settings', 'store_inventory'), updatedInv);
      setInventory(updatedInv);
      
      setInvItemName('');
      setInvPrice('');
      alert("Item price saved to inventory!");
    } catch (err) {
      console.error("Error saving inventory:", err);
      alert("Failed to save inventory.");
    } finally {
      setSavingInv(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button 
          onClick={() => setActiveTab('sell')} 
          className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'sell' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <ShoppingCart size={16} className="inline mr-2" /> Point of Sale
        </button>
        <button 
          onClick={() => setActiveTab('inventory')} 
          className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Settings size={16} className="inline mr-2" /> Manage Prices
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Search size={16} className="inline mr-2" /> Sales History
        </button>
      </div>

      {activeTab === 'sell' && (
        <div className="card-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
            <ShoppingCart className="mr-3 text-blue-600" /> Record a Sale (Trading Income)
          </h2>
          
          {saleSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 font-bold rounded-xl flex items-center">
              <CheckCircle size={20} className="mr-2" /> {saleSuccess}
            </div>
          )}

          <form onSubmit={handleRecordSale} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
              <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
              >
                {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Item Name</label>
                <input 
                  type="text" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g. JSS1 Uniform Set"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  required
                />
                {/* Datalist for existing items in category */}
                {inventory[selectedCategory] && Object.keys(inventory[selectedCategory]).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys(inventory[selectedCategory]).map(item => (
                      <span 
                        key={item} 
                        onClick={() => setItemName(item)}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Student / Reference (Optional)</label>
                <input 
                  type="text" 
                  value={studentRef} 
                  onChange={e => setStudentRef(e.target.value)}
                  placeholder="Student Name or Cash"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Unit Price (₦)</label>
                <input 
                  type="number" 
                  value={unitPrice} 
                  onChange={e => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Quantity</label>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <div className="text-slate-500 font-bold">
                Total Amount: <span className="text-xl text-emerald-600 font-black">{formatNaira(Number(unitPrice || 0) * Number(quantity || 0))}</span>
              </div>
              <button 
                type="submit" 
                disabled={savingSale || !itemName || !unitPrice}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl flex items-center disabled:opacity-50"
              >
                {savingSale ? <Loader2 className="animate-spin mr-2" size={18} /> : <Plus className="mr-2" size={18} />}
                Record Sale
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="card-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-4xl">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
            <Tag className="mr-3 text-blue-600" /> Manage Item Prices
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-slate-50 p-5 rounded-2xl border border-slate-200 h-fit">
              <h3 className="font-bold text-slate-800 mb-4">Add / Update Price</h3>
              <form onSubmit={handleSaveInventory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                  <select 
                    value={invCategory} 
                    onChange={e => setInvCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 text-sm"
                  >
                    {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Item Name</label>
                  <input 
                    type="text" 
                    value={invItemName} 
                    onChange={e => setInvItemName(e.target.value)}
                    placeholder="e.g. Maths Textbook JSS1"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Price (₦)</label>
                  <input 
                    type="number" 
                    value={invPrice} 
                    onChange={e => setInvPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 text-sm"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={savingInv}
                  className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg"
                >
                  {savingInv ? 'Saving...' : 'Save Price'}
                </button>
              </form>
            </div>

            <div className="md:col-span-2">
              <h3 className="font-bold text-slate-800 mb-4">Current Pricelist</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ITEM_CATEGORIES.map(category => {
                  const items = inventory[category];
                  if (!items || Object.keys(items).length === 0) return null;
                  
                  return (
                    <div key={category} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-black text-slate-700 text-sm">
                        {category}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {Object.entries(items).map(([name, price]) => (
                          <div key={name} className="flex justify-between items-center px-4 py-2">
                            <span className="text-sm font-medium text-slate-600">{name}</span>
                            <span className="text-sm font-bold text-emerald-600">{formatNaira(price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
            <Search className="mr-3 text-blue-600" /> Recent Sales History
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-xl">Date</th>
                  <th className="py-3 px-4">Item (Category)</th>
                  <th className="py-3 px-4">Student / Ref</th>
                  <th className="py-3 px-4">Qty & Price</th>
                  <th className="py-3 px-4 rounded-r-xl">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesHistory.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {sale.createdAt ? sale.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{sale.itemName}</div>
                      <div className="text-xs text-slate-500">{sale.category}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{sale.studentRef}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {sale.quantity} x {formatNaira(sale.unitPrice)}
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-600">
                      {formatNaira(sale.totalAmount)}
                    </td>
                  </tr>
                ))}
                {salesHistory.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400 font-bold">
                      No sales history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreView;
