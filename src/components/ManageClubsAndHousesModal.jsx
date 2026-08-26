import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Shield, Users, Award, 
  CheckCircle, AlertCircle, Loader2, Sparkles, RefreshCw
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
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (isOpen) {
      setClubsList(globalClubs || DEFAULT_CLUBS);
      setHousesList(globalHouses || DEFAULT_HOUSES);
      setStatus({ type: '', message: '' });
      setNewClubInput('');
      setNewHouseInput('');
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

  // Delete Club
  const handleDeleteClub = (clubToDelete) => {
    if (clubsList.length <= 1) {
      setStatus({ type: 'error', message: 'You must maintain at least one school club.' });
      return;
    }
    const updated = clubsList.filter(c => c !== clubToDelete);
    setClubsList(updated);
    saveClubsToDatabase(updated);
  };

  // Save Clubs
  const saveClubsToDatabase = async (updated) => {
    setSaving(true);
    setStatus({ type: 'info', message: 'Syncing school clubs...' });
    try {
      await ensureFirebaseAuth();
      await saveSchoolClubs(updated);
      setStatus({ type: 'success', message: 'School clubs updated successfully!' });
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

  // Delete House
  const handleDeleteHouse = (houseToDelete) => {
    if (housesList.length <= 1) {
      setStatus({ type: 'error', message: 'You must maintain at least one school house.' });
      return;
    }
    const updated = housesList.filter(h => h !== houseToDelete);
    setHousesList(updated);
    saveHousesToDatabase(updated);
  };

  // Save Houses
  const saveHousesToDatabase = async (updated) => {
    setSaving(true);
    setStatus({ type: 'info', message: 'Syncing school houses...' });
    try {
      await ensureFirebaseAuth();
      await saveSchoolHouses(updated);
      setStatus({ type: 'success', message: 'School houses updated successfully!' });
    } catch (err) {
      console.error('Save houses error:', err);
      setStatus({ type: 'error', message: 'Failed to update houses: ' + (err?.message || 'Database error') });
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset clubs and houses to standard school defaults?')) return;
    setSaving(true);
    try {
      await ensureFirebaseAuth();
      await saveSchoolClubs(DEFAULT_CLUBS);
      await saveSchoolHouses(DEFAULT_HOUSES);
      setClubsList(DEFAULT_CLUBS);
      setHousesList(DEFAULT_HOUSES);
      setStatus({ type: 'success', message: 'Reset to standard school defaults successfully.' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to reset: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Users className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">Manage School Clubs & Houses</h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Configure official clubs & houses for student self-selection & enrollment.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-4 pt-3 shrink-0">
          <button
            onClick={() => setActiveTab('clubs')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'clubs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={16} />
            <span>School Clubs ({clubsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('houses')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'houses'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award size={16} />
            <span>School Houses ({housesList.length})</span>
          </button>
        </div>

        {/* Status Notification */}
        {status.message && (
          <div className={`mx-6 mt-4 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
            'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>
            {status.type === 'success' ? <CheckCircle size={16} className="shrink-0" /> :
             status.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> :
             <Loader2 size={16} className="shrink-0 animate-spin" />}
            <span>{status.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'clubs' ? (
            <div className="space-y-4">
              <form onSubmit={handleAddClub} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Robotics & AI Club"
                  value={newClubInput}
                  onChange={(e) => setNewClubInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                />
                <button
                  type="submit"
                  disabled={saving || !newClubInput.trim()}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-indigo-100"
                >
                  <Plus size={16} /> Add Club
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {clubsList.map((club, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                      <span className="text-sm font-bold text-slate-800 truncate">{club}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteClub(club)}
                      disabled={saving}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title={`Remove ${club}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleAddHouse} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Platinum House"
                  value={newHouseInput}
                  onChange={(e) => setNewHouseInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                />
                <button
                  type="submit"
                  disabled={saving || !newHouseInput.trim()}
                  className="px-5 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-purple-100"
                >
                  <Plus size={16} /> Add House
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {housesList.map((house, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-purple-200 hover:bg-purple-50/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                      <span className="text-sm font-bold text-slate-800 truncate">{house}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHouse(house)}
                      disabled={saving}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title={`Remove ${house}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} /> Reset to Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageClubsAndHousesModal;
