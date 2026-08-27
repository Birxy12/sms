import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Edit3, Check, Users, Award, 
  CheckCircle, AlertCircle, Loader2, Sparkles, RefreshCw, Search
} from 'lucide-react';
import { 
  useGlobalClubsAndHouses, 
  saveSchoolClubs, 
  saveSchoolHouses, 
  DEFAULT_CLUBS, 
  DEFAULT_HOUSES 
} from '../utils/schoolClubsAndHouses';
import { ensureFirebaseAuth } from '../lib/ensureAuth';

const ManageClubsAndHousesModal = ({ isOpen, onClose }) => {
  const { clubs: globalClubs, houses: globalHouses, loading } = useGlobalClubsAndHouses();
  const [activeTab, setActiveTab] = useState('clubs'); // 'clubs' | 'houses'

  const [clubsList, setClubsList] = useState([]);
  const [housesList, setHousesList] = useState([]);
  
  const [newClubInput, setNewClubInput] = useState('');
  const [newHouseInput, setNewHouseInput] = useState('');
  
  // Edit states for Clubs
  const [editingClubIndex, setEditingClubIndex] = useState(null);
  const [editingClubValue, setEditingClubValue] = useState('');

  // Edit states for Houses
  const [editingHouseIndex, setEditingHouseIndex] = useState(null);
  const [editingHouseValue, setEditingHouseValue] = useState('');

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (isOpen) {
      setClubsList(globalClubs || DEFAULT_CLUBS);
      setHousesList(globalHouses || DEFAULT_HOUSES);
      setStatus({ type: '', message: '' });
      setNewClubInput('');
      setNewHouseInput('');
      setEditingClubIndex(null);
      setEditingHouseIndex(null);
      setSearchFilter('');
    }
  }, [isOpen, globalClubs, globalHouses]);

  if (!isOpen) return null;

  // Add Club
  const handleAddClub = (e) => {
    e.preventDefault();
    const trimmed = newClubInput.trim();
    if (!trimmed) return;

    if (clubsList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setStatus({ type: 'error', message: `"${trimmed}" already exists in the clubs list.` });
      return;
    }

    const updated = [...clubsList, trimmed];
    setClubsList(updated);
    setNewClubInput('');
    saveClubsToDatabase(updated);
  };

  // Start Editing Club
  const handleStartEditClub = (index, currentName) => {
    setEditingClubIndex(index);
    setEditingClubValue(currentName);
    setStatus({ type: '', message: '' });
  };

  // Cancel Editing Club
  const handleCancelEditClub = () => {
    setEditingClubIndex(null);
    setEditingClubValue('');
  };

  // Save Edited Club
  const handleSaveEditClub = (index) => {
    const trimmed = editingClubValue.trim();
    if (!trimmed) {
      setStatus({ type: 'error', message: 'Club name cannot be blank.' });
      return;
    }

    // Check duplicate against other items
    if (clubsList.some((c, i) => i !== index && c.toLowerCase() === trimmed.toLowerCase())) {
      setStatus({ type: 'error', message: `"${trimmed}" already exists in the clubs list.` });
      return;
    }

    const updated = [...clubsList];
    updated[index] = trimmed;
    setClubsList(updated);
    setEditingClubIndex(null);
    setEditingClubValue('');
    saveClubsToDatabase(updated);
  };

  // Delete Club
  const handleDeleteClub = (clubToDelete) => {
    if (clubsList.length <= 1) {
      setStatus({ type: 'error', message: 'You must maintain at least one school club.' });
      return;
    }
    if (!window.confirm(`Delete the club "${clubToDelete}"?`)) return;
    const updated = clubsList.filter(c => c !== clubToDelete);
    setClubsList(updated);
    saveClubsToDatabase(updated);
  };

  // Save Clubs to Firestore
  const saveClubsToDatabase = async (updated) => {
    setSaving(true);
    setStatus({ type: 'info', message: 'Syncing school clubs...' });
    try {
      await ensureFirebaseAuth();
      await saveSchoolClubs(updated);
      setStatus({ type: 'success', message: 'School clubs updated and saved successfully!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3500);
    } catch (err) {
      console.error('Save clubs error:', err);
      setStatus({ type: 'error', message: 'Failed to update clubs: ' + (err?.message || 'Database error') });
    } finally {
      setSaving(false);
    }
  };

  // Add House
  const handleAddHouse = (e) => {
    e.preventDefault();
    const trimmed = newHouseInput.trim();
    if (!trimmed) return;

    if (housesList.some(h => h.toLowerCase() === trimmed.toLowerCase())) {
      setStatus({ type: 'error', message: `"${trimmed}" already exists in the houses list.` });
      return;
    }

    const updated = [...housesList, trimmed];
    setHousesList(updated);
    setNewHouseInput('');
    saveHousesToDatabase(updated);
  };

  // Start Editing House
  const handleStartEditHouse = (index, currentName) => {
    setEditingHouseIndex(index);
    setEditingHouseValue(currentName);
    setStatus({ type: '', message: '' });
  };

  // Cancel Editing House
  const handleCancelEditHouse = () => {
    setEditingHouseIndex(null);
    setEditingHouseValue('');
  };

  // Save Edited House
  const handleSaveEditHouse = (index) => {
    const trimmed = editingHouseValue.trim();
    if (!trimmed) {
      setStatus({ type: 'error', message: 'House name cannot be blank.' });
      return;
    }

    // Check duplicate against other items
    if (housesList.some((h, i) => i !== index && h.toLowerCase() === trimmed.toLowerCase())) {
      setStatus({ type: 'error', message: `"${trimmed}" already exists in the houses list.` });
      return;
    }

    const updated = [...housesList];
    updated[index] = trimmed;
    setHousesList(updated);
    setEditingHouseIndex(null);
    setEditingHouseValue('');
    saveHousesToDatabase(updated);
  };

  // Delete House
  const handleDeleteHouse = (houseToDelete) => {
    if (housesList.length <= 1) {
      setStatus({ type: 'error', message: 'You must maintain at least one school house.' });
      return;
    }
    if (!window.confirm(`Delete the house "${houseToDelete}"?`)) return;
    const updated = housesList.filter(h => h !== houseToDelete);
    setHousesList(updated);
    saveHousesToDatabase(updated);
  };

  // Save Houses to Firestore
  const saveHousesToDatabase = async (updated) => {
    setSaving(true);
    setStatus({ type: 'info', message: 'Syncing school houses...' });
    try {
      await ensureFirebaseAuth();
      await saveSchoolHouses(updated);
      setStatus({ type: 'success', message: 'School houses updated and saved successfully!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3500);
    } catch (err) {
      console.error('Save houses error:', err);
      setStatus({ type: 'error', message: 'Failed to update houses: ' + (err?.message || 'Database error') });
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset both clubs and houses back to official school defaults?')) return;
    setSaving(true);
    try {
      await ensureFirebaseAuth();
      await saveSchoolClubs(DEFAULT_CLUBS);
      await saveSchoolHouses(DEFAULT_HOUSES);
      setClubsList(DEFAULT_CLUBS);
      setHousesList(DEFAULT_HOUSES);
      setStatus({ type: 'success', message: 'Reset to standard school defaults successfully.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3500);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to reset: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const filteredClubs = clubsList.filter(c => c.toLowerCase().includes(searchFilter.toLowerCase()));
  const filteredHouses = housesList.filter(h => h.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="p-6 md:p-7 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-700/60">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-400/30 shadow-inner">
              <Users className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-white m-0">Manage School Clubs & Houses</h3>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Editable
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium m-0">
                Configure, add, or edit official clubs & houses for student self-selection & enrollment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 bg-slate-50 dark:bg-slate-950/60 gap-3 pt-3 pb-2 shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => { setActiveTab('clubs'); setSearchFilter(''); }}
              className={`pb-2.5 font-black text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'clubs'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Users size={16} />
              <span>School Clubs ({clubsList.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('houses'); setSearchFilter(''); }}
              className={`pb-2.5 font-black text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'houses'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Award size={16} />
              <span>School Houses ({housesList.length})</span>
            </button>
          </div>

          <div className="relative mb-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white w-full sm:w-48 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Status Notification */}
        {status.message && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shrink-0 animate-in zoom-in-95 duration-150 ${
            status.type === 'success' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' :
            status.type === 'error' ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40' :
            'bg-indigo-950/70 text-indigo-300 border border-indigo-500/40'
          }`}>
            {status.type === 'success' ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> :
             status.type === 'error' ? <AlertCircle size={16} className="text-rose-400 shrink-0" /> :
             <Loader2 size={16} className="shrink-0 animate-spin text-indigo-400" />}
            <span>{status.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'clubs' ? (
            <div className="space-y-4">
              
              {/* Add New Club Form */}
              <form onSubmit={handleAddClub} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new club name (e.g. Robotics & AI Club)..."
                  value={newClubInput}
                  onChange={(e) => setNewClubInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={saving || !newClubInput.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xs sm:text-sm hover:from-indigo-500 hover:to-violet-500 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-indigo-500/20 active:scale-95 shrink-0"
                >
                  <Plus size={16} /> Add Club
                </button>
              </form>

              {/* Clubs List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {filteredClubs.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No clubs found matching "{searchFilter}".
                  </div>
                ) : (
                  filteredClubs.map((club, idx) => {
                    const originalIndex = clubsList.indexOf(club);
                    const isEditing = editingClubIndex === originalIndex;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isEditing
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-2 border-indigo-500 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-indigo-400/50'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingClubValue}
                              onChange={(e) => setEditingClubValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditClub(originalIndex);
                                if (e.key === 'Escape') handleCancelEditClub();
                              }}
                              className="flex-1 bg-white dark:bg-slate-900 border border-indigo-400 text-xs font-black text-slate-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditClub(originalIndex)}
                              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow transition-all"
                              title="Save Changes"
                            >
                              <Check size={14} className="stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditClub}
                              className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">{club}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditClub(originalIndex, club)}
                                disabled={saving}
                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-lg transition-all"
                                title={`Edit ${club}`}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClub(club)}
                                disabled={saving}
                                className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-all"
                                title={`Delete ${club}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Add New House Form */}
              <form onSubmit={handleAddHouse} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new house name (e.g. Platinum House)..."
                  value={newHouseInput}
                  onChange={(e) => setNewHouseInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={saving || !newHouseInput.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-black text-xs sm:text-sm hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-purple-500/20 active:scale-95 shrink-0"
                >
                  <Plus size={16} /> Add House
                </button>
              </form>

              {/* Houses List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {filteredHouses.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No houses found matching "{searchFilter}".
                  </div>
                ) : (
                  filteredHouses.map((house, idx) => {
                    const originalIndex = housesList.indexOf(house);
                    const isEditing = editingHouseIndex === originalIndex;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isEditing
                            ? 'bg-purple-50/80 dark:bg-purple-950/50 border-2 border-purple-500 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-purple-400/50'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingHouseValue}
                              onChange={(e) => setEditingHouseValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditHouse(originalIndex);
                                if (e.key === 'Escape') handleCancelEditHouse();
                              }}
                              className="flex-1 bg-white dark:bg-slate-900 border border-purple-400 text-xs font-black text-slate-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditHouse(originalIndex)}
                              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow transition-all"
                              title="Save Changes"
                            >
                              <Check size={14} className="stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditHouse}
                              className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">{house}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditHouse(originalIndex, house)}
                                disabled={saving}
                                className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded-lg transition-all"
                                title={`Edit ${house}`}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHouse(house)}
                                disabled={saving}
                                className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-all"
                                title={`Delete ${house}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} /> Reset to Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs sm:text-sm font-black hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageClubsAndHousesModal;
