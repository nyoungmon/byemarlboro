import React, { useMemo, useState } from 'react';
import { SmokeLog } from '../types';
import { format, subDays, isSameDay, startOfDay, eachDayOfInterval, eachMonthOfInterval, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getKSTDate } from '../utils';

interface StatsProps {
  logs: SmokeLog[];
}

export function Stats({ logs }: StatsProps) {
  const [viewMode, setViewMode] = useState<'all' | '7days' | 'month'>('all');
  const [summaryMonth, setSummaryMonth] = useState(startOfMonth(getKSTDate()));

  const prevSummaryMonth = () => setSummaryMonth(subMonths(summaryMonth, 1));
  const nextSummaryMonth = () => setSummaryMonth(addMonths(summaryMonth, 1));

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
      const traditional = dayLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).length;
      const electronic = dayLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).length;
      const traditionalCost = dayLogs.filter(l => l.type === 'traditional').reduce((sum, log) => sum + log.cost, 0);
      const electronicCost = dayLogs.filter(l => l.type === 'electronic').reduce((sum, log) => sum + log.cost, 0);
      const cost = traditionalCost + electronicCost;

      return {
        date: format(day, 'MM/dd', { locale: ko }),
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
      const traditional = monthLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).length;
      const electronic = monthLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).length;
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

  const totalTraditional = summaryLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).length;
  const totalElectronic = summaryLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).length;
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
      if (log.tag) {
        tags[log.tag] = (tags[log.tag] || 0) + 1;
      }
      
      const hour = getKSTDate(log.timestamp).getHours();
      if (hour >= 0 && hour < 6) times['새벽 (00~06)']++;
      else if (hour >= 6 && hour < 12) times['오전 (06~12)']++;
      else if (hour >= 12 && hour < 18) times['오후 (12~18)']++;
      else times['저녁 (18~24)']++;
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
                  <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(val) => val === 0 ? '0' : val.toLocaleString()} />
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
                  <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(val) => val === 0 ? '0' : val.toLocaleString()} />
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
                const traditional = dayLogs.filter(l => l.type === 'traditional' && (!l.action || l.action === 'smoke')).length;
                const electronic = dayLogs.filter(l => l.type === 'electronic' && (!l.action || l.action === 'smoke')).length;
                const cost = dayLogs.reduce((sum, log) => sum + log.cost, 0);
                const isCurrentMonth = isSameMonth(day, summaryMonth);
                const isTodayKST = isSameDay(day, getKSTDate());

                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[64px] p-1 border border-zinc-50 rounded-lg flex flex-col items-center ${isCurrentMonth ? 'bg-white' : 'bg-zinc-50 opacity-40'}`}
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
    </div>
  );
}
