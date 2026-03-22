import React, { useState } from 'react';
import { Cigarette, BatteryCharging, Trash2, CreditCard, X, Pencil } from 'lucide-react';
import { SmokeLog, SmokeType } from '../types';
import { isTodayKST, getKSTDate } from '../utils';
import { format } from 'date-fns';

interface DashboardProps {
  logs: SmokeLog[];
  addSmoke: (type: SmokeType, tag?: string, timestamp?: number) => void;
  addPurchase: (type: SmokeType, timestamp?: number) => void;
  deleteLog: (id: string) => void;
  updateLog: (id: string, updates: Partial<SmokeLog>) => void;
}

export function Dashboard({ logs, addSmoke, addPurchase, deleteLog, updateLog }: DashboardProps) {
  const [manualModal, setManualModal] = useState<{ isOpen: boolean; editId: string | null }>({ isOpen: false, editId: null });
  const [manualDate, setManualDate] = useState(format(getKSTDate(), 'yyyy-MM-dd'));
  const [manualTime, setManualTime] = useState(format(getKSTDate(), 'HH:mm'));
  const [manualType, setManualType] = useState<SmokeType>('traditional');
  const [manualAction, setManualAction] = useState<'smoke' | 'purchase'>('smoke');
  const [manualTag, setManualTag] = useState('');

  const openManualModal = (editLog?: SmokeLog, defaultType: SmokeType = 'traditional', defaultAction: 'smoke' | 'purchase' = 'smoke') => {
    if (editLog) {
      const logDate = getKSTDate(editLog.timestamp);
      setManualDate(format(logDate, 'yyyy-MM-dd'));
      setManualTime(format(logDate, 'HH:mm'));
      setManualType(editLog.type);
      setManualAction(editLog.action || 'smoke');
      setManualTag(editLog.tag || '');
      setManualModal({ isOpen: true, editId: editLog.id });
    } else {
      setManualDate(format(getKSTDate(), 'yyyy-MM-dd'));
      setManualTime(format(getKSTDate(), 'HH:mm'));
      setManualType(defaultType);
      setManualAction(defaultAction);
      setManualTag('');
      setManualModal({ isOpen: true, editId: null });
    }
  };

  const handleManualSubmit = () => {
    const timestamp = new Date(`${manualDate}T${manualTime}`).getTime();
    
    if (manualModal.editId) {
      updateLog(manualModal.editId, {
        type: manualType,
        action: manualAction,
        timestamp,
        tag: manualAction === 'smoke' ? (manualTag || undefined) : undefined,
      });
    } else {
      if (manualAction === 'smoke') {
        addSmoke(manualType, manualTag || undefined, timestamp);
      } else {
        addPurchase(manualType, timestamp);
      }
    }
    setManualModal({ isOpen: false, editId: null });
    setManualTag('');
  };

  const todaysLogs = logs.filter(log => isTodayKST(log.timestamp));
  
  const traditionalCount = todaysLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).length;
  const electronicCount = todaysLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).length;
  const totalCost = todaysLogs.reduce((sum, log) => sum + log.cost, 0);

  const groupedLogs = Object.values(todaysLogs.reduce((acc, log) => {
    const action = log.action || 'smoke';
    const tag = log.tag || '';
    const key = `${log.type}-${action}-${tag}`;
    if (!acc[key]) {
      acc[key] = {
        type: log.type,
        action,
        tag,
        count: 0,
        cost: 0,
        ids: [],
        lastTimestamp: 0,
        logs: []
      };
    }
    acc[key].count += 1;
    acc[key].cost += log.cost;
    acc[key].ids.push(log.id);
    acc[key].logs.push(log);
    acc[key].lastTimestamp = Math.max(acc[key].lastTimestamp, log.timestamp);
    return acc;
  }, {} as Record<string, { type: SmokeType, action: string, tag: string, count: number, cost: number, ids: string[], lastTimestamp: number, logs: SmokeLog[] }>)).sort((a, b) => {
    return b.lastTimestamp - a.lastTimestamp;
  });

  return (
    <div className="p-6 space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center justify-center">
          <span className="text-zinc-500 text-sm font-medium mb-1">오늘의 말보루</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-amber-600">{traditionalCount}</span>
            <span className="text-zinc-400 text-sm">개</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center justify-center">
          <span className="text-zinc-500 text-sm font-medium mb-1">오늘의 테리아</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-emerald-500">{electronicCount}</span>
            <span className="text-zinc-400 text-sm">개</span>
          </div>
        </div>
        <div className="col-span-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
          <span className="text-indigo-800 font-medium">오늘 지출 비용</span>
          <span className="text-xl font-bold text-indigo-900">{Math.round(totalCost).toLocaleString()}원</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-zinc-500">흡연 기록</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => openManualModal(undefined, 'traditional', 'smoke')}
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm shadow-amber-200"
          >
            <Cigarette size={24} />
            <span className="font-bold">말보루</span>
          </button>
          <button
            onClick={() => openManualModal(undefined, 'electronic', 'smoke')}
            className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm shadow-emerald-200"
          >
            <BatteryCharging size={24} />
            <span className="font-bold">테리아</span>
          </button>
        </div>
        
        <h3 className="text-sm font-bold text-zinc-500 px-1 pt-2">구입 기록</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => openManualModal(undefined, 'traditional', 'purchase')}
            className="bg-white border-2 border-amber-200 hover:border-amber-300 active:scale-95 transition-all text-amber-600 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm"
          >
            <CreditCard size={24} />
            <span className="font-bold">말보루 구입</span>
          </button>
          <button
            onClick={() => openManualModal(undefined, 'electronic', 'purchase')}
            className="bg-white border-2 border-emerald-200 hover:border-emerald-300 active:scale-95 transition-all text-emerald-600 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm"
          >
            <CreditCard size={24} />
            <span className="font-bold">테리아 구입</span>
          </button>
        </div>
      </div>

      {/* Recent Logs */}
      <div>
        <h3 className="text-lg font-bold text-zinc-800 mb-4">오늘의 기록</h3>
        {todaysLogs.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 bg-white rounded-2xl border border-zinc-100 border-dashed">
            아직 기록이 없습니다.<br/>오늘 하루도 화이팅!
          </div>
        ) : (
          <div className="space-y-3">
            {groupedLogs.map(group => {
              const isPurchase = group.action === 'purchase';
              const isTraditional = group.type === 'traditional';
              const title = isTraditional ? '말보루' : '테리아';
              const displayTitle = isPurchase ? `${title} 구입` : title;
              const unit = isPurchase ? '갑' : '개';
              
              return (
                <div key={`${group.type}-${group.action}-${group.tag}`} className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isTraditional ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isPurchase ? <CreditCard size={20} /> : (isTraditional ? <Cigarette size={20} /> : <BatteryCharging size={20} />)}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-800 flex items-center gap-2">
                        {displayTitle}
                        {group.tag && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold">
                            {group.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {group.count}{unit}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.cost > 0 && (
                      <span className="font-medium text-zinc-600 mr-2">{Math.round(group.cost).toLocaleString()}원</span>
                    )}
                    <button 
                      onClick={() => openManualModal(group.logs[group.logs.length - 1])} 
                      className="text-zinc-300 hover:text-indigo-500 transition-colors p-1"
                      title="최근 기록 1개 수정"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => deleteLog(group.ids[group.ids.length - 1])} 
                      className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                      title="최근 기록 1개 삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Manual Log Modal */}
      {manualModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="font-bold text-zinc-800">
                {manualModal.editId 
                  ? (manualAction === 'smoke' ? '흡연 기록 수정' : '구입 기록 수정') 
                  : (manualAction === 'smoke' ? '흡연 기록 추가' : '구입 기록 추가')}
              </h3>
              <button onClick={() => setManualModal({ isOpen: false, editId: null })} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex-1 w-full min-w-0">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">날짜</label>
                  <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                    <input 
                      type="date" 
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="block w-full min-w-0 bg-transparent px-3 py-2 text-[16px] sm:text-sm outline-none border-none appearance-none m-0 box-border"
                    />
                  </div>
                </div>
                {manualAction === 'smoke' && (
                  <div className="flex-1 w-full min-w-0">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">시간</label>
                    <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="time" 
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="block w-full min-w-0 bg-transparent px-3 py-2 text-[16px] sm:text-sm outline-none border-none appearance-none m-0 box-border"
                      />
                    </div>
                    <div className="flex gap-1 mt-1.5 w-full">
                      <button onClick={() => setManualTime('09:00')} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] py-1 rounded transition-colors">아침</button>
                      <button onClick={() => setManualTime('13:00')} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] py-1 rounded transition-colors">점심</button>
                      <button onClick={() => setManualTime('19:00')} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] py-1 rounded transition-colors">저녁</button>
                      <button onClick={() => setManualTime('22:00')} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] py-1 rounded transition-colors">밤</button>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">종류</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setManualType('traditional')}
                    className={`py-2 rounded-lg text-sm font-bold transition-colors ${manualType === 'traditional' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}
                  >
                    말보루
                  </button>
                  <button 
                    onClick={() => setManualType('electronic')}
                    className={`py-2 rounded-lg text-sm font-bold transition-colors ${manualType === 'electronic' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}
                  >
                    테리아
                  </button>
                </div>
              </div>

              {manualAction === 'smoke' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">상황 태그 (선택)</label>
                  <div className="flex flex-wrap gap-2">
                    {['식후땡', '기상 후', '음주', '코 타임'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setManualTag(manualTag === tag ? '' : tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${manualTag === tag ? 'bg-indigo-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleManualSubmit}
                className={`w-full font-bold py-3 rounded-xl mt-2 transition-colors ${manualAction === 'smoke' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-zinc-800 hover:bg-zinc-900 text-white'}`}
              >
                {manualModal.editId 
                  ? (manualAction === 'smoke' ? '흡연 기록 수정하기' : '구입 기록 수정하기') 
                  : (manualAction === 'smoke' ? '흡연 기록 추가하기' : '구입 기록 추가하기')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
