import React, { useState, useEffect, useRef } from 'react';
import { Settings, SmokeLog } from '../types';
import { Download, Upload } from 'lucide-react';

interface SettingsViewProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  logs: SmokeLog[];
  onImportData: (settings: Settings, logs: SmokeLog[]) => void;
}

export function SettingsView({ settings, onUpdateSettings, logs, onImportData }: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleExport = () => {
    const data = {
      settings,
      logs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smoke_log_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.settings && parsed.logs) {
          onImportData(parsed.settings, parsed.logs);
          alert('데이터가 성공적으로 복원되었습니다.');
        } else {
          alert('올바른 백업 파일 형식이 아닙니다.');
        }
      } catch (error) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 space-y-8">
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

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-4 bg-indigo-50 border-b border-indigo-100">
          <h3 className="font-bold text-indigo-800">데이터 관리</h3>
        </div>
        <div className="p-5 space-y-3">
          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-medium hover:bg-zinc-50 transition-colors"
          >
            <Download size={18} />
            데이터 백업하기 (저장)
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-medium hover:bg-zinc-50 transition-colors"
          >
            <Upload size={18} />
            데이터 복원하기 (불러오기)
          </button>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <p className="text-xs text-zinc-500 text-center mt-2">
            기존 백업 파일(.json)을 불러와 클라우드에 덮어쓸 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
