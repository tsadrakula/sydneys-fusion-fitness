'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as motion from 'motion/react-client';
import type { ScheduleConfig, ScheduleEntry } from '@/lib/settings';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LOCATIONS: Record<string, string> = { 'fusion-fitness': 'Fusion Fitness', 'sweat-lab': 'Sweat Lab' };

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getNextClass(schedules: ScheduleEntry[]): { entry: ScheduleEntry; dayLabel: string } | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Check today first
  const todayClasses = schedules
    .filter(s => s.dayOfWeek === currentDay && s.time > currentTime)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todayClasses.length > 0) {
    return { entry: todayClasses[0], dayLabel: 'Today' };
  }

  // Check upcoming days
  for (let offset = 1; offset <= 7; offset++) {
    const targetDay = (currentDay + offset) % 7;
    const dayClasses = schedules
      .filter(s => s.dayOfWeek === targetDay)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (dayClasses.length > 0) {
      const label = offset === 1 ? 'Tomorrow' : DAYS[targetDay];
      return { entry: dayClasses[0], dayLabel: label };
    }
  }

  return null;
}

const classEmoji: Record<string, string> = {
  'SCULPT': '💪',
  'STRENGTH + SWEAT': '🔥',
  'SWEAT LAB': '💧',
  'DRENCHED': '🌊',
  'RIDE': '🚴',
  'RESTORE': '🧘',
};

export default function Dashboard() {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  const nextClass = config ? getNextClass(config.schedules) : null;
  const totalClasses = config?.schedules.length || 0;
  const scheduleByDay: Record<number, ScheduleEntry[]> = {};
  config?.schedules.forEach(s => {
    (scheduleByDay[s.dayOfWeek] = scheduleByDay[s.dayOfWeek] || []).push(s);
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-12 pb-6"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Hey Sydney <span className="inline-block">👋</span>
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s your fitness week</p>
      </motion.div>

      {/* Next Class Card */}
      {nextClass && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-6 mb-8"
        >
          <div className="bg-gradient-to-br from-[#e8829a] to-[#d4667e] rounded-3xl p-6 text-white shadow-lg shadow-[#e8829a]/20">
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">Next Class • {nextClass.dayLabel}</p>
            <h2 className="text-2xl font-bold mb-1">
              {classEmoji[nextClass.entry.classType] || '🏋️'} {nextClass.entry.classType}
            </h2>
            <p className="text-white/90 text-lg">{formatTime12(nextClass.entry.time)}</p>
            <div className="mt-3 flex items-center gap-4 text-white/80 text-sm">
              <span>📍 {LOCATIONS[nextClass.entry.location] || nextClass.entry.location}</span>
              {nextClass.entry.instructor && <span>👤 {nextClass.entry.instructor}</span>}
            </div>
            {nextClass.entry.preferredSpots.length > 0 && (
              <div className="mt-2 text-white/70 text-sm">
                💺 Spots: {nextClass.entry.preferredSpots.join(', ')}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="px-6 mb-8 grid grid-cols-2 gap-4"
      >
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-[#e8829a]">{totalClasses}</p>
          <p className="text-gray-500 text-sm mt-1">Classes / Week</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-[#e8829a]">{Object.keys(scheduleByDay).length}</p>
          <p className="text-gray-500 text-sm mt-1">Active Days</p>
        </div>
      </motion.div>

      {/* Weekly Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="px-6"
      >
        <h3 className="text-lg font-semibold mb-4">Weekly Schedule</h3>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map(day => {
            const classes = scheduleByDay[day];
            if (!classes) return null;
            return classes.sort((a, b) => a.time.localeCompare(b.time)).map((entry, idx) => (
              <motion.div
                key={`${day}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + day * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-[#fef0f3] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {classEmoji[entry.classType] || '🏋️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[15px] truncate">{entry.classType}</p>
                    <p className="text-[#e8829a] font-semibold text-sm flex-shrink-0 ml-2">{formatTime12(entry.time)}</p>
                  </div>
                  <div className="text-gray-500 text-sm flex items-center gap-2 mt-0.5">
                    <span className="font-medium text-gray-700">{DAYS[entry.dayOfWeek].slice(0, 3)}</span>
                    <span>•</span>
                    <span>{LOCATIONS[entry.location] || entry.location}</span>
                    {entry.instructor && <><span>•</span><span>{entry.instructor}</span></>}
                  </div>
                </div>
              </motion.div>
            ));
          })}
        </div>
      </motion.div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-3 px-6">
          <Link href="/" className="flex flex-col items-center text-[#e8829a]">
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium mt-0.5">Home</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-[#e8829a] transition-colors">
            <span className="text-xl">⚙️</span>
            <span className="text-xs font-medium mt-0.5">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
