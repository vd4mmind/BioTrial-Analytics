
import React, { useEffect, useState } from 'react';
import { X, BarChart2, Clock, Database, Users, Trash2 } from 'lucide-react';
import { analytics, AnalyticsEvent, UserFeedback, UsageStats } from '../services/analytics';

interface AdminStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminStatsModal: React.FC<AdminStatsModalProps> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'feedback'>('overview');
  const [userId, setUserId] = useState('');

  const refreshData = () => {
    setEvents(analytics.getEvents());
    setFeedbacks(analytics.getFeedbacks());
    setStats(analytics.getStats());
    setUserId(analytics.getUserId());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-700">
        
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <BarChart2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Admin Usage Tracker</h3>
              <p className="text-xs text-slate-400 font-mono">Device ID: {userId.substring(0, 8)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Event Logs ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'feedback' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            User Feedback ({feedbacks.length})
          </button>
          <div className="ml-auto p-2">
            <button 
              onClick={() => { if(confirm('Clear all tracking data?')) { analytics.clearData(); onClose(); } }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 size={14} /> Reset Data
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <Users size={18} />
                    <span className="text-xs font-bold uppercase">Total Sessions</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-800">{stats.totalSessions}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <Clock size={18} />
                    <span className="text-xs font-bold uppercase">Total Time Spent</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-800">{formatDuration(stats.totalTimeSpentSec)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <Database size={18} />
                    <span className="text-xs font-bold uppercase">Total Events</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-800">{events.length}</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4">Event Distribution</h4>
                <div className="space-y-3">
                  {Object.entries(stats.eventCounts).sort(([,a], [,b]) => (b as number) - (a as number)).map(([key, count]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{key}</span>
                        <span className="text-slate-500">{count as number}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ width: `${((count as number) / (events.length || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-semibold text-slate-600">Time</th>
                    <th className="p-3 font-semibold text-slate-600">Event Type</th>
                    <th className="p-3 font-semibold text-slate-600">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {events.map(event => (
                    <tr key={event.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          event.type === 'SIMULATION_RUN' ? 'bg-blue-100 text-blue-700' :
                          event.type === 'DATA_UPLOAD' ? 'bg-green-100 text-green-700' :
                          event.type === 'FEEDBACK_SUBMIT' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {event.type}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500 max-w-xs truncate">
                        {JSON.stringify(event.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {feedbacks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">No feedback received yet.</div>
              ) : (
                feedbacks.map(fb => (
                  <div key={fb.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={star <= fb.rating ? "text-amber-400" : "text-slate-200"}>★</span>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">{new Date(fb.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{fb.comment}</p>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
