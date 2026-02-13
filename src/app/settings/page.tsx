'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import * as motion from 'motion/react-client';
import { AnimatePresence } from 'motion/react';

interface ScheduleEntry {
  dayOfWeek: number;
  time: string;
  classType: string;
  location: 'sweat-lab' | 'fusion-fitness';
  preferredSpots: string[];
  instructor?: string;
}

interface ScheduleConfig {
  schedules: ScheduleEntry[];
  locations: Record<string, { id: string; region: string }>;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLASS_TYPES = ['SCULPT', 'STRENGTH + SWEAT', 'SWEAT LAB', 'DRENCHED', 'RIDE', 'RESTORE'];
const LOCATIONS: Record<string, string> = { 'fusion-fitness': 'Fusion Fitness', 'sweat-lab': 'Sweat Lab' };

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const classEmoji: Record<string, string> = {
  'SCULPT': '💪',
  'STRENGTH + SWEAT': '🔥',
  'SWEAT LAB': '💧',
  'DRENCHED': '🌊',
  'RIDE': '🚴',
  'RESTORE': '🧘',
};

export default function SettingsPage() {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    dayOfWeek: 1,
    time: '09:00',
    classType: 'SCULPT',
    location: 'fusion-fitness' as 'sweat-lab' | 'fusion-fitness',
    preferredSpots: '',
    instructor: '',
  });

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch('/api/settings');
      const data = await r.json();
      setConfig(data);
    } catch {
      showToast('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const openModal = (idx?: number) => {
    if (idx !== undefined && config) {
      const s = config.schedules[idx];
      setForm({
        dayOfWeek: s.dayOfWeek,
        time: s.time,
        classType: s.classType,
        location: s.location,
        preferredSpots: s.preferredSpots.join(', '),
        instructor: s.instructor || '',
      });
      setEditIndex(idx);
    } else {
      setForm({ dayOfWeek: 1, time: '09:00', classType: 'SCULPT', location: 'fusion-fitness', preferredSpots: '', instructor: '' });
      setEditIndex(-1);
    }
    setShowModal(true);
  };

  const saveEntry = async () => {
    if (!config) return;
    const entry: ScheduleEntry = {
      dayOfWeek: form.dayOfWeek,
      time: form.time,
      classType: form.classType,
      location: form.location,
      preferredSpots: form.preferredSpots.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (form.instructor.trim()) entry.instructor = form.instructor.trim();

    const newSchedules = [...config.schedules];
    if (editIndex >= 0) {
      newSchedules[editIndex] = entry;
    } else {
      newSchedules.push(entry);
    }

    const newConfig = { ...config, schedules: newSchedules };
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      setConfig(newConfig);
      setShowModal(false);
      showToast('Saved ✓');
    } catch {
      showToast('Save failed ✗');
    }
  };

  const deleteEntry = async (idx: number) => {
    if (!config || !confirm('Delete this class?')) return;
    const newSchedules = config.schedules.filter((_, i) => i !== idx);
    const newConfig = { ...config, schedules: newSchedules };
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      setConfig(newConfig);
      showToast('Deleted');
    } catch {
      showToast('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  const scheduleByDay: Record<number, (ScheduleEntry & { _i: number })[]> = {};
  config?.schedules.forEach((s, i) => {
    (scheduleByDay[s.dayOfWeek] = scheduleByDay[s.dayOfWeek] || []).push({ ...s, _i: i });
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-12 pb-4"
      >
        <h1 className="text-3xl font-bold tracking-tight">Class Schedule</h1>
        <p className="text-gray-500 mt-1">Manage your auto-booking settings</p>
      </motion.div>

      {/* Schedule List */}
      <div className="px-6 space-y-6">
        {[0, 1, 2, 3, 4, 5, 6].map(day => {
          const classes = scheduleByDay[day];
          if (!classes) return null;
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: day * 0.05 }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-[#e8829a] mb-3 pl-1">{DAYS[day]}</p>
              <div className="space-y-3">
                {classes.sort((a, b) => a.time.localeCompare(b.time)).map(entry => (
                  <motion.div
                    key={entry._i}
                    layout
                    className="bg-white rounded-2xl p-4 shadow-sm relative group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-[#fef0f3] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {classEmoji[entry.classType] || '🏋️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[15px]">{entry.classType}</p>
                          <p className="text-[#e8829a] font-semibold text-sm">{formatTime12(entry.time)}</p>
                        </div>
                        <div className="text-gray-500 text-sm mt-0.5">
                          <span>{LOCATIONS[entry.location]}</span>
                          {entry.instructor && <span> • {entry.instructor}</span>}
                        </div>
                        {entry.preferredSpots.length > 0 && (
                          <div className="text-gray-400 text-xs mt-1">Spots: {entry.preferredSpots.join(', ')}</div>
                        )}
                      </div>
                    </div>
                    {/* Edit/Delete Buttons */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal(entry._i)}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm hover:bg-gray-200 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteEntry(entry._i)}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm hover:bg-red-100 transition-colors"
                      >
                        🗑
                      </button>
                    </div>
                    {/* Mobile: always show actions */}
                    <div className="flex gap-1 mt-3 sm:hidden">
                      <button
                        onClick={() => openModal(entry._i)}
                        className="flex-1 py-2 rounded-xl bg-gray-50 text-sm font-medium text-gray-600 active:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEntry(entry._i)}
                        className="flex-1 py-2 rounded-xl bg-gray-50 text-sm font-medium text-red-500 active:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {config?.schedules.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🏋️‍♀️</p>
            <p>No classes scheduled yet</p>
            <p className="text-sm mt-1">Add your first class below!</p>
          </div>
        )}
      </div>

      {/* Add Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="px-6 mt-6"
      >
        <button
          onClick={() => openModal()}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 font-medium hover:border-[#e8829a] hover:text-[#e8829a] transition-all active:scale-[0.98]"
        >
          + Add Class
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-6">{editIndex >= 0 ? 'Edit Class' : 'Add Class'}</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Day</label>
                  <select
                    value={form.dayOfWeek}
                    onChange={e => setForm({ ...form, dayOfWeek: parseInt(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base"
                  >
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Class Type</label>
                <select
                  value={form.classType}
                  onChange={e => setForm({ ...form, classType: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base"
                >
                  {CLASS_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Location</label>
                  <select
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value as 'sweat-lab' | 'fusion-fitness' })}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base"
                  >
                    {Object.entries(LOCATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Instructor</label>
                  <input
                    type="text"
                    value={form.instructor}
                    onChange={e => setForm({ ...form, instructor: e.target.value })}
                    placeholder="Optional"
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Preferred Spots</label>
                <input
                  type="text"
                  value={form.preferredSpots}
                  onChange={e => setForm({ ...form, preferredSpots: e.target.value })}
                  placeholder="e.g. 18, 8, 9"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-gray-100 font-semibold text-gray-600 active:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEntry}
                  className="flex-1 py-4 rounded-2xl bg-[#e8829a] font-semibold text-white active:bg-[#d4667e] transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-3 px-6">
          <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-[#e8829a] transition-colors">
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium mt-0.5">Home</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center text-[#e8829a]">
            <span className="text-xl">⚙️</span>
            <span className="text-xs font-medium mt-0.5">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
