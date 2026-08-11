import React from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { primaryColor } from '../utils/constants';

const UpdateModal = ({ latestVersion }) => {
  const downloadLink = "https://github.com/Birxy12/sms/raw/main/app-debug.apk";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Update Available!
          </h2>
          
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            A new version ({latestVersion}) of the app is available. Please update to continue getting the latest features and bug fixes.
          </p>

          <a
            href={downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
            style={{ backgroundColor: primaryColor }}
          >
            <Download size={20} />
            Download Update
          </a>
          <p className="text-xs text-slate-500 mt-4">
            After downloading, open the APK file to install the update over your current version.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
