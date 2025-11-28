
import React from 'react';
import { Settings, RefreshCw, Activity, Users, TrendingUp, Clock } from 'lucide-react';
import { SimulationConfig, SCENARIO_PRESETS, TimeProfileType } from '../services/simulation';

interface SimulationConfigCardProps {
  config: SimulationConfig;
  onConfigChange: (newConfig: SimulationConfig) => void;
  onRegenerate: () => void;
  isLoading: boolean;
}

export const SimulationConfigCard: React.FC<SimulationConfigCardProps> = ({ 
  config, 
  onConfigChange, 
  onRegenerate,
  isLoading
}) => {

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    if (SCENARIO_PRESETS[presetName]) {
      onConfigChange(SCENARIO_PRESETS[presetName]);
    }
  };

  const handleChange = (field: keyof SimulationConfig, value: any) => {
    onConfigChange({
      ...config,
      scenarioName: 'Custom', // Switch to custom when modified
      [field]: value
    });
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6 animate-in fade-in slide-in-from-top-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Settings size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Simulation Parameters</h3>
            <p className="text-xs text-slate-500">Configure the underlying generative model.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="flex-1 md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={SCENARIO_PRESETS[config.scenarioName] ? config.scenarioName : 'Custom'}
            onChange={handlePresetChange}
          >
            <option value="Custom" disabled>Custom Scenario</option>
            {Object.keys(SCENARIO_PRESETS).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
          
          <button 
            onClick={onRegenerate}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow'}`}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Simulating...' : 'Regenerate Data'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Drug Efficacy */}
        <div className="space-y-3">
          <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <div className="flex items-center gap-1.5"><TrendingUp size={14} /> Drug Effect (Max)</div>
            <span className="text-indigo-600 font-mono">{(config.drugEffectSize * 100).toFixed(0)}%</span>
          </label>
          <input 
            type="range" min="0" max="1" step="0.05"
            value={Math.abs(config.drugEffectSize)}
            onChange={(e) => handleChange('drugEffectSize', -parseFloat(e.target.value))} // Assuming improvement is negative for consistency with sliders
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <p className="text-[10px] text-slate-400">Peak magnitude of improvement over baseline for the high dose arm.</p>
        </div>

        {/* Placebo Effect */}
        <div className="space-y-3">
          <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
             <div className="flex items-center gap-1.5"><Activity size={14} /> Placebo Effect</div>
             <span className="text-slate-700 font-mono">{(config.placeboEffectSize * 100).toFixed(0)}%</span>
          </label>
          <input 
            type="range" min="0" max="0.5" step="0.01"
            value={Math.abs(config.placeboEffectSize)}
            onChange={(e) => handleChange('placeboEffectSize', -parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
          />
          <p className="text-[10px] text-slate-400">Magnitude of response in the placebo arm (Placebo Drift).</p>
        </div>

        {/* Variability */}
        <div className="space-y-3">
          <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
             <div className="flex items-center gap-1.5"><Activity size={14} /> Noise (CV)</div>
             <span className="text-pink-600 font-mono">{(config.variability * 100).toFixed(0)}%</span>
          </label>
          <input 
            type="range" min="0.05" max="1.0" step="0.05"
            value={config.variability}
            onChange={(e) => handleChange('variability', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <p className="text-[10px] text-slate-400">Combined biological and technical variability (Standard Deviation / Mean).</p>
        </div>

        {/* Responder Rate */}
        <div className="space-y-3">
          <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
             <div className="flex items-center gap-1.5"><Users size={14} /> Responder Rate</div>
             <span className="text-emerald-600 font-mono">{(config.responderRate * 100).toFixed(0)}%</span>
          </label>
          <input 
            type="range" min="0" max="1" step="0.1"
            value={config.responderRate}
            onChange={(e) => handleChange('responderRate', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <p className="text-[10px] text-slate-400">Percentage of treated patients exhibiting the drug effect.</p>
        </div>
      </div>
      
      {/* Row 2: Time Profile */}
      <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="flex items-center gap-4">
            <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap flex items-center gap-2">
              <Clock size={14} /> Time Profile
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg w-full">
               {['linear', 'delayed', 'biphasic'].map((profile) => (
                 <button
                   key={profile}
                   onClick={() => handleChange('timeProfile', profile)}
                   className={`flex-1 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                     config.timeProfile === profile 
                       ? 'bg-white text-indigo-600 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   {profile}
                 </button>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};
