import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, setDoc, doc, getDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ShoppingCart, Settings, Plus, Loader2, Search, CheckCircle, Tag, X, BarChart2 } from 'lucide-react';
import SchoolItemIcon from '../../components/SchoolItemIcon';
import { formatNaira } from '../../utils/prospectusFees';

const DEFAULT_INVENTORY = {
  'Uniforms': {
    'Nursery': 8000,
    'Primary': 10000,
    'Junior Secondary': 15000,
    'Senior Secondary': 15000
  },
  'P.E. Wear': {
    'Nursery': 7000,
    'Primary': 7000,
    'Junior Secondary': 10000,
    'Senior Secondary': 10000
  },
  'Jackets': {
    'Nursery': 3000,
    'Primary': 3000
  },
  'Sports Wear': {
    'Nursery': 6000,
    'Primary': 6000,
    'Junior Secondary': 7000,
    'Senior Secondary': 7000
  },
  'Exercise Books': {},
  'Textbooks': {}
};

const DEFAULT_BOOK_PACKS = {
  'Toddler 1': [{ item: 'block exercise 20 leaves', qty: 4 }],
  'Nursery 1 & 2': [{ item: 'block exercise 20 leaves', qty: 4 }, { item: '20 leaves', qty: 1 }],
  'Basic 1 & 2': [{ item: '20 leaves', qty: 15 }, { item: '60 leaves', qty: 5 }, { item: '20 leaves', qty: 3 }],
  'Basic 3, 4 & 5': [{ item: '60 leaves', qty: 10 }, { item: '40 leaves', qty: 10 }, { item: '20 leaves', qty: 3 }],
  'JSS 1': [{ item: '80 Leaves', qty: 15 }, { item: '20 leaves', qty: 5 }],
  'JSS 2 & 3': [{ item: '80 Leaves', qty: 17 }, { item: '20 leaves', qty: 5 }],
  'SS 1': [{ item: '80 Leaves', qty: 20 }, { item: '20 leaves', qty: 5 }],
  'SS 2 & 3': [{ item: '80 Leaves', qty: 10 }, { item: '20 leaves', qty: 5 }]
};

const ITEM_CATEGORIES = Object.keys(DEFAULT_INVENTORY);

const HOUSES = [
  'Cherry House (Red)',
  'Alamanda House (Yellow)',
  'Blue Bell House (Blue)',
  'Rose House (Orange)'
];

const StoreView = ({ allStudents = [] }) => {
  const [activeTab, setActiveTab] = useState('sell'); // 'sell', 'inventory', 'history'
  const [inventory, setInventory] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Sale State
  const [selectedCategory, setSelectedCategory] = useState(ITEM_CATEGORIES[0]);
  const [selectedHouse, setSelectedHouse] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentRef, setStudentRef] = useState('');
  const [savingSale, setSavingSale] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState('');

  // Inventory State
  const [invCategory, setInvCategory] = useState(ITEM_CATEGORIES[0]);
  const [invItemName, setInvItemName] = useState('');
  const [invPrice, setInvPrice] = useState('');
  const [savingInv, setSavingInv] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Exercise Book Packs State
  const [bookPacks, setBookPacks] = useState({});
  const [editingPackClass, setEditingPackClass] = useState(null);
  const [editingPackNewClassName, setEditingPackNewClassName] = useState('');
  const [editingPackItems, setEditingPackItems] = useState([]);

  // Overview State
  const [overviewCategoryFilter, setOverviewCategoryFilter] = useState('All');
  const [overviewSubGroupFilter, setOverviewSubGroupFilter] = useState('All');

  useEffect(() => {
    fetchStoreData();
  }, []);

  // Update unit price when item name changes (if exists in inventory)
  useEffect(() => {
    if (inventory[selectedCategory] && inventory[selectedCategory][itemName]) {
      setUnitPrice(inventory[selectedCategory][itemName]);
    } else if (selectedCategory === 'Exercise Books' && itemName.startsWith('Exercise Book Pack - ')) {
      const packClass = itemName.replace('Exercise Book Pack - ', '');
      if (bookPacks[packClass]) {
        const packItems = bookPacks[packClass];
        const totalCost = packItems.reduce((sum, packItem) => sum + (Number(packItem.qty) * Number(inventory['Exercise Books']?.[packItem.item] || 0)), 0);
        setUnitPrice(totalCost);
      } else {
        setUnitPrice('');
      }
    } else {
      setUnitPrice('');
    }
  }, [itemName, selectedCategory, inventory, bookPacks]);

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Inventory Pricing from settings
      try {
        const invDoc = await getDoc(doc(db, 'settings', 'store_inventory'));
        if (invDoc.exists() && Object.keys(invDoc.data()).length > 0) {
          setInventory(invDoc.data());
        } else {
          setInventory(DEFAULT_INVENTORY);
        }
      } catch (invErr) {
        // If settings collection blocked, use default inventory
        setInventory(DEFAULT_INVENTORY);
      }

      try {
        const bpDoc = await getDoc(doc(db, 'settings', 'exercise_book_packs'));
        if (bpDoc.exists() && Object.keys(bpDoc.data()).length > 0) {
          setBookPacks(bpDoc.data());
        } else {
          setBookPacks(DEFAULT_BOOK_PACKS);
        }
      } catch (bpErr) {
        setBookPacks(DEFAULT_BOOK_PACKS);
      }

      // 2. Fetch Recent Sales
      try {
        const salesQ = query(collection(db, 'store_sales'), limit(2000));
        const salesSnap = await getDocs(salesQ);
        const sales = salesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          })
          .slice(0, 50);
        setSalesHistory(sales);
      } catch (salesErr) {
        // If permission denied, show empty sales history
        setSalesHistory([]);
        console.warn('Store sales not accessible yet - check Firebase Rules are deployed:', salesErr.code);
      }
    } catch (err) {
      console.error("Error fetching store data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = allStudents.filter(s => {
    const name = String(s.name || s['STUDENT NAME'] || '').toLowerCase();
    const reg = String(s.regNo || s.REGNO || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase().trim();
    if (term.length === 0) return false;
    
    return name.includes(term) || reg.includes(term) || reg.replace(/[^a-z0-9]/g, '').includes(term.replace(/[^a-z0-9]/g, ''));
  }).slice(0, 10);

  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!itemName || !unitPrice || quantity < 1) return;
    
    setSavingSale(true);
    try {
      const totalAmount = Number(unitPrice) * Number(quantity);
      
      let finalStudentRef = studentRef || 'Walk-in / Cash';
      let finalStudentId = null;
      let finalClassName = null;
      let finalRegNo = null;

      if (selectedStudent) {
        finalStudentRef = `${selectedStudent.name || selectedStudent['STUDENT NAME']} (${selectedStudent.className || selectedStudent.class_name || selectedStudent.CLASS} - ${selectedStudent.regNo || selectedStudent.REGNO})`;
        finalStudentId = selectedStudent.id;
        finalClassName = selectedStudent.className || selectedStudent.class_name || selectedStudent.CLASS;
        finalRegNo = selectedStudent.regNo || selectedStudent.REGNO;
      }

      let finalItemName = itemName;
      if (selectedCategory === 'Sports Wear' && selectedHouse) {
        finalItemName = `${itemName} - ${selectedHouse}`;
      }

      await addDoc(collection(db, 'store_sales'), {
        category: selectedCategory,
        itemName: finalItemName,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalAmount,
        studentRef: finalStudentRef,
        studentId: finalStudentId,
        className: finalClassName,
        regNo: finalRegNo,
        createdAt: serverTimestamp(),
      });
      
      setSaleSuccess('Sale recorded successfully!');
      setTimeout(() => setSaleSuccess(''), 3000);
      
      setItemName('');
      setQuantity(1);
      setUnitPrice('');
      setStudentRef('');
      setSelectedStudent(null);
      setSearchTerm('');
      setSelectedHouse('');
      
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

  const handleDeleteInventory = async (category, itemName) => {
    if (!window.confirm(`Are you sure you want to delete ${itemName} from ${category}?`)) return;
    
    setSavingInv(true);
    try {
      const updatedInv = { ...inventory };
      if (updatedInv[category]) {
        delete updatedInv[category][itemName];
      }
      await setDoc(doc(db, 'settings', 'store_inventory'), updatedInv);
      setInventory(updatedInv);
    } catch (err) {
      console.error("Error deleting inventory:", err);
      alert("Failed to delete item.");
    } finally {
      setSavingInv(false);
    }
  };

  const handleUpdateInventory = async (e) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.price) return;

    setSavingInv(true);
    try {
      const updatedInv = { ...inventory };
      const cat = editingItem.category;
      
      if (!updatedInv[cat]) {
        updatedInv[cat] = {};
      }
      
      if (editingItem.name !== editingItem.originalName) {
        delete updatedInv[cat][editingItem.originalName];
      }
      
      updatedInv[cat][editingItem.name] = Number(editingItem.price);

      await setDoc(doc(db, 'settings', 'store_inventory'), updatedInv);
      setInventory(updatedInv);
      setEditingItem(null);
    } catch (err) {
      console.error("Error updating inventory:", err);
      alert("Failed to update item.");
    } finally {
      setSavingInv(false);
    }
  };

  const handleSaveBookPack = async (originalClassName) => {
    try {
      const updatedPacks = { ...bookPacks };
      
      // If the class name was changed, delete the old one
      if (originalClassName !== editingPackNewClassName && originalClassName !== 'NEW_CLASS') {
        delete updatedPacks[originalClassName];
      }
      
      if (editingPackNewClassName.trim()) {
        updatedPacks[editingPackNewClassName.trim()] = editingPackItems;
      }
      
      await setDoc(doc(db, 'settings', 'exercise_book_packs'), updatedPacks);
      setBookPacks(updatedPacks);
      setEditingPackClass(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save book pack.");
    }
  };

  const handleDeleteBookPack = async (className) => {
    if (!window.confirm(`Are you sure you want to delete the configuration for ${className}?`)) return;
    try {
      const updatedPacks = { ...bookPacks };
      delete updatedPacks[className];
      await setDoc(doc(db, 'settings', 'exercise_book_packs'), updatedPacks);
      setBookPacks(updatedPacks);
    } catch (err) {
      console.error(err);
      alert("Failed to delete book pack.");
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
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          {(() => {
            if (overviewCategoryFilter === 'Uniforms') return <SchoolItemIcon item="uniform" size={16} className="inline mr-2" />;
            if (overviewCategoryFilter === 'Exercise Books') return <SchoolItemIcon item="exercise-book" size={16} className="inline mr-2" />;
            if (overviewCategoryFilter === 'Textbooks') return <SchoolItemIcon item="textbook" size={16} className="inline mr-2" />;
            if (overviewCategoryFilter === 'P.E. Wear' || overviewCategoryFilter === 'Sports Wear') return <SchoolItemIcon item="p.e-wear" size={16} className="inline mr-2" />;
            return <BarChart2 size={16} className="inline mr-2" />;
          })()} Overview
        </button>
      </div>

      {activeTab === 'overview' && (() => {
        const overviewSales = salesHistory.filter(s => {
          if (overviewCategoryFilter !== 'All' && s.category !== overviewCategoryFilter) return false;
          if (overviewSubGroupFilter !== 'All' && s.itemName !== overviewSubGroupFilter) return false;
          return true;
        });

        const getAggregate = (category) => {
          const items = overviewSales.filter(s => s.category === category);
          return items.reduce((acc, curr) => {
            acc.count += Number(curr.quantity || 0);
            acc.amount += Number(curr.totalAmount || 0);
            return acc;
          }, { count: 0, amount: 0 });
        };

        const uniformsAgg = getAggregate('Uniforms');
        const exerciseBooksAgg = getAggregate('Exercise Books');
        const textbooksAgg = getAggregate('Textbooks');

        let availableSubGroups = [];
        if (overviewCategoryFilter === 'All') {
          const allItems = new Set();
          Object.values(inventory).forEach(categoryItems => {
            if (categoryItems) {
              Object.keys(categoryItems).forEach(item => allItems.add(item));
            }
          });
          availableSubGroups = Array.from(allItems).sort();
        } else {
          availableSubGroups = inventory[overviewCategoryFilter] ? Object.keys(inventory[overviewCategoryFilter]).sort() : [];
        }

        return (
          <div className="card-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
              <BarChart2 className="mr-3 text-blue-600" /> Store Sales Overview
            </h2>

            <div className="flex flex-wrap gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Category Filter</label>
                <select 
                  value={overviewCategoryFilter}
                  onChange={e => {
                    setOverviewCategoryFilter(e.target.value);
                    setOverviewSubGroupFilter('All');
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                >
                  <option value="All">All Categories</option>
                  {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sub-Group / Item Filter</label>
                <select 
                  value={overviewSubGroupFilter}
                  onChange={e => setOverviewSubGroupFilter(e.target.value)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                >
                  <option value="All">All Sub-Groups</option>
                  {availableSubGroups.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-indigo-600 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                  <SchoolItemIcon item="exercise-book" size={120} />
                </div>
                <div className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-2 flex justify-between items-center relative z-10">
                  <span>Exercise Books Sold</span>
                  <SchoolItemIcon item="exercise-book" size={20} className="text-indigo-300" />
                </div>
                <div className="text-3xl font-black mb-2 relative z-10">{exerciseBooksAgg.count} <span className="text-lg font-bold text-indigo-300">units</span></div>
                <div className="text-lg font-bold text-indigo-900 bg-white w-fit px-3 py-1 rounded-lg shadow-sm relative z-10">
                  {formatNaira(exerciseBooksAgg.amount)}
                </div>
              </div>
              
              <div className="bg-blue-600 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                  <SchoolItemIcon item="uniform" size={120} />
                </div>
                <div className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-2 flex justify-between items-center relative z-10">
                  <span>Uniforms Sold</span>
                  <SchoolItemIcon item="uniform" size={20} className="text-blue-300" />
                </div>
                <div className="text-3xl font-black mb-2 relative z-10">{uniformsAgg.count} <span className="text-lg font-bold text-blue-300">units</span></div>
                <div className="text-lg font-bold text-blue-900 bg-white w-fit px-3 py-1 rounded-lg shadow-sm relative z-10">
                  {formatNaira(uniformsAgg.amount)}
                </div>
              </div>

              <div className="bg-amber-600 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                  <SchoolItemIcon item="textbook" size={120} />
                </div>
                <div className="text-sm font-bold text-amber-200 uppercase tracking-widest mb-2 flex justify-between items-center relative z-10">
                  <span>Textbooks Sold</span>
                  <SchoolItemIcon item="textbook" size={20} className="text-amber-300" />
                </div>
                <div className="text-3xl font-black mb-2 relative z-10">{textbooksAgg.count} <span className="text-lg font-bold text-amber-300">units</span></div>
                <div className="text-lg font-bold text-amber-900 bg-white w-fit px-3 py-1 rounded-lg shadow-sm relative z-10">
                  {formatNaira(textbooksAgg.amount)}
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
              <div className="text-sm font-bold text-slate-500">
                Filtered Total Volume
              </div>
              <div className="text-2xl font-black text-slate-800">
                {formatNaira(overviewSales.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0))}
              </div>
            </div>
          </div>
        );
      })()}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                <select 
                  value={selectedCategory} 
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    if (e.target.value !== 'Sports Wear') setSelectedHouse('');
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                >
                  {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {selectedCategory === 'Sports Wear' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Student House</label>
                  <select 
                    value={selectedHouse} 
                    onChange={e => setSelectedHouse(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                    required
                  >
                    <option value="" disabled>Select House</option>
                    {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
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
                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    {selectedCategory === 'Exercise Books' && Object.keys(bookPacks).length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Tag size={12} /> Class Book Packs
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(bookPacks).map(packClass => (
                            <button
                              type="button"
                              key={`pack-${packClass}`}
                              onClick={() => {
                                setItemName(`Exercise Book Pack - ${packClass}`);
                                setQuantity(1);
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                itemName === `Exercise Book Pack - ${packClass}` 
                                  ? 'bg-emerald-600 text-white shadow-md' 
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
                              }`}
                            >
                              {packClass} Pack
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        {selectedCategory === 'Exercise Books' ? 'Individual Items' : 'Available Items'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(inventory[selectedCategory]).map(item => (
                          <button 
                            type="button"
                            key={item} 
                            onClick={() => setItemName(item)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                              itemName === item 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative z-20">
                <label className="block text-sm font-bold text-slate-700 mb-1">Student / Reference (Optional)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={selectedStudent ? `${selectedStudent.name || selectedStudent['STUDENT NAME']} - ${selectedStudent.regNo || selectedStudent.REGNO}` : searchTerm} 
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setStudentRef(e.target.value);
                      if (selectedStudent) setSelectedStudent(null);
                    }}
                    placeholder="Search by Student Name or Reg No (or enter Cash/Ref)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {!selectedStudent && filteredStudents.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {filteredStudents.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchTerm('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-slate-700">{s.name || s['STUDENT NAME']}</div>
                          <div className="text-xs text-slate-500">{s.className || s.class_name || s.CLASS}</div>
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                          {s.regNo || s.REGNO}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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

      {activeTab === 'sell' && selectedCategory === 'Exercise Books' && (
        <div className="card-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mt-6">
          <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <Settings className="text-slate-400" size={20} />
            Configure New Intakes Exercise Book Packs
          </h3>
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-slate-500 font-medium">
              These configurations will automatically appear on candidate Admission Letters and Bursary Receipts.
            </p>
            <button 
              onClick={() => {
                setEditingPackClass('NEW_CLASS');
                setEditingPackNewClassName('');
                setEditingPackItems([{ item: '', qty: 1 }]);
              }}
              className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center"
            >
              <Plus size={14} className="mr-1" /> Add Class Group
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {editingPackClass === 'NEW_CLASS' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-blue-300 ring-2 ring-blue-100">
                <div className="flex justify-between items-start mb-2">
                  <input 
                    type="text" 
                    value={editingPackNewClassName}
                    onChange={e => setEditingPackNewClassName(e.target.value)}
                    placeholder="Enter Class Name (e.g. JSS 1)"
                    className="font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded text-sm w-full mr-2"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleSaveBookPack('NEW_CLASS')}
                      disabled={!editingPackNewClassName.trim()}
                      className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setEditingPackClass(null)}
                      className="text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mt-3">
                  {editingPackItems.map((bpItem, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={bpItem.item}
                        onChange={e => {
                          const newItems = [...editingPackItems];
                          newItems[i].item = e.target.value;
                          setEditingPackItems(newItems);
                        }}
                        className="flex-1 text-xs p-2 border border-slate-200 rounded outline-none bg-white"
                      >
                        <option value="">Select Item...</option>
                        {Object.keys(inventory['Exercise Books'] || {}).map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={bpItem.qty}
                        onChange={e => {
                          const newItems = [...editingPackItems];
                          newItems[i].qty = Number(e.target.value);
                          setEditingPackItems(newItems);
                        }}
                        min="1"
                        className="w-16 text-xs p-2 border border-slate-200 rounded outline-none bg-white"
                      />
                      <button 
                        onClick={() => setEditingPackItems(editingPackItems.filter((_, idx) => idx !== i))}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditingPackItems([...editingPackItems, { item: '', qty: 1 }])}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline mt-2"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                  
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-600">Total Sum:</span>
                    <span className="font-bold text-emerald-600">
                      {formatNaira(editingPackItems.reduce((sum, item) => sum + (Number(item.qty) * Number(inventory['Exercise Books']?.[item.item] || 0)), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {Object.keys(bookPacks).map(className => (
              <div key={className} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  {editingPackClass !== className ? (
                    <div className="font-bold text-slate-700">{className}</div>
                  ) : (
                    <input 
                      type="text" 
                      value={editingPackNewClassName}
                      onChange={e => setEditingPackNewClassName(e.target.value)}
                      className="font-bold text-slate-700 bg-white border border-slate-300 px-2 py-1 rounded text-sm w-full mr-2 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                  {editingPackClass !== className ? (
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => { 
                          setEditingPackClass(className);
                          setEditingPackNewClassName(className); 
                          setEditingPackItems(Array.isArray(bookPacks[className]) ? [...bookPacks[className]] : []); 
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteBookPack(className)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded"
                      >
                        Del
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleSaveBookPack(className)}
                        disabled={!editingPackNewClassName.trim()}
                        className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingPackClass(null)}
                        className="text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                {editingPackClass === className ? (
                  <div className="space-y-2 mt-3">
                    {editingPackItems.map((bpItem, i) => (
                      <div key={i} className="flex gap-2">
                        <select
                          value={bpItem.item}
                          onChange={e => {
                            const newItems = [...editingPackItems];
                            newItems[i].item = e.target.value;
                            setEditingPackItems(newItems);
                          }}
                          className="flex-1 text-xs p-2 border border-slate-200 rounded outline-none"
                        >
                          <option value="">Select Item...</option>
                          {Object.keys(inventory['Exercise Books'] || {}).map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={bpItem.qty}
                          onChange={e => {
                            const newItems = [...editingPackItems];
                            newItems[i].qty = Number(e.target.value);
                            setEditingPackItems(newItems);
                          }}
                          min="1"
                          className="w-16 text-xs p-2 border border-slate-200 rounded outline-none"
                        />
                        <button 
                          onClick={() => setEditingPackItems(editingPackItems.filter((_, idx) => idx !== i))}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditingPackItems([...editingPackItems, { item: '', qty: 1 }])}
                      className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline mt-2"
                    >
                      <Plus size={12} /> Add Item
                    </button>

                    <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-600">Total Sum:</span>
                      <span className="font-bold text-emerald-600">
                        {formatNaira(editingPackItems.reduce((sum, item) => sum + (Number(item.qty) * Number(inventory['Exercise Books']?.[item.item] || 0)), 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 mt-2 flex flex-col h-full">
                    <div className="space-y-1 mb-3">
                      {Array.isArray(bookPacks[className]) && bookPacks[className].length > 0 ? (
                        bookPacks[className].map((bpItem, idx) => (
                          <div key={idx} className="flex justify-between border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                            <span>{bpItem.qty}x {bpItem.item}</span>
                            <span className="font-mono text-xs font-bold text-slate-400">
                              {formatNaira(Number(bpItem.qty) * Number(inventory['Exercise Books']?.[bpItem.item] || 0))}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">No configuration set</span>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-600">Total Sum:</span>
                      <span className="font-bold text-emerald-600">
                        {formatNaira((bookPacks[className] || []).reduce((sum, item) => sum + (Number(item.qty) * Number(inventory['Exercise Books']?.[item.item] || 0)), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
                          <div key={name} className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                            {editingItem && editingItem.category === category && editingItem.originalName === name ? (
                              <form onSubmit={handleUpdateInventory} className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={editingItem.name} 
                                  onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                                  className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded"
                                  required
                                />
                                <input 
                                  type="number" 
                                  value={editingItem.price} 
                                  onChange={e => setEditingItem({...editingItem, price: e.target.value})}
                                  className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                                  required
                                />
                                <button type="submit" disabled={savingInv} className="text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded hover:bg-emerald-100 disabled:opacity-50 text-xs">Save</button>
                                <button type="button" onClick={() => setEditingItem(null)} className="text-slate-600 font-bold px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 text-xs">Cancel</button>
                              </form>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">{name}</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-bold text-emerald-600">{formatNaira(price)}</span>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                      onClick={() => setEditingItem({ category, originalName: name, name, price })}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteInventory(category, name)}
                                      className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
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
