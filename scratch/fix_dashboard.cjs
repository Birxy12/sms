const fs = require('fs');
const path = 'c:/Users/birxy/sms/src/pages/dashboard/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const securityTabContent = `        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'Security' && currentAdmin?.isSuperAdmin && (
        <div className="animate-in fade-in space-y-8">
          <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <Shield size={200} />
            </div>

            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Security Vault</h2>
                <p className="text-slate-400 text-sm font-medium">Protect the portal and manage access credentials.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Change Admin Password */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={18} className="text-blue-500" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Update Admin Credentials</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>

                  {passwordStatus.message && (
                    <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 \${
                      passwordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {passwordStatus.type === 'success' ? <Shield size={16} /> : <AlertTriangle size={16} />}
                      {passwordStatus.message}
                    </div>
                  )}

                  <button 
                    onClick={async () => {
                      if (!newPassword || newPassword !== confirmPassword) {
                        setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
                        return;
                      }
                      const res = await changePassword(newPassword);
                      if (res.success) {
                        setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
                        setNewPassword('');
                        setConfirmPassword('');
                      } else {
                        setPasswordStatus({ type: 'error', message: res.message });
                      }
                    }}
                    className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                  >
                    Update Access Key
                  </button>
                </div>
              </div>

              {/* Security Status */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Portal Protection</h3>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <AlertTriangle size={80} />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div>
                      <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Firewall Active</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Firestore Security Rules are currently enforcing authenticated access.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">Hacker Protection</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        The system now requires a valid role-based token for all database write operations.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Last Security Scan</p>
                      <p className="text-xs font-bold">{new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}`;

// We want to insert this before the final closing of tab-content-animate div
// The last occurrence of "        </div>\n      )}" is the end of Management tab
content = content.replace(/\\s{8}<\\/div>\\s{6}\\)}\\s*<\\/div>/, securityTabContent + "\\n      </div>");

fs.writeFileSync(path, content);
console.log('Update complete');
