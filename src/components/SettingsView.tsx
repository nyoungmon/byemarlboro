import React, { useState, useEffect } from 'react';
import { Settings, SmokeLog } from '../types';
import { auth } from '../firebase';
import { User } from 'lucide-react';

interface SettingsViewProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

export function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
  };

  const handleBlur = () => {
    onUpdateSettings(localSettings);
  };

  return (
    <div className="p-6 space-y-8">
      {/* User Info Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 flex items-center gap-4">
        {auth.currentUser?.photoURL ? (
          <img src={auth.currentUser.photoURL} alt="Profile" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
            <User size={24} />
          </div>
        )}
        <div>
          <h3 className="font-bold text-zinc-800">{auth.currentUser?.displayName || '사용자'}</h3>
          <p className="text-sm text-zinc-500">{auth.currentUser?.email || '로그인 정보 없음'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-4 bg-amber-50 border-b border-amber-100">
          <h3 className="font-bold text-amber-800">말보루 설정</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">한 갑 가격 (원)</label>
            <input 
              type="number" 
              name="traditionalCostPerPack"
              value={localSettings.traditionalCostPerPack}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">한 갑당 개수</label>
            <input 
              type="number" 
              name="traditionalSticksPerPack"
              value={localSettings.traditionalSticksPerPack}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-4 bg-emerald-50 border-b border-emerald-100">
          <h3 className="font-bold text-emerald-800">테리아 설정</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">한 갑 가격 (원)</label>
            <input 
              type="number" 
              name="electronicCostPerPack"
              value={localSettings.electronicCostPerPack}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">한 갑당 개수</label>
            <input 
              type="number" 
              name="electronicSticksPerPack"
              value={localSettings.electronicSticksPerPack}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
