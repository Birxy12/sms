import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { Users, UserPlus, Mail, Phone, Briefcase, Trash2, Edit2, CheckCircle, AlertCircle, Loader2, X, Search } from 'lucide-react';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStaff, setCurrentStaff] = useState({ name: '', email: '', phone: '', department: 'Science', role: 'teacher' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  // Fetch staff list
  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'staff'), orderBy('staffId', 'asc'));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStatus({ type: 'error', message: 'Failed to load staff records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  // Auto-generate Staff ID (BDS/STAFF/001 ...)
  const generateStaffId = async () => {
    const q = query(collection(db, 'staff'), orderBy('staffId', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return 'BDS/STAFF/001';
    
    const lastId = querySnapshot.docs[0].data().staffId;
    const num = parseInt(lastId.split('/').pop());
    return `BDS/STAFF/${String(num + 1).padStart(3, '0')}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: 'info', message: 'Saving staff record...' });

    try {
      if (isEditing) {
        const staffRef = doc(db, 'staff', currentStaff.id);
        const updateData = { ...currentStaff };
        // If password is empty during edit, don't update it
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateDoc(staffRef, updateData);
        setStatus({ type: 'success', message: 'Staff updated successfully!' });
      } else {
        const staffId = await generateStaffId();
        await addDoc(collection(db, 'staff'), {
          ...currentStaff,
          staffId,
          password: currentStaff.password || '134', // Default password 134
          createdAt: new Date().toISOString()
        });
        setStatus({ type: 'success', message: `Staff added successfully! New ID: ${staffId}` });
      }
      setShowModal(false);
      fetchStaffData();
    } catch (error) {
      console.error('Save error:', error);
      setStatus({ type: 'error', message: 'Error saving record: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await deleteDoc(doc(db, 'staff', id));
      fetchStaffData();
      setStatus({ type: 'success', message: 'Staff deleted successfully!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error deleting staff.' });
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.staffId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-slate-500">Add, edit and manage teacher records and assignments.</p>
        </div>
        <button 
          onClick={() => { setIsEditing(false); setCurrentStaff({ name: '', email: '', phone: '', department: 'Science', role: 'teacher' }); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <UserPlus size={20} />
          Add New Staff
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Staff', value: staff.length, icon: Users, color: 'indigo' },
          { label: 'Science Dept', value: staff.filter(s => s.department === 'Science').length, icon: Briefcase, color: 'teal' },
          { label: 'Arts Dept', value: staff.filter(s => s.department === 'Arts').length, icon: Briefcase, color: 'rose' },
          { label: 'Admins', value: staff.filter(s => s.role === 'admin').length, icon: Briefcase, color: 'blue' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow`}>
            <div className={`p-4 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h4 className="text-2xl font-bold text-slate-900">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name or staff ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider text-left border-b border-slate-100">
                <th className="px-8 py-5">Staff Member</th>
                <th className="px-6 py-5">Staff ID</th>
                <th className="px-6 py-5">Department</th>
                <th className="px-6 py-5">Role</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mx-auto mb-4" />
                    <p className="font-medium">Loading staff records...</p>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? filteredStaff.map((person) => (
                <tr key={person.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {person.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{person.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Mail size={12} /> {person.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">{person.staffId}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-medium text-slate-700">{person.department}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold capitalize ${
                      person.role === 'admin' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                      person.role === 'principal' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      person.role === 'bursar' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {person.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setIsEditing(true); setCurrentStaff(person); setShowModal(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(person.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-slate-400">
                    No staff records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Notifications */}
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-emerald-600 text-white' : 
          status.type === 'error' ? 'bg-rose-600 text-white' : 
          'bg-indigo-600 text-white'
        }`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm">{status.message}</p>
          <button onClick={() => setStatus({})} className="ml-4 hover:opacity-50"><X size={16} /></button>
        </div>
      )}

      {/* Modal Backdrop */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-900">{isEditing ? 'Edit Staff Profile' : 'Add New Staff Member'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={currentStaff.name}
                    onChange={(e) => setCurrentStaff({...currentStaff, name: e.target.value})}
                    placeholder="e.g. John Doe"
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={currentStaff.email}
                    onChange={(e) => setCurrentStaff({...currentStaff, email: e.target.value})}
                    placeholder="john@school.com"
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    value={currentStaff.phone}
                    onChange={(e) => setCurrentStaff({...currentStaff, phone: e.target.value})}
                    placeholder="+1 234 567 890"
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
                  <select 
                    value={currentStaff.department}
                    onChange={(e) => setCurrentStaff({...currentStaff, department: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  >
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Admin">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                  <select 
                    value={currentStaff.role}
                    onChange={(e) => setCurrentStaff({...currentStaff, role: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                    <option value="principal">Principal</option>
                    <option value="bursar">Bursar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{isEditing ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                  <input 
                    type="password" 
                    value={currentStaff.password || ''}
                    onChange={(e) => setCurrentStaff({...currentStaff, password: e.target.value})}
                    placeholder={isEditing ? '••••••••' : 'Default: 134'}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : isEditing ? 'Update Record' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
