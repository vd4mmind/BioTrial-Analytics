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
  Sigma,
  Download,
  FileText,
  Share2
} from 'lucide-react';
import { analytics } from '../services/analytics';

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
  resolution: string; 
  technicalVariance: number; 
  captureEfficiency: number; 
  costPerSlice: number;
  description: string;
  effectiveObservations: number; // O_eff: Impacts technical noise scaling
  resolutionGain: number; // Multiplier to reduce biological variance (composition noise)
}

const PLATFORMS: Record<SpatialPlatform, PlatformPreset> = {
  [SpatialPlatform.VISIUM]: { 
    id: SpatialPlatform.VISIUM, 
    resolution: '55µm Spot', 
    technicalVariance: 0.15, 
    captureEfficiency: 0.25, 
    costPerSlice: 1500,
    description: 'NGS-based. High transcriptomic coverage, multi-cell spots.',
    effectiveObservations: 500,
    resolutionGain: 1.0 
  },
  [SpatialPlatform.XENIUM]: { 
    id: SpatialPlatform.XENIUM, 
    resolution: '0.2µm Pixel', 
    technicalVariance: 0.08, 
    captureEfficiency: 0.85, 
    costPerSlice: 3000,
    description: 'In-situ hybridization. Single-cell resolution. High precision.',
    effectiveObservations: 5000,
    resolutionGain: 0.82 // Significant reduction in compositional noise
  },
  [SpatialPlatform.COSMX]: { 
    id: SpatialPlatform.COSMX, 
    resolution: '0.18µm Pixel', 
    technicalVariance: 0.10, 
    captureEfficiency: 0.80, 
    costPerSlice: 2800,
    description: 'In-situ imaging. High plex, single-cell protein + RNA.',
    effectiveObservations: 4500,
    resolutionGain: 0.85
  },
  [SpatialPlatform.SLIDE_SEQ]: { 
    id: SpatialPlatform.SLIDE_SEQ, 
    resolution: '10µm Bead', 
    technicalVariance: 0.25, 
    captureEfficiency: 0.05, 
    costPerSlice: 1200,
    description: 'Bead-based NGS. High resolution but low capture efficiency.',
    effectiveObservations: 800,
    resolutionGain: 0.95
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
  const [numTimepoints, setNumTimepoints] = useState(3);
  const [treatmentEffect, setTreatmentEffect] = useState(0.4); 
  const [patientVariance, setPatientVariance] = useState(0.6); 
  const [sliceVariance, setSliceVariance] = useState(0.2); 
  
  // --- Temporal Interactivity State ---
  const [visualTimepoint, setVisualTimepoint] = useState(3); 
  const [analysisTimepoint, setAnalysisTimepoint] = useState(3); 
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  const currentPlatform = PLATFORMS[platform];
  const currentTimepointLabel = TIMEPOINTS_MAP.find(t => t.count === numTimepoints)?.label || 'Wk 24';

  // --- Strict Constraint Logic ---
  useEffect(() => {
    if (visualTimepoint > numTimepoints) setVisualTimepoint(numTimepoints);
    if (analysisTimepoint > numTimepoints) setAnalysisTimepoint(numTimepoints);
  }, [numTimepoints]);

  // --- Logic (PoweREST inspired hierarchical power) ---
  const calculationResults = useMemo(() => {
    const alpha = 0.05;
    
    // Apply Resolution Gain: Single-cell platforms reduce biological noise by isolating cell states
    const adjPatientVariance = patientVariance * currentPlatform.resolutionGain;
    
    const sigmaP2 = Math.pow(adjPatientVariance, 2);
    const sigmaS2 = Math.pow(sliceVariance, 2);
    
    // Technical variance is heavily modulated by Capture Efficiency and Platform Resolution
    const sigmaT2 = currentPlatform.technicalVariance / currentPlatform.captureEfficiency;

    const calculateForN = (N: number, S: number, T: number) => {
      const longitudinalGain = 1 + (T - 1) * 0.45;
      const se = Math.sqrt(
        (sigmaP2 / (N * longitudinalGain)) + 
        (sigmaS2 / (N * S * T)) + 
        (sigmaT2 / (N * S * T * currentPlatform.effectiveObservations))
      );
      const z = (treatmentEffect / se) - getZScore(1 - alpha/2);
      return Math.max(0, Math.min(1, getNormalProbability(z)));
    };

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
    
    // Update variance decomposition components
    const varData = [
      { name: 'Biological', value: sigmaP2 / (1 + (numTimepoints - 1) * 0.45), fill: '#6366f1' },
      { name: 'Slice', value: sigmaS2 / (numTimepoints), fill: '#ec4899' },
      { name: 'Technical', value: (sigmaT2 / currentPlatform.effectiveObservations) / numTimepoints, fill: '#94a3b8' }
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
    const timeFactor = visualTimepoint / 4; 
    for (let i = 0; i < 250; i++) {
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

  const handleDownload = (chartName: string) => {
    analytics.logEvent('DATA_EXPORT', { chart: chartName, platform });
    alert(`Generating high-resolution report for ${chartName}... In a production environment, this would download a PNG/SVG or PDF of the figure.`);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 text-slate-900">
      {/* Header Banner */}
      <div className="mb-8 bg-gradient-to-r from-slate-900 to-indigo-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Map size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-500/40 text-indigo-100 text-[10px] px-2 py-0.5 rounded font-mono border border-indigo-400/30 uppercase tracking-widest">
              Platform-Weighted Simulation v2.2
            </span>
          </div>
          <h2 className="text-3xl font-bold mb-3 flex items-center gap-3">
            <Microscope size={32} className="text-indigo-400" />
            Longitudinal Spatial Power Planner
          </h2>
          <p className="text-indigo-100 max-w-2xl opacity-90 leading-relaxed text-sm">
            Professional workbench for planning high-resolution Spatial Transcriptomics trials. Simulation logic accounts for platform-specific capture efficiency, technical noise, and resolution gains.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Sidebar (Controls & Methodology) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Study Design Controls */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              Trial Parameters
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Study Duration</span>
                  <span className="text-indigo-600 font-mono bg-indigo-50 px-2 rounded">{currentTimepointLabel} (T={numTimepoints})</span>
                </div>
                <input 
                  type="range" min="1" max="4" step="1" 
                  value={numTimepoints} onChange={(e) => setNumTimepoints(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Sample Size (N)</span>
                  <span className="text-indigo-600 font-mono bg-indigo-50 px-2 rounded">{numPatients}</span>
                </div>
                <input 
                  type="range" min="4" max="80" step="4" 
                  value={numPatients} onChange={(e) => setNumPatients(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Assay Platform</span>
                </div>
                <select 
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as SpatialPlatform)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm mb-2 font-medium"
                >
                  {Object.values(SpatialPlatform).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex justify-between items-center">
                   <div>
                      <span className="block text-[8px] uppercase text-indigo-400 font-black mb-0.5 tracking-tighter">Capture Eff.</span>
                      <span className="text-[10px] font-bold text-indigo-900">{(currentPlatform.captureEfficiency * 100).toFixed(0)}%</span>
                   </div>
                   <div className="w-px h-6 bg-indigo-200"></div>
                   <div className="text-right">
                      <span className="block text-[8px] uppercase text-indigo-400 font-black mb-0.5 tracking-tighter">Cost/Slice</span>
                      <span className="text-[10px] font-bold text-indigo-900">${currentPlatform.costPerSlice}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Variance ICC Sidebar Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <Sigma size={14} className="text-pink-500" />
                Variance Decomposition
             </h3>
             <div className="space-y-5">
                <div>
                   <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                      <span>Baseline Bio Variability (σP)</span>
                      <span className="text-indigo-600">{patientVariance.toFixed(1)}</span>
                   </div>
                   <input type="range" min="0.1" max="1" step="0.1" value={patientVariance} onChange={(e)=>setPatientVariance(parseFloat(e.target.value))} className="w-full h-1 accent-indigo-600" />
                </div>
                <div>
                   <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                      <span>Slice Variability (σS)</span>
                      <span className="text-pink-600">{sliceVariance.toFixed(2)}</span>
                   </div>
                   <input type="range" min="0" max="0.5" step="0.05" value={sliceVariance} onChange={(e)=>setSliceVariance(parseFloat(e.target.value))} className="w-full h-1 accent-pink-600" />
                </div>
             </div>
             
             <div className="mt-6">
                <div className="h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={calculationResults.varData} margin={{ left: -15, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" hide />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{fontSize: '10px'}} />
                      <Bar dataKey="value" stackId="a">
                        {calculationResults.varData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between text-[8px] font-black text-slate-400 mt-2 px-1 uppercase tracking-tighter">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-indigo-500"></div> BIOLOGICAL</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-pink-500"></div> SLICE</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-slate-400"></div> TECHNICAL</span>
                </div>
             </div>
          </div>

          {/* Statistical Framework Documentation Card */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-white relative overflow-hidden shadow-lg">
             <div className="absolute -top-4 -right-4 p-4 opacity-5">
                <Database size={120} />
             </div>
             <div className="relative z-10 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs font-mono tracking-widest uppercase mb-1">
                    <Sigma size={16} />
                    Statistical Framework
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight italic">
                    Inspired by the PoweREST framework for hierarchical power planning in Spatial Transcriptomics.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Model 1: Platform Scaling */}
                  <div>
                    <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ChevronRight size={10} /> 1. Platform Scaling & Technical Noise
                    </h4>
                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800 mb-2">
                      <code className="text-[11px] font-mono text-emerald-400">
                        Var<sub>tech_eff</sub> = σ²<sub>tech</sub> / (S × T × O<sub>eff</sub> × ε)
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      Suppresses technical noise by sampling depth. <code className="text-slate-200">ε</code> (Capture Efficiency) and <code className="text-slate-200">O<sub>eff</sub></code> (Resolution) significantly boost statistical precision.
                    </p>
                  </div>

                  {/* Model 2: Resolution Adjusted */}
                  <div>
                    <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ChevronRight size={10} /> 2. Resolution-Adjusted Variance
                    </h4>
                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800 mb-2">
                      <code className="text-[11px] font-mono text-emerald-400">
                        σ²<sub>adj</sub> = σ²<sub>bio</sub> × γ<sub>res</sub>
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      Single-cell platforms reduce compositional noise by isolating pure cell states. <code className="text-slate-200">γ<sub>res</sub></code> models the gain from cellular precision (up to 18% reduction for Xenium).
                    </p>
                  </div>

                  {/* Model 3: Longitudinal LME */}
                  <div>
                    <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ChevronRight size={10} /> 3. Longitudinal Gain Model (LME)
                    </h4>
                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800 mb-2">
                      <code className="text-[11px] font-mono text-emerald-400">
                        Gain<sub>long</sub> = 1 + (T - 1) × ρ
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      Calculates power benefit of repeated measures. <code className="text-slate-200">T</code> is total clinical timepoints and <code className="text-slate-200">ρ</code> is intra-subject correlation (assumed ≈ 0.45).
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono italic">
                    <span>ENGINE: HIE-SPATIAL-v2.2</span>
                    <span>σ, γ, ρ, ε Applied</span>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Expanded Visualizations */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Top Hero: Results & Dynamics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. Final Study Power Hero */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-900 font-black text-xl mb-1 flex items-center gap-2">
                    <Zap size={22} className="text-amber-500" />
                    Projected Power
                  </h3>
                  <p className="text-xs text-slate-400 font-medium tracking-wide">Calculated for {currentTimepointLabel} primary endpoint.</p>
                </div>
                <button onClick={() => handleDownload('Summary')} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                  <Share2 size={18} />
                </button>
              </div>
              
              <div className="my-8 text-center">
                 <div className="text-9xl font-black text-slate-950 tracking-tighter inline-block relative">
                    {(calculationResults.currentPower * 100).toFixed(0)}
                    <span className="text-4xl text-indigo-500 absolute -top-2 -right-10">%</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1">Budget Est.</span>
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">${(numPatients * 2 * slicesPerPatient * numTimepoints * currentPlatform.costPerSlice / 1000).toFixed(1)}k</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1">Total Slices</span>
                  <span className="text-2xl font-black text-slate-800 tracking-tight">{numPatients * 2 * slicesPerPatient * numTimepoints}</span>
                </div>
              </div>
            </div>

            {/* 2. Expanded Tissue Dynamics Simulation */}
            <div className="bg-slate-950 rounded-2xl p-8 relative border border-slate-800 shadow-2xl flex flex-col overflow-hidden min-h-[450px]">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-white/60">
                  <Maximize2 size={16} /> Tissue Dynamics In-Silico
                </h4>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-all transform active:scale-95"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                  </button>
                  <div className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-black border border-indigo-500/20">
                    {TIMEPOINTS_MAP.find(t => t.count === visualTimepoint)?.label}
                  </div>
                </div>
              </div>
              
              <div className="flex-grow relative border border-slate-800/50 rounded-xl overflow-hidden bg-slate-900/40 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                    <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                    <ZAxis type="number" range={[25, 25]} />
                    <Scatter name="Cells" data={tissueDots}>
                      {tissueDots.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8">
                <input 
                  type="range" min="1" max={numTimepoints} step="1"
                  value={visualTimepoint}
                  onChange={(e) => setVisualTimepoint(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-3 font-black uppercase tracking-widest">
                  {TIMEPOINTS_MAP.slice(0, numTimepoints).map(tp => (
                    <span key={tp.count} className={visualTimepoint === tp.count ? 'text-indigo-400' : ''}>{tp.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Charts (Expanded Vertical Space) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Interim Sensitivity Curve */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-600" />
                    Sensitivity Curve
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">Power as a function of sample size (N).</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex flex-col items-end">
                      <select 
                        value={analysisTimepoint}
                        onChange={(e) => setAnalysisTimepoint(parseInt(e.target.value))}
                        className="text-[12px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                      >
                        {TIMEPOINTS_MAP.slice(0, numTimepoints).map(t => (
                          <option key={t.count} value={t.count}>{t.label} Analysis</option>
                        ))}
                      </select>
                   </div>
                   <button onClick={() => handleDownload('Sensitivity Curve')} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                      <Download size={20} />
                   </button>
                </div>
              </div>
              
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculationResults.powerCurve} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="n" stroke="#94a3b8" fontSize={11} fontWeight="bold" label={{ value: 'Cohort Size (N) per Arm', position: 'insideBottom', offset: -25, fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} fontWeight="bold" label={{ value: 'Statistical Power (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                      formatter={(val: number) => [`${val}%`, 'Power']}
                      labelFormatter={(n) => `N = ${n}`}
                    />
                    <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: "80% Threshold", position: 'insideTopRight', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
                    <ReferenceLine x={numPatients} stroke="#6366f1" strokeDasharray="3 3" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="power" stroke="#6366f1" strokeWidth={3} fill="url(#curveGrad)" activeDot={{ r: 6, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost Pareto Curve */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="flex justify-between items-start mb-10">
                  <div>
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <DollarSign size={20} className="text-emerald-500" />
                      Efficiency Frontier
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">N vs. Cost vs. Power optimization.</p>
                  </div>
                  <button onClick={() => handleDownload('Efficiency Frontier')} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                    <Download size={20} />
                  </button>
               </div>
                
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis type="number" dataKey="cost" stroke="#94a3b8" fontSize={11} fontWeight="bold" label={{ value: 'Projected Budget ($k)', position: 'insideBottom', offset: -25, fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                      <YAxis type="number" dataKey="power" domain={[0, 100]} stroke="#94a3b8" fontSize={11} fontWeight="bold" label={{ value: 'Statistical Power (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                      <ZAxis range={[100, 100]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Scatter name="Design Options" data={calculationResults.powerCurve} fill="#10b981" fillOpacity={0.6}>
                        {calculationResults.powerCurve.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.n === numPatients ? '#6366f1' : '#10b981'} />
                        ))}
                      </Scatter>
                      <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};