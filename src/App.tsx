/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, BarChart2, Settings as SettingsIcon, LogIn, LogOut, Cloud } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Stats } from './components/Stats';
import { SettingsView } from './components/SettingsView';
import { SmokeLog, Settings, SmokeType } from './types';
import { getKSTDateString } from './utils';
import { auth, db, signInWithGoogle, logOut, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch, deleteField } from 'firebase/firestore';

const defaultSettings: Settings = {
  traditionalCostPerPack: 4500,
  traditionalSticksPerPack: 20,
  electronicCostPerPack: 4800,
  electronicSticksPerPack: 20,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stats' | 'settings'>('dashboard');
  const [kstDate, setKstDate] = useState(getKSTDateString());
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const [logs, setLogs] = useState<SmokeLog[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Data Sync Listener
  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      setLogs([]);
      setSettings(defaultSettings);
      return;
    }

    const userId = user.uid;

    // Listen to Settings
    const settingsRef = doc(db, `users/${userId}/settings/default`);
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setSettings({
          traditionalCostPerPack: data.traditionalCostPerPack ?? 4500,
          traditionalSticksPerPack: data.traditionalSticksPerPack ?? 20,
          electronicCostPerPack: data.electronicCostPerPack ?? 4800,
          electronicSticksPerPack: data.electronicSticksPerPack ?? 20,
        });
      } else {
        setDoc(settingsRef, { ...defaultSettings, userId }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${userId}/settings/default`));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/default`);
    });

    // Listen to Logs
    const logsRef = collection(db, `users/${userId}/logs`);
    const q = query(logsRef, orderBy('timestamp', 'asc'));
    const unsubLogs = onSnapshot(q, (snapshot) => {
      const newLogs: SmokeLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newLogs.push({
          id: doc.id,
          type: data.type,
          action: data.action,
          timestamp: data.timestamp,
          cost: data.cost,
          tag: data.tag,
          count: data.count ?? 1,
        });
      });
      setLogs(newLogs);
      
      // Check for migration after first load
      checkAndMigrateData(userId, newLogs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/logs`);
    });

    return () => {
      unsubSettings();
      unsubLogs();
    };
  }, [user, isAuthReady]);

  const checkAndMigrateData = async (userId: string, currentLogs: SmokeLog[]) => {
    const localLogsStr = localStorage.getItem('smoke_logs');
    const localSettingsStr = localStorage.getItem('smoke_settings');
    
    if (!localLogsStr && !localSettingsStr) return;
    
    if (currentLogs.length > 0) {
      localStorage.removeItem('smoke_logs');
      localStorage.removeItem('smoke_settings');
      return;
    }

    setIsMigrating(true);
    try {
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      const commitCurrentBatch = () => {
        batches.push(currentBatch.commit());
        currentBatch = writeBatch(db);
        operationCount = 0;
      };
      
      if (localSettingsStr) {
        const localSettings = JSON.parse(localSettingsStr);
        const settingsRef = doc(db, `users/${userId}/settings/default`);
        currentBatch.set(settingsRef, {
          userId,
          traditionalCostPerPack: Math.max(0, Number(localSettings.traditionalCostPerPack) || 4500),
          traditionalSticksPerPack: Math.max(1, Number(localSettings.traditionalSticksPerPack) || 20),
          electronicCostPerPack: Math.max(0, Number(localSettings.electronicCostPerPack) || 4800),
          electronicSticksPerPack: Math.max(1, Number(localSettings.electronicSticksPerPack) || 20),
        });
        operationCount++;
      }

      if (localLogsStr) {
        const localLogs: SmokeLog[] = JSON.parse(localLogsStr);
        localLogs.forEach(log => {
          if (operationCount >= 490) {
            commitCurrentBatch();
          }
          const logRef = doc(collection(db, `users/${userId}/logs`));
          const logData: any = {
            userId,
            type: log.type === 'electronic' ? 'electronic' : 'traditional',
            action: log.action === 'purchase' ? 'purchase' : 'smoke',
            timestamp: Number(log.timestamp) || Date.now(),
            cost: Math.max(0, Number(log.cost) || 0),
          };
          if (log.tag && typeof log.tag === 'string') {
            logData.tag = log.tag.substring(0, 100);
          }
          currentBatch.set(logRef, logData);
          operationCount++;
        });
      }

      if (operationCount > 0) {
        batches.push(currentBatch.commit());
      }
      
      await Promise.all(batches);
      
      localStorage.removeItem('smoke_logs');
      localStorage.removeItem('smoke_settings');
    } catch (error) {
      console.error("Migration failed", error);
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setKstDate(getKSTDateString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addSmoke = async (type: SmokeType, tag?: string, timestamp?: number, count: number = 1) => {
    if (!user) return;
    try {
      const logRef = doc(collection(db, `users/${user.uid}/logs`));
      const newLog: any = {
        userId: user.uid,
        type,
        action: 'smoke',
        timestamp: timestamp || Date.now(),
        cost: 0,
        count: count,
      };
      if (tag) {
        newLog.tag = tag;
      }
      await setDoc(logRef, newLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/logs`);
    }
  };

  const addPurchase = async (type: SmokeType, timestamp?: number, count: number = 1) => {
    if (!user) return;
    const cost = type === 'traditional' 
      ? settings.traditionalCostPerPack 
      : settings.electronicCostPerPack;
      
    try {
      const logRef = doc(collection(db, `users/${user.uid}/logs`));
      await setDoc(logRef, {
        userId: user.uid,
        type,
        action: 'purchase',
        timestamp: timestamp || Date.now(),
        cost: cost * count,
        count: count,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/logs`);
    }
  };

  const updateLog = async (id: string, updates: Partial<SmokeLog>) => {
    if (!user) return;
    try {
      const logRef = doc(db, `users/${user.uid}/logs/${id}`);
      const updateData: any = { ...updates };
      
      // If tag is explicitly set to undefined, delete it from Firestore
      if ('tag' in updates && updates.tag === undefined) {
        updateData.tag = deleteField();
      }
      
      await setDoc(logRef, updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/logs/${id}`);
    }
  };

  const deleteLog = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/logs/${id}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/logs/${id}`);
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/settings/default`), {
        ...newSettings,
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/settings/default`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Cloud className="text-indigo-400 mb-4" size={48} />
          <p className="text-zinc-500 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Cloud className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-800 mb-2">클라우드 동기화</h1>
          <p className="text-zinc-500 text-sm mb-8">
            로그인하면 기기를 변경해도<br/>기록이 안전하게 영구 보존됩니다.
          </p>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            구글 계정으로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-50 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      {isMigrating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-zinc-800 font-bold">데이터 동기화 중...</p>
          <p className="text-zinc-500 text-sm mt-2">잠시만 기다려주세요</p>
        </div>
      )}
      
      <header className="bg-white px-6 py-4 border-b border-zinc-100 sticky top-0 z-10 flex justify-between items-center">
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
        {activeTab === 'settings' && (
          <button onClick={logOut} className="text-zinc-400 hover:text-red-500 transition-colors" title="로그아웃">
            <LogOut size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard logs={logs} addSmoke={addSmoke} addPurchase={addPurchase} deleteLog={deleteLog} updateLog={updateLog} />}
        {activeTab === 'stats' && <Stats logs={logs} addSmoke={addSmoke} addPurchase={addPurchase} deleteLog={deleteLog} updateLog={updateLog} />}
        {activeTab === 'settings' && <SettingsView settings={settings} onUpdateSettings={updateSettings} />}
      </main>

      <nav className="bg-white border-t border-zinc-100 flex justify-around p-3 sticky bottom-0 w-full">
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
