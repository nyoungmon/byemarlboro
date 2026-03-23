import React, { useMemo, useState } from 'react';
import { SmokeLog, SmokeType } from '../types';
import { format, subDays, isSameDay, startOfDay, eachDayOfInterval, eachMonthOfInterval, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, Cigarette, BatteryCharging, Trash2, CreditCard, X, PlusCircle, Pencil } from 'lucide-react';
import { getKSTDate } from '../utils';

const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#4f46e5', '#7c3aed', '#2563eb', '#1d4ed8', '#1e40af'];

interface StatsProps {
  logs: SmokeLog[];
  addSmoke: (type: SmokeType, tag?: string, timestamp?: number, count?: number) => void;
  addPurchase: (type: SmokeType, timestamp?: number, count?: number) => void;
  deleteLog: (id: string) => void;
  updateLog: (id: string, updates: Partial<SmokeLog>) => void;
}

export function Stats({ logs, addSmoke, addPurchase, deleteLog, updateLog }: StatsProps) {
  const [viewMode, setViewMode] = useState<'all' | '7days' | 'month'>('all');
  const [summaryMonth, setSummaryMonth] = useState(startOfMonth(getKSTDate()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [manualModal, setManualModal] = useState<{ isOpen: boolean; editId: string | null }>({ isOpen: false, editId: null });
  const [manualTime, setManualTime] = useState('12:00');
  const [manualType, setManualType] = useState<SmokeType>('traditional');
  const [manualAction, setManualAction] = useState<'smoke' | 'purchase'>('smoke');
  const [manualTag, setManualTag] = useState('');
  const [manualCount, setManualCount] = useState(1);

  const prevSummaryMonth = () => setSummaryMonth(subMonths(summaryMonth, 1));
  const nextSummaryMonth = () => setSummaryMonth(addMonths(summaryMonth, 1));

  const openManualModal = (editLog?: SmokeLog, defaultType: SmokeType = 'traditional', defaultAction: 'smoke' | 'purchase' = 'smoke') => {
    if (editLog) {
      const logDate = getKSTDate(editLog.timestamp);
      setManualTime(format(logDate, 'HH:mm'));
      setManualType(editLog.type);
      setManualAction(editLog.action || 'smoke');
      setManualTag(editLog.tag || '');
      setManualCount(editLog.count || 1);
      setManualModal({ isOpen: true, editId: editLog.id });
    } else {
      setManualTime('12:00');
      setManualType(defaultType);
      setManualAction(defaultAction);
      setManualTag('');
      setManualCount(1);
      setManualModal({ isOpen: true, editId: null });
    }
  };

  const handleManualSubmit = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const timestamp = new Date(`${dateStr}T${manualTime}:00+09:00`).getTime();
    
    if (manualModal.editId) {
      updateLog(manualModal.editId, {
        type: manualType,
        action: manualAction,
        timestamp,
        tag: manualAction === 'smoke' ? (manualTag || undefined) : undefined,
        count: manualCount,
      });
    } else {
      if (manualAction === 'smoke') {
        addSmoke(manualType, manualTag || undefined, timestamp, manualCount);
      } else {
        addPurchase(manualType, timestamp, manualCount);
      }
    }
    setManualModal({ isOpen: false, editId: null });
    setManualTag('');
    setManualCount(1);
  };

  const selectedDayLogs = useMemo(() => {
    if (!selectedDate) return [];
    return logs
      .filter(log => isSameDay(getKSTDate(log.timestamp), selectedDate))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, selectedDate]);

  const summaryLogs = useMemo(() => {
    if (viewMode === 'all') return logs;
    if (viewMode === 'month') {
      return logs.filter(log => isSameMonth(getKSTDate(log.timestamp), summaryMonth));
    }
    if (viewMode === '7days') {
      const end = getKSTDate();
      const start = startOfDay(subDays(end, 6));
      return logs.filter(log => {
        const d = getKSTDate(log.timestamp);
        return d >= start && d <= end;
      });
    }
    return logs;
  }, [logs, viewMode, summaryMonth]);

  const last7Days = useMemo(() => {
    if (viewMode !== '7days') return [];
    const end = startOfDay(getKSTDate());
    const start = subDays(end, 6);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayLogs = logs.filter(log => isSameDay(getKSTDate(log.timestamp), day));
      const traditional = dayLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
      const electronic = dayLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
      const traditionalCost = dayLogs.filter(l => l.type === 'traditional').reduce((sum, log) => sum + log.cost, 0);
      const electronicCost = dayLogs.filter(l => l.type === 'electronic').reduce((sum, log) => sum + log.cost, 0);
      const cost = traditionalCost + electronicCost;

      return {
        date: format(day, 'M/d', { locale: ko }),
        traditional,
        electronic,
        traditionalCost,
        electronicCost,
        cost,
      };
    });
  }, [logs, viewMode]);

  const monthlyChartData = useMemo(() => {
    if (viewMode !== 'month') return [];
    
    // 선택된 달 포함 앞으로 3개월치 표시 (최소 2026년 3월부터)
    let start = startOfMonth(summaryMonth);
    const minStart = new Date(2026, 2, 1); // 2026년 3월 1일
    if (start < minStart) {
      start = minStart;
    }
    const end = addMonths(start, 2);
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthLogs = logs.filter(log => isSameMonth(getKSTDate(log.timestamp), month));
      const traditional = monthLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
      const electronic = monthLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
      const traditionalCost = monthLogs.filter(l => l.type === 'traditional').reduce((sum, log) => sum + log.cost, 0);
      const electronicCost = monthLogs.filter(l => l.type === 'electronic').reduce((sum, log) => sum + log.cost, 0);
      const cost = traditionalCost + electronicCost;

      return {
        date: format(month, 'yy년 M월', { locale: ko }),
        traditional,
        electronic,
        traditionalCost,
        electronicCost,
        cost,
      };
    });
  }, [logs, viewMode, summaryMonth]);

  const calendarDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const start = startOfWeek(startOfMonth(summaryMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(summaryMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [summaryMonth, viewMode]);

  const totalTraditional = summaryLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
  const totalElectronic = summaryLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
  const totalCost = summaryLogs.reduce((sum, log) => sum + log.cost, 0);

  const { tagStats, timeStats } = useMemo(() => {
    const smokeLogs = summaryLogs.filter(l => !l.action || l.action === 'smoke');
    
    const tags: Record<string, number> = {};
    const times = {
      '새벽 (00~06)': 0,
      '오전 (06~12)': 0,
      '오후 (12~18)': 0,
      '저녁 (18~24)': 0,
    };

    smokeLogs.forEach(log => {
      const count = log.count || 1;
      if (log.tag) {
        tags[log.tag] = (tags[log.tag] || 0) + count;
      }
      
      const hour = getKSTDate(log.timestamp).getHours();
      if (hour >= 0 && hour < 6) times['새벽 (00~06)'] += count;
      else if (hour >= 6 && hour < 12) times['오전 (06~12)'] += count;
      else if (hour >= 12 && hour < 18) times['오후 (12~18)'] += count;
      else times['저녁 (18~24)'] += count;
    });

    const sortedTags = Object.entries(tags)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const timeArray = Object.entries(times).map(([name, value]) => ({ name, value }));

    return { tagStats: sortedTags, timeStats: timeArray };
  }, [summaryLogs]);

  return (
    <div className="p-6 space-y-8">
      {/* Summary Header & Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-800">요약 통계</h2>
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'all' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              전체 누적
            </button>
            <button 
              onClick={() => setViewMode('7days')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === '7days' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              최근 7일
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              월별 보기
            </button>
          </div>
        </div>
        
        {viewMode === 'month' && (
          <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-zinc-100">
            <button onClick={prevSummaryMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-zinc-800 w-24 text-center">{format(summaryMonth, 'yyyy년 M월')}</span>
            <button onClick={nextSummaryMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
          <span className="text-zinc-500 text-sm font-medium block mb-2">
            {viewMode === 'all' ? '총 누적 지출' : viewMode === '7days' ? '7일 지출' : '월간 지출'}
          </span>
          <span className="text-3xl font-bold text-zinc-800">{Math.round(totalCost).toLocaleString()}원</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <span className="text-zinc-500 text-sm font-medium mb-1">
            {viewMode === 'all' ? '총 말보루' : viewMode === '7days' ? '7일 말보루' : '월간 말보루'}
          </span>
          <span className="text-2xl font-bold text-amber-600">{totalTraditional}개</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <span className="text-zinc-500 text-sm font-medium mb-1">
            {viewMode === 'all' ? '총 테리아' : viewMode === '7days' ? '7일 테리아' : '월간 테리아'}
          </span>
          <span className="text-2xl font-bold text-emerald-500">{totalElectronic}개</span>
        </div>
      </div>

      {/* Pattern Analysis */}
      {summaryLogs.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-800 mb-6">상황별 흡연 패턴</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tagStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tagStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}개`, '']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-800 mb-6">시간대별 흡연 패턴</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    formatter={(value: number) => [`${value}개`, '흡연량']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" name="흡연량" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 7 Days Charts */}
      {viewMode === '7days' && (
        <>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-800 mb-6">최근 7일 흡연량</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="traditional" name="말보루" stackId="a" fill="#d97706" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="electronic" name="테리아" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-800 mb-6">최근 7일 지출 비용</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7Days} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} dy={10} />
                  <YAxis domain={[(dataMin: number) => Math.min(dataMin, 9000), (dataMax: number) => Math.max(dataMax, 20000)]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(val) => val === 0 ? '0' : val.toLocaleString()} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value.toLocaleString()}원`, name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="traditionalCost" name="말보루 비용" stroke="#d97706" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="electronicCost" name="테리아 비용" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Monthly Charts & Calendar */}
      {viewMode === 'month' && (
        <>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-800 mb-6">월간 흡연량 추이</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="traditional" name="말보루" stackId="a" fill="#d97706" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="electronic" name="테리아" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-800 mb-6">월간 지출 추이</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} dy={10} />
                  <YAxis domain={[(dataMin: number) => Math.min(dataMin, 14100), (dataMax: number) => Math.max(dataMax, 90000)]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(val) => val === 0 ? '0' : val.toLocaleString()} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value.toLocaleString()}원`, name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="traditionalCost" name="말보루 비용" stroke="#d97706" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="electronicCost" name="테리아 비용" stroke="#10b981" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-800 mb-6">월간 캘린더</h3>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayLogs = logs.filter(log => isSameDay(getKSTDate(log.timestamp), day));
                const traditional = dayLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
                const electronic = dayLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).reduce((sum, l) => sum + (l.count || 1), 0);
                const cost = dayLogs.reduce((sum, log) => sum + log.cost, 0);
                const isCurrentMonth = isSameMonth(day, summaryMonth);
                const isTodayKST = isSameDay(day, getKSTDate());

                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[64px] p-1 border border-zinc-50 rounded-lg flex flex-col items-center cursor-pointer hover:border-indigo-200 transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-zinc-50 opacity-40'}`}
                  >
                    <span className={`text-xs mb-1 font-medium ${isTodayKST ? 'bg-indigo-500 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-zinc-600'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-col gap-0.5 w-full items-center">
                      {traditional > 0 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded w-full text-center truncate">
                          {traditional}
                        </span>
                      )}
                      {electronic > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded w-full text-center truncate">
                          {electronic}
                        </span>
                      )}
                      {cost > 0 && (
                        <span className="text-[9px] font-medium text-zinc-500 mt-0.5 w-full text-center truncate">
                          {cost.toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Trigger Analysis */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
        <h3 className="font-bold text-zinc-800 text-lg mb-4">
          {viewMode === 'all' ? '전체 흡연 패턴 분석' : viewMode === '7days' ? '최근 7일 흡연 패턴 분석' : '월간 흡연 패턴 분석'}
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-zinc-500 mb-3">시간대별 흡연량</h4>
            <div className="space-y-2">
              {timeStats.map(stat => {
                const max = Math.max(...timeStats.map(t => t.value), 1);
                const percentage = (stat.value / max) * 100;
                return (
                  <div key={stat.name} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 w-20 shrink-0">{stat.name}</span>
                    <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-400 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-zinc-700 w-8 text-right">{stat.value}회</span>
                  </div>
                );
              })}
            </div>
          </div>

          {tagStats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-500 mb-3">주요 흡연 상황</h4>
              <div className="flex flex-wrap gap-2">
                {tagStats.map(stat => (
                  <div key={stat.name} className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="text-sm font-medium text-indigo-900">{stat.name}</span>
                    <span className="text-xs bg-white text-indigo-600 px-1.5 py-0.5 rounded-md font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDate && !manualModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-bold text-zinc-800 text-lg">
                {format(selectedDate, 'yyyy년 M월 d일')} 기록
              </h3>
              <button onClick={() => setSelectedDate(null)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {selectedDayLogs.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100 border-dashed">
                  이 날의 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayLogs.map(log => {
                    const isPurchase = log.action === 'purchase';
                    const isTraditional = log.type === 'traditional';
                    const title = isTraditional ? '말보루' : '테리아';
                    const displayTitle = isPurchase ? `${title} 지출` : title;
                    
                    return (
                      <div key={log.id} className="bg-white p-3 rounded-xl shadow-sm border border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isTraditional ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {isPurchase ? <CreditCard size={18} /> : (isTraditional ? <Cigarette size={18} /> : <BatteryCharging size={18} />)}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-800 flex items-center gap-2 text-sm">
                              {displayTitle}
                              {log.tag && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold">
                                  {log.tag}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {!isPurchase && format(getKSTDate(log.timestamp), 'HH:mm')}
                              {isPurchase && '지출'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {log.cost > 0 && (
                            <span className="font-medium text-zinc-600 mr-2 text-sm">{Math.round(log.cost).toLocaleString()}원</span>
                          )}
                          <button 
                            onClick={() => openManualModal(log)} 
                            className="text-zinc-300 hover:text-indigo-500 transition-colors p-1"
                            title="기록 수정"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => deleteLog(log.id)} 
                            className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                            title="기록 삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex gap-2">
              <button 
                onClick={() => openManualModal(undefined, 'traditional', 'smoke')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <PlusCircle size={18} />
                흡연 기록 추가
              </button>
              <button 
                onClick={() => openManualModal(undefined, 'traditional', 'purchase')}
                className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <CreditCard size={18} />
                지출 기록 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Log Modal */}
      {manualModal.isOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="font-bold text-zinc-800">
                {format(selectedDate, 'M월 d일')} - {manualModal.editId 
                  ? (manualAction === 'smoke' ? '흡연 기록 수정' : '지출 기록 수정') 
                  : (manualAction === 'smoke' ? '흡연 기록 추가' : '지출 기록 추가')}
              </h3>
              <button onClick={() => setManualModal({ isOpen: false, editId: null })} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {manualAction === 'smoke' && (
                <div>
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

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">{manualAction === 'smoke' ? '개수' : '갑'}</label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setManualCount(Math.max(1, manualCount - 1))}
                    className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center font-bold text-lg text-zinc-800">
                    {manualCount}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setManualCount(manualCount + 1)}
                    className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold"
                  >
                    +
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
                  ? (manualAction === 'smoke' ? '흡연 기록 수정하기' : '지출 기록 수정하기') 
                  : (manualAction === 'smoke' ? '흡연 기록 추가하기' : '지출 기록 추가하기')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
