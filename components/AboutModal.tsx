
import React from 'react';
import { X, Activity, BarChart2, Calculator, Database, Zap, ChevronRight } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 text-white opacity-10 rotate-12">
            <Activity size={180} />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2 tracking-tight">Welcome to BioTrial Analytics</h2>
            <p className="text-indigo-100 max-w-md text-lg leading-relaxed opacity-90">
              A comprehensive dashboard for visualizing clinical trial biomarker data and planning statistical power.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all backdrop-blur-md"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 bg-white">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
            Platform Capabilities
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            <div className="flex gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-blue-100">
                <Database size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-lg">Simulated Cohorts</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Generate realistic trial data (N=600) with configurable scenarios: Standard Efficacy, Mixed Results, or Failed Trial.
                </p>
              </div>
            </div>

            <div className="flex gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-purple-100">
                <BarChart2 size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-lg">Advanced Analytics</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Visualize longitudinal trends, efficacy heatmaps, and calculate Area Under the Curve (AUC) using trapezoidal rules.
                </p>
              </div>
            </div>

            <div className="flex gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-emerald-100">
                <Calculator size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-lg">Power Calculator</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Plan studies for ELISA, Olink, and SomaScan. Accounts for biological variance and multiple testing correction.
                </p>
              </div>
            </div>

             <div className="flex gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-amber-100">
                <Zap size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-lg">Custom Biomarkers</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Define custom endpoints with specific units and directionality to tailor the dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={onClose}
              className="group flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
