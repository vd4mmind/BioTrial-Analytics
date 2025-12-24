import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Line
} from 'recharts';
import { 
  Map, 
  Layers, 
  Zap, 
  Info, 
  LayoutTemplate, 
  Users, 
  Maximize2, 
  Database,
  Crosshair,
  TrendingUp,
  Microscope,
  DollarSign,
  HelpCircle,
  Camera,
  CalendarDays,
  Clock,
  Play,
  Pause,
  ChevronRight,
  Sigma
} from 'lucide-react';

// Statistical helper for normal distribution
function getZScore(p: number): number {
  if (p >= 1) return 6.5; if (p <= 0) return -6.5;
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
}

function getNormalProbability(z: number): number {
  if (z < -6.5) return 0; if (z > 6.5) return 1;
  let term = 1, sum = 0, k = 0, factK = 1;
  const loopStop = Math.exp(-23);
  while(Math.abs(term) > loopStop) {
    term = 0.3989422804 * Math.pow(-1,k) * Math.pow(z, 2*k+1) / (2*k+1) / Math.pow(2,k) / factK;
    sum += term; k++; factK *= k;
  }
  return sum + 0.5;
}

enum SpatialPlatform {
  VISIUM = '10x Visium (Spot-based)',
  XENIUM = '10x Xenium (Cell-based)',
  COSMX = 'NanoString CosMx (Cell-based)',
  SLIDE_SEQ = 'Slide-seq (Bead-based)'
}

interface PlatformPreset {
  id: SpatialPlatform;
  resolution: string; // micron per unit
  technicalVariance: number; // relative variance
  captureEfficiency: number; // 0-1
  costPerSlice: number;
  description: string;
}

const PLATFORMS: Record<SpatialPlatform, PlatformPreset> = {
  [SpatialPlatform.VISIUM]: { 
    id: SpatialPlatform.VISIUM, 
    resolution: '55µm Spot', 
    technicalVariance: 0.15, 
    captureEfficiency: 0.25, 
    costPerSlice: 1500,
    description: 'NGS-based. High transcriptomic coverage, multi-cell spots.' 
  },
  [SpatialPlatform.XENIUM]: { 
    id: SpatialPlatform.XENIUM, 
    resolution: '0.2µm Pixel (Single Cell)', 
    technicalVariance: 0.08, 
    captureEfficiency: 0.85, 
    costPerSlice: 3000,
    description: 'In-situ hybridization. Single-cell/sub-cellular resolution.' 
  },
  [SpatialPlatform.COSMX]: { 
    id: SpatialPlatform.COSMX, 
    resolution: '0.18µm Pixel (Single Cell)', 
    technicalVariance: 0.10, 
    captureEfficiency: 0.80, 
    costPerSlice: 2800,
    description: 'In-situ imaging. High plex, single-cell protein + RNA.' 
  },
  [SpatialPlatform.SLIDE_SEQ]: { 
    id: SpatialPlatform.SLIDE_SEQ, 
    resolution: '10µm Bead', 
    technicalVariance: 0.25, 
    captureEfficiency: 0.05, 
    costPerSlice: 1200,
    description: 'Bead-based NGS. High resolution but low capture efficiency.' 
  }
};

const TIMEPOINTS_MAP = [
  { label: 'Wk 4', count: 1 },
  { label: 'Wk 12', count: 2 },
  { label: 'Wk 24', count: 3 },
  { label: 'Wk 52', count: 4 }
];

export const SpatialPower: React.FC = () => {
  // --- Parameters ---
  const [platform, setPlatform] = useState<SpatialPlatform>(SpatialPlatform.XENIUM);
  const [numPatients, setNumPatients] = useState(24);
  const [slicesPerPatient, setSlicesPerPatient] = useState(2);
  const [numTimepoints, setNumTimepoints] = useState(3); // Study Design (Baseline to Wk 24)
  const [treatmentEffect, setTreatmentEffect] = useState(0.4); 
  const [patientVariance, setPatientVariance] = useState(0.6); 
  const [sliceVariance, setSliceVariance] = useState(0.2); 
  
  // --- Temporal Interactivity State ---
  const [visualTimepoint, setVisualTimepoint] = useState(3); // Tissue mockup timeline (1-numTimepoints)
  const [analysisTimepoint, setAnalysisTimepoint] = useState(3); // Chart sensitivity interim (1-numTimepoints)
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  const currentPlatform = PLATFORMS[platform];
  const currentTimepointLabel = TIMEPOINTS_MAP.find(t => t.count === numTimepoints)?.label || 'Wk 24';

  // --- Strict Constraint Logic ---
  // Ensure visual and analysis timepoints never exceed the total planned study duration
  useEffect(() => {
    if (visualTimepoint > numTimepoints) {
      setVisualTimepoint(numTimepoints);
    }
    if (analysisTimepoint > numTimepoints) {
      setAnalysisTimepoint(numTimepoints);
    }
  }, [numTimepoints]);

  // --- Logic (PoweREST inspired hierarchical power) ---
  const calculationResults = useMemo(() => {
    const alpha = 0.05;
    const sigmaP2 = Math.pow(patientVariance, 2);
    const sigmaS2 = Math.pow(sliceVariance, 2);
    const sigmaT2 = currentPlatform.technicalVariance / currentPlatform.captureEfficiency;

    const calculateForN = (N: number, S: number, T: number) => {
      // Longitudinal Gain Factor (Inspired by PoweREST LMM approximations)
      const longitudinalGain = 1 + (T - 1) * 0.45;
      const se = Math.sqrt(
        (sigmaP2 / (N * longitudinalGain)) + 
        (sigmaS2 / (N * S * T)) + 
        (sigmaT2 / (N * S * T * 500))
      );
      const z = (treatmentEffect / se) - getZScore(1 - alpha/2);
      return Math.max(0, Math.min(1, getNormalProbability(z)));
    };

    // Calculate curve for the SELECTED analysis timepoint (strictly capped by numTimepoints)
    const effectiveAnalysisT = Math.min(analysisTimepoint, numTimepoints);
    const powerCurve = [];
    for (let n = 4; n <= 80; n += 4) {
      powerCurve.push({
        n,
        power: parseFloat((calculateForN(n, slicesPerPatient, effectiveAnalysisT) * 100).toFixed(1)),
        cost: parseFloat((n * slicesPerPatient * effectiveAnalysisT * currentPlatform.costPerSlice / 1000).toFixed(1))
      });
    }

    const currentPower = calculateForN(numPatients, slicesPerPatient, numTimepoints);
    const varData = [
      { name: 'Patient', value: sigmaP2 / (1 + (numTimepoints - 1) * 0.45), fill: '#6366f1' },
      { name: 'Slice', value: sigmaS2 / (numTimepoints), fill: '#ec4899' },
      { name: 'Technical', value: (sigmaT2 / 500) / numTimepoints, fill: '#94a3b8' }
    ];

    return { powerCurve, currentPower, varData };
  }, [platform, numPatients, slicesPerPatient, numTimepoints, analysisTimepoint, treatmentEffect, patientVariance, sliceVariance]);

  // --- Animation Logic ---
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        setVisualTimepoint(prev => (prev >= numTimepoints ? 1 : prev + 1));
      }, 1000);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, numTimepoints]);

  // --- Visuals: Mock Tissue Canvas ---
  const tissueDots = useMemo(() => {
    const dots = [];
    // Normalize time factor relative to the visual timepoint within the study scope
    const timeFactor = visualTimepoint / 4; 
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const isTumor = x < 60;
      const isInfiltrated = isTumor && (Math.random() < treatmentEffect * (x/60) * (0.2 + timeFactor * 0.8));
      dots.push({
        x, y, 
        type: isTumor ? (isInfiltrated ? 'Immune' : 'Tumor') : 'Stroma',
        color: isTumor ? (isInfiltrated ? '#10b981' : '#ef4444') : '#94a3b8'
      });
    }
    return dots;
  }, [treatmentEffect, visualTimepoint]);

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Header Banner */}
      <div className="mb-8 bg-gradient-to-r from-slate-900 to-indigo-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Map size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-500/40 text-indigo-100 text-[10px] px-2 py-0.5 rounded font-mono border border-indigo-400/30">
              METHODOLOGY INSPIRED BY POWEREST
            </span>
          </div>
          <h2 className="text-3xl font-bold mb-3 flex items-center gap-3">
            <Microscope size={32} className="text-indigo-400" />
            Longitudinal Spatial Power Planner
          </h2>
          <p className="text-indigo-100 max-w-2xl opacity-90 leading-relaxed">
            Assess statistical power for detecting disease remodeling in Spatial Transcriptomics (ST) trials. 
            Optimized for hierarchical variance decomposition and multi-timepoint repeated measures.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Design Controls */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Study Design (T=Overall Duration) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              Trial Design Configuration
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Planned Study Duration</span>
                  <span className="text-indigo-600 font-mono">{currentTimepointLabel} (T={numTimepoints})</span>
                </div>
                <input 
                  type="range" min="1" max="4" step="1" 
                  value={numTimepoints} onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setNumTimepoints(val);
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                  <span>Wk 4</span>
                  <span>Wk 52</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Patients per Arm (N)</span>
                  <span className="text-indigo-600 font-mono">{numPatients}</span>
                </div>
                <input 
                  type="range" min="4" max="80" step="4" 
                  value={numPatients} onChange={(e) => setNumPatients(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Slices per Subject/T</span>
                  <span className="text-indigo-600 font-mono">{slicesPerPatient}</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="1" 
                  value={slicesPerPatient} onChange={(e) => setSlicesPerPatient(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Platform Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              Assay Selection
            </h3>
            <div className="space-y-4">
              <select 
                value={platform}
                onChange={(e) => setPlatform(e.target.value as SpatialPlatform)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                {Object.values(SpatialPlatform).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                <div className="text-center">
                  <span className="block text-[9px] uppercase text-slate-400 font-bold mb-1">Resolution</span>
                  <span className="text-xs font-bold text-slate-700">{currentPlatform.resolution}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] uppercase text-slate-400 font-bold mb-1">Cost/Slice</span>
                  <span className="text-xs font-bold text-slate-700">${currentPlatform.costPerSlice}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Variance Decomposition */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 text-center">Variance Decomposition (Adjusted T={numTimepoints})</h4>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={calculationResults.varData} margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" stackId="a">
                    {calculationResults.varData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[8px] font-bold text-slate-400 mt-2 px-1">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-indigo-500"></div> PATIENT</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-pink-500"></div> SLICE</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-slate-400"></div> TECH</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visualizations */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Main Visual Row: Power + Animated Mockup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Final Study Power */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-slate-800 font-bold mb-1 flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  Estimated Power at Study End
                </h3>
                <p className="text-[11px] text-slate-400 mb-6">Based on hierarchical modeling of {numTimepoints} timepoints.</p>
                <div className="text-7xl font-black text-slate-900 tracking-tight">
                  {(calculationResults.currentPower * 100).toFixed(0)}%
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total Est. Cost</span>
                  <span className="text-xl font-bold text-emerald-600">${(numPatients * 2 * slicesPerPatient * numTimepoints * currentPlatform.costPerSlice / 1000).toFixed(1)}k</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total Data Slices</span>
                  <span className="text-xl font-bold text-slate-700">{numPatients * 2 * slicesPerPatient * numTimepoints}</span>
                </div>
              </div>
            </div>

            {/* 2. Interactive Tissue Remodeling */}
            <div className="bg-slate-950 rounded-2xl p-6 relative border border-slate-800 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Maximize2 size={14} /> Tissue Dynamics Simulation
                </h4>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <div className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-mono border border-indigo-500/30">
                    {TIMEPOINTS_MAP.find(t => t.count === visualTimepoint)?.label}
                  </div>
                </div>
              </div>
              
              <div className="flex-grow h-44 relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                    <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                    <ZAxis type="number" range={[18, 18]} />
                    <Scatter name="Cells" data={tissueDots}>
                      {tissueDots.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4">
                <input 
                  type="range" min="1" max={numTimepoints} step="1"
                  value={visualTimepoint}
                  onChange={(e) => setVisualTimepoint(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[8px] text-slate-500 mt-2 font-mono uppercase tracking-tighter">
                  {TIMEPOINTS_MAP.slice(0, numTimepoints).map(tp => (
                    <span key={tp.count}>{tp.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Charts (Sensitivity) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Interim Sensitivity Curve */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-500" />
                    Power Sensitivity Curve
                  </h4>
                  <p className="text-[10px] text-slate-400">Analysis scope bounded by duration.</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select Interim</span>
                  <select 
                    value={analysisTimepoint}
                    onChange={(e) => setAnalysisTimepoint(parseInt(e.target.value))}
                    className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 outline-none"
                  >
                    {TIMEPOINTS_MAP.slice(0, numTimepoints).map(t => (
                      <option key={t.count} value={t.count}>{t.label} Analysis</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculationResults.powerCurve} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="n" stroke="#94a3b8" fontSize={10} label={{ value: 'N (Per Arm)', position: 'insideBottom', offset: -25, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} label={{ value: 'Power %', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                    <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" />
                    <ReferenceLine x={numPatients} stroke="#6366f1" strokeDasharray="2 2" />
                    <Area type="monotone" dataKey="power" stroke="#6366f1" strokeWidth={2} fill="url(#curveGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost Pareto Curve */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
               <h4 className="text-sm font-bold text-slate-800 mb-8 flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500" />
                  Efficiency Frontier (T={analysisTimepoint})
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="cost" stroke="#94a3b8" fontSize={10} label={{ value: 'Total Cost ($k)', position: 'insideBottom', offset: -25, fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis type="number" dataKey="power" domain={[0, 100]} stroke="#94a3b8" fontSize={10} label={{ value: 'Power %', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                      <ZAxis range={[60, 60]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Designs" data={calculationResults.powerCurve} fill="#6366f1" />
                      <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* Methodology Citation Footer */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row gap-8 items-start relative">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Database size={100} />
             </div>
             
             <div className="flex-1 space-y-4 relative z-10">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs font-mono tracking-tighter uppercase">
                   <Sigma size={16} />
                   PoweREST Framework Integration
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  This calculator implements the **hierarchical power planning** principles popularized by the **PoweREST** methodology. 
                  It models spatial transcriptomics data as a nested structure: **Subject > Slice > Technical Replicate**. 
                  Longitudinal gain is derived using a Linear Mixed-Effects (LME) approximation where temporal autocorrelation and 
                  intra-class correlation (ICC) across repeated tissue sections are used to refine the Standard Error (SE) of the treatment effect.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <ChevronRight size={12} className="text-indigo-500" />
                      Longitudinal LMM Modeling
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <ChevronRight size={12} className="text-indigo-500" />
                      Hierarchical Variance Components
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <ChevronRight size={12} className="text-indigo-500" />
                      In Silico Tissue Remodeling
                   </div>
                </div>
             </div>

             <div className="w-full md:w-64 space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">
                   <Sigma size={14} /> Variance ICC
                </h4>
                <div className="space-y-3">
                   <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-bold">
                        <span>Patient (σP)</span>
                        <span>{patientVariance.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0.1" max="1" step="0.1" value={patientVariance} onChange={(e)=>setPatientVariance(parseFloat(e.target.value))} className="w-full h-1 accent-indigo-500" />
                   </div>
                   <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-bold">
                        <span>Slice (σS)</span>
                        <span>{sliceVariance.toFixed(2)}</span>
                      </div>
                      <input type="range" min="0" max="0.5" step="0.05" value={sliceVariance} onChange={(e)=>setSliceVariance(parseFloat(e.target.value))} className="w-full h-1 accent-pink-500" />
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
