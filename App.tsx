/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Stats } from './components/Stats';
import { SettingsView } from './components/SettingsView';
import { SmokeLog, Settings, SmokeType } from './types';
import { getKSTDateString } from './utils';

const defaultSettings: Settings = {
  traditionalCostPerPack: 4500,
  traditionalSticksPerPack: 20,
  electronicCostPerPack: 4800,
  electronicSticksPerPack: 20,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stats' | 'settings'>('dashboard');
  const [kstDate, setKstDate] = useState(getKSTDateString());
  const [logs, setLogs] = useState<SmokeLog[]>(() => {
    const saved = localStorage.getItem('smoke_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('smoke_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.electronicCostPerPack === 4500) {
        parsed.electronicCostPerPack = 4800;
      }
      return parsed;
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('smoke_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('smoke_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setKstDate(getKSTDateString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addSmoke = (type: SmokeType, tag?: string, timestamp?: number) => {
    const newLog: SmokeLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type,
      action: 'smoke',
      timestamp: timestamp || Date.now(),
      cost: 0,
      tag,
    };
    setLogs([...logs, newLog]);
  };

  const addPurchase = (type: SmokeType, timestamp?: number) => {
    const cost = type === 'traditional' 
      ? settings.traditionalCostPerPack 
      : settings.electronicCostPerPack;
      
    const newLog: SmokeLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type,
      action: 'purchase',
      timestamp: timestamp || Date.now(),
      cost,
    };
    setLogs([...logs, newLog]);
  };

  const deleteLog = (id: string) => {
    setLogs(logs.filter(log => log.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col max-w-md mx-auto shadow-xl relative">
      <header className="bg-white px-6 py-4 border-b border-zinc-100 sticky top-0 z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-zinc-800">
            {activeTab === 'dashboard' && '금연 기록'}
            {activeTab === 'stats' && '통계'}
            {activeTab === 'settings' && '설정'}
          </h1>
          {activeTab === 'dashboard' && (
            <span className="text-sm text-zinc-500 font-medium mt-0.5">{kstDate}</span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard' && <Dashboard logs={logs} addSmoke={addSmoke} addPurchase={addPurchase} deleteLog={deleteLog} />}
        {activeTab === 'stats' && <Stats logs={logs} />}
        {activeTab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} logs={logs} setLogs={setLogs} />}
      </main>

      <nav className="bg-white border-t border-zinc-100 flex justify-around p-3 absolute bottom-0 w-full">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-zinc-400'}`}
        >
          <Home size={24} />
          <span className="text-xs mt-1 font-medium">홈</span>
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center p-2 ${activeTab === 'stats' ? 'text-indigo-600' : 'text-zinc-400'}`}
        >
          <BarChart2 size={24} />
          <span className="text-xs mt-1 font-medium">통계</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center p-2 ${activeTab === 'settings' ? 'text-indigo-600' : 'text-zinc-400'}`}
        >
          <SettingsIcon size={24} />
          <span className="text-xs mt-1 font-medium">설정</span>
        </button>
      </nav>
    </div>
  );
}
