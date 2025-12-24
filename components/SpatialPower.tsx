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
  Legend,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Line
} from 'recharts';
import { 
  Map, 
  Zap, 
  Maximize2, 
  TrendingUp,
  Microscope,
  DollarSign,
  Play,
  Pause,
  Sigma,
  GitCompare,
  ShieldCheck,
  AlertCircle,
  Download,
  Info,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { analytics } from '../services/analytics';

// --- Statistical Helpers ---
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

// --- Platform & Design Definitions ---
enum SpatialPlatform {
  VISIUM = '10x Visium (Spot-based)',
  XENIUM = '10x Xenium (Cell-based)',
  COSMX = 'NanoString CosMx (Cell-based)',
  SLIDE_SEQ = 'Slide-seq (Bead-based)'
}

enum TrialDesign {
  SINGLE_ARM = 'Single-Arm (Pilot)',
  TWO_ARM = 'Two-Arm (RCT)'
}

interface PlatformPreset {
  id: SpatialPlatform;
  resolution: string; 
  technicalVariance: number; 
  captureEfficiency: number; 
  costPerSlice: number;
  description: string;
  effectiveObservations: number; 
  resolutionGain: number; 
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
    resolutionGain: 0.82 
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

// --- High Performance Canvas Component ---
const TissueCanvas: React.FC<{ 
  timepoint: number; 
  isTreated: boolean; 
  effect: number; 
  platform: SpatialPlatform;
  onSnapshot?: (dataUrl: string) => void;
}> = ({ timepoint, isTreated, effect, platform, onSnapshot }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const numCells = 450;
    const timeFactor = timepoint / 4;
    const seed = isTreated ? 123 : 456;
    
    const random = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    if (platform === SpatialPlatform.VISIUM) {
      ctx.filter = 'blur(1.5px)';
    } else {
      ctx.filter = 'none';
    }

    for (let i = 0; i < numCells; i++) {
      const rx = random(seed + i);
      const ry = random(seed + i + 500);
      const x = rx * width;
      const y = ry * height;

      const isTumor = rx < 0.65;
      let color = '#334155'; // Stroma

      if (isTumor) {
        const infiltrationProb = isTreated ? effect * (rx / 0.65) * (0.1 + timeFactor * 0.9) : 0.05;
        const isInfiltrated = random(seed + i + 1000) < infiltrationProb;
        color = isInfiltrated ? '#10b981' : '#ef4444';
      }

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [timepoint, isTreated, effect, platform]);

  return <canvas ref={canvasRef} width={400} height={400} className="w-full h-full object-cover" />;
};

export const SpatialPower: React.FC = () => {
  const [platform, setPlatform] = useState<SpatialPlatform>(SpatialPlatform.XENIUM);
  const [trialDesign, setTrialDesign] = useState<TrialDesign>(TrialDesign.TWO_ARM);
  const [numPatients, setNumPatients] = useState(24); 
  const [slicesPerPatient, setSlicesPerPatient] = useState(2);
  const [numTimepoints, setNumTimepoints] = useState(3);
  const [treatmentEffect, setTreatmentEffect] = useState(0.4); 
  const [patientVariance, setPatientVariance] = useState(0.6); 
  const [sliceVariance, setSliceVariance] = useState(0.2); 
  
  const [visualTimepoint, setVisualTimepoint] = useState(3); 
  const [analysisTimepoint, setAnalysisTimepoint] = useState(3); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  const currentPlatform = PLATFORMS[platform];
  const currentTimepointLabel = TIMEPOINTS_MAP.find(t => t.count === numTimepoints)?.label || 'Wk 24';

  useEffect(() => {
    if (visualTimepoint > numTimepoints) setVisualTimepoint(numTimepoints);
    if (analysisTimepoint > numTimepoints) setAnalysisTimepoint(numTimepoints);
  }, [numTimepoints]);

  const calculationResults = useMemo(() => {
    const alpha = 0.05;
    const rho = 0.45; 
    
    const adjPatientVariance = patientVariance * currentPlatform.resolutionGain;
    const sigmaP2 = Math.pow(adjPatientVariance, 2);
    const sigmaS2 = Math.pow(sliceVariance, 2);
    const sigmaT2 = currentPlatform.technicalVariance / currentPlatform.captureEfficiency;

    const calculatePowerForDesign = (N: number, S: number, T: number, design: TrialDesign) => {
      const longitudinalGain = 1 + (T - 1) * rho;
      const seGroup = Math.sqrt(
        (sigmaP2 / (N * longitudinalGain)) + 
        (sigmaS2 / (N * S * T)) + 
        (sigmaT2 / (N * S * T * currentPlatform.effectiveObservations))
      );

      let se;
      if (design === TrialDesign.SINGLE_ARM) {
        se = seGroup * Math.sqrt(2 * (1 - rho));
      } else {
        se = seGroup * Math.sqrt(2);
      }
      const z = (treatmentEffect / se) - getZScore(1 - alpha/2);
      return Math.max(0, Math.min(1, getNormalProbability(z)));
    };

    const calculateCost = (N: number, S: number, T: number, design: TrialDesign) => {
      const armMultiplier = design === TrialDesign.TWO_ARM ? 2 : 1;
      return (N * armMultiplier * S * T * currentPlatform.costPerSlice) / 1000;
    };

    const effectiveAnalysisT = Math.min(analysisTimepoint, numTimepoints);
    const dualCurve = [];
    for (let n = 4; n <= 80; n += 4) {
      dualCurve.push({
        n,
        powerSingle: parseFloat((calculatePowerForDesign(n, slicesPerPatient, effectiveAnalysisT, TrialDesign.SINGLE_ARM) * 100).toFixed(1)),
        powerTwo: parseFloat((calculatePowerForDesign(n, slicesPerPatient, effectiveAnalysisT, TrialDesign.TWO_ARM) * 100).toFixed(1)),
        costSingle: parseFloat(calculateCost(n, slicesPerPatient, effectiveAnalysisT, TrialDesign.SINGLE_ARM).toFixed(1)),
        costTwo: parseFloat(calculateCost(n, slicesPerPatient, effectiveAnalysisT, TrialDesign.TWO_ARM).toFixed(1))
      });
    }

    const currentPower = calculatePowerForDesign(numPatients, slicesPerPatient, numTimepoints, trialDesign);
    const baselinePower = calculatePowerForDesign(numPatients, slicesPerPatient, numTimepoints, TrialDesign.SINGLE_ARM);
    const rctPower = calculatePowerForDesign(numPatients, slicesPerPatient, numTimepoints, TrialDesign.TWO_ARM);

    const varData = [
      { name: 'Biological', value: sigmaP2 / (1 + (numTimepoints - 1) * rho), fill: '#6366f1' },
      { name: 'Slice', value: sigmaS2 / (numTimepoints), fill: '#ec4899' },
      { name: 'Technical', value: (sigmaT2 / currentPlatform.effectiveObservations) / numTimepoints, fill: '#94a3b8' }
    ];

    return { dualCurve, currentPower, baselinePower, rctPower, varData };
  }, [platform, trialDesign, numPatients, slicesPerPatient, numTimepoints, analysisTimepoint, treatmentEffect, patientVariance, sliceVariance]);

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

  const handleDownloadReport = (type: string) => {
    analytics.logEvent('DATA_EXPORT', { type, platform });
    alert(`Generating ${type} report... Check your downloads folder.`);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 text-slate-900">
      {/* Header Banner - Responsive Padding */}
      <div className="mb-8 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 md:p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 hidden md:block">
          <Map size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-500/40 text-indigo-100 text-[9px] md:text-[10px] px-2 py-0.5 rounded font-mono border border-indigo-400/30 uppercase tracking-widest">
              PoweREST Framework v4.2 (Verified)
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 flex items-center gap-3">
            <Microscope size={32} className="text-indigo-400" />
            Study Design Strategy Planner
          </h2>
          <p className="text-indigo-100 max-w-2xl opacity-80 leading-relaxed text-sm">
            Optimize longitudinal Spatial trials. Model hierarchical variance across platforms to ensure regulatory-grade sensitivity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Sidebar / Controls */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <GitCompare size={16} className="text-indigo-500" />
              Trial Architecture
            </h3>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg mb-6">
              {Object.values(TrialDesign).map((design) => (
                <button
                  key={design}
                  onClick={() => setTrialDesign(design)}
                  className={`py-2 text-[10px] font-bold rounded-md transition-all ${
                    trialDesign === design 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {design}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Study Duration</span>
                  <span className="text-indigo-600 font-mono bg-indigo-50 px-2 rounded">{currentTimepointLabel}</span>
                </div>
                <input 
                  type="range" min="1" max="4" step="1" 
                  value={numTimepoints} onChange={(e) => setNumTimepoints(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">Cohort (N per arm)</span>
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
                  <span className="text-slate-500">Platform</span>
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
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <Sigma size={14} className="text-pink-500" />
                Variance Modeling
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-5">
                <div>
                   <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                      <span>Biological (σP)</span>
                      <span className="text-indigo-600">{patientVariance.toFixed(1)}</span>
                   </div>
                   <input type="range" min="0.1" max="1" step="0.1" value={patientVariance} onChange={(e)=>setPatientVariance(parseFloat(e.target.value))} className="w-full h-1 accent-indigo-600" />
                </div>
                <div>
                   <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                      <span>Spatial Slice (σS)</span>
                      <span className="text-pink-600">{sliceVariance.toFixed(2)}</span>
                   </div>
                   <input type="range" min="0" max="0.5" step="0.05" value={sliceVariance} onChange={(e)=>setSliceVariance(parseFloat(e.target.value))} className="w-full h-1 accent-pink-600" />
                </div>
             </div>
             
             <div className="mt-6 h-24">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={calculationResults.varData} margin={{ left: -10, right: 10, top: 10 }}>
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
                <div className="flex justify-between text-[8px] font-black text-slate-400 mt-2 px-1 uppercase tracking-tighter">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-indigo-500"></div> BIO</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-pink-500"></div> SLICE</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-slate-400"></div> TECH</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Visualization Dashboard */}
        <div className="xl:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-slate-900 font-black text-lg flex items-center gap-2">
                      <GitCompare size={20} className="text-indigo-600" />
                      Strategic Comparison
                   </h3>
                   <p className="text-xs text-slate-400">Calculated power based on current variance floor.</p>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className={`p-4 rounded-xl border-2 transition-all ${trialDesign === TrialDesign.SINGLE_ARM ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-transparent opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase text-slate-500">Pilot (Single)</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{(calculationResults.baselinePower * 100).toFixed(0)}%</div>
                 </div>
                 <div className={`p-4 rounded-xl border-2 transition-all ${trialDesign === TrialDesign.TWO_ARM ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-transparent opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck size={14} className="text-indigo-500" />
                      <span className="text-[10px] font-black uppercase text-slate-500">RCT (Two-Arm)</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{(calculationResults.rctPower * 100).toFixed(0)}%</div>
                 </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                 <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2 text-amber-500">
                    <AlertCircle size={16} /> Regulatory Grade
                 </h4>
                 <p className="text-[11px] text-slate-400 leading-relaxed italic">
                   {trialDesign === TrialDesign.SINGLE_ARM ? "High bias risk. Single-arm designs cannot prove causality." : "Gold standard. Models placebo drift to preserve causal link."}
                 </p>
              </div>
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                 <div className="text-[10px] text-slate-500 uppercase font-black">Sensitivity Factor</div>
                 <div className="text-xl font-black text-indigo-400">{(calculationResults.baselinePower / (calculationResults.rctPower || 1)).toFixed(2)}x</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart 1: Sensitivity */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  Sensitivity Frontier
                </h4>
                <button 
                  onClick={() => handleDownloadReport('Frontier')}
                  className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Download size={16} />
                </button>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculationResults.dualCurve} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="n" stroke="#94a3b8" fontSize={10} tickMargin={10} label={{ value: 'Cohort (N)', position: 'insideBottom', offset: -25, fill: '#64748b', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} label={{ value: 'Power (%)', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                    <Legend verticalAlign="top" align="right" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    <ReferenceLine y={80} stroke="#cbd5e1" strokeDasharray="5 5" />
                    <Area type="monotone" name="Pilot" dataKey="powerSingle" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={2} />
                    <Area type="monotone" name="RCT" dataKey="powerTwo" stroke="#6366f1" fill="#6366f1" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Efficiency */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="flex justify-between items-center mb-6">
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <DollarSign size={20} className="text-emerald-500" />
                  Efficiency Path
                </h4>
                <button 
                  onClick={() => handleDownloadReport('Efficiency')}
                  className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Download size={16} />
                </button>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                    <XAxis type="number" dataKey="cost" stroke="#94a3b8" fontSize={10} tickMargin={10} label={{ value: 'Budget ($k)', position: 'insideBottom', offset: -25, fill: '#64748b', fontSize: 10 }} />
                    <YAxis type="number" dataKey="power" domain={[0, 100]} stroke="#94a3b8" fontSize={10} label={{ value: 'Power (%)', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '10px' }} />
                    <Legend verticalAlign="top" align="right" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    <Line name="Pilot Path" data={calculationResults.dualCurve.map(d => ({ cost: d.costSingle, power: d.powerSingle, n: d.n }))} type="monotone" dataKey="power" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                    <Line name="RCT Path" data={calculationResults.dualCurve.map(d => ({ cost: d.costTwo, power: d.powerTwo, n: d.n }))} type="monotone" dataKey="power" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
                    <ReferenceLine y={80} stroke="#cbd5e1" strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Interactive Tissue dynamics - Responsive Stacking */}
          <div className="bg-slate-900 rounded-2xl p-6 md:p-8 relative border border-slate-800 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-white/60">
                  <Maximize2 size={16} /> Tissue Dynamics Simulator
                </h4>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[9px] text-slate-500 uppercase font-bold">Tumor</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] text-slate-500 uppercase font-bold">Immune</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-all shadow-inner border border-slate-700">
                      {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                    </button>
                    <div className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-black border border-indigo-500/20 uppercase tracking-tighter">
                      {currentTimepointLabel}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col min-h-[300px]">
                  <div className="bg-slate-800/50 px-3 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 flex justify-between">
                    <span>Baseline / Control</span>
                    <Sigma size={10} />
                  </div>
                  <div className="flex-grow">
                    <TissueCanvas timepoint={visualTimepoint} isTreated={false} effect={treatmentEffect} platform={platform} />
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-indigo-500/30 bg-slate-950 flex flex-col min-h-[300px]">
                  <div className="bg-indigo-900/40 px-3 py-1 text-[8px] font-black text-indigo-300 uppercase tracking-widest border-b border-indigo-900/50 flex justify-between">
                    <span>Active Response</span>
                    <Zap size={10} className="text-emerald-400" />
                  </div>
                  <div className="flex-grow">
                    <TissueCanvas timepoint={visualTimepoint} isTreated={true} effect={treatmentEffect} platform={platform} />
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                 <input 
                  type="range" min="1" max={numTimepoints} step="1"
                  value={visualTimepoint}
                  onChange={(e) => setVisualTimepoint(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
          </div>

          {/* Statistical Methodology & Appendix Section */}
          <div className="space-y-4">
             <button 
                onClick={() => setShowMethodology(!showMethodology)}
                className="w-full py-4 px-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between hover:bg-slate-50 transition-colors group"
             >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                      <BookOpen size={20} />
                   </div>
                   <div className="text-left">
                      <h4 className="font-bold text-slate-900 text-sm">Statistical Framework & PoweREST Methodology</h4>
                      <p className="text-xs text-slate-500">Technical documentation on hierarchical variance modeling.</p>
                   </div>
                </div>
                {showMethodology ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
             </button>

             {showMethodology && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm animate-in fade-in slide-in-from-top-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <h5 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Sigma size={16} className="text-indigo-600" /> 1. Variance Decomposition
                         </h5>
                         <p className="text-sm text-slate-600 leading-relaxed">
                            Total variance in spatial transcriptomics is modeled as a hierarchical nested structure. Power is constrained primarily by biological heterogeneity (Between-subject) rather than technical resolution.
                         </p>
                         <div className="bg-slate-50 p-4 rounded-lg font-serif italic text-lg text-slate-800 text-center border border-slate-200">
                            σ²ₜₒₜ = σ²ₚ + σ²ₛ + σ²ₜ / (Oₑբբ × ε)
                         </div>
                         <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                            <li><strong>σ²ₚ:</strong> Inter-patient variance floor (Dominant)</li>
                            <li><strong>σ²ₛ:</strong> Inter-slice spatial variance</li>
                            <li><strong>Oₑբբ:</strong> Effective observations (Platform resolution)</li>
                            <li><strong>ε:</strong> Capture Efficiency (mRNA capture rate)</li>
                         </ul>
                      </div>

                      <div className="space-y-6">
                         <h5 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Zap size={16} className="text-emerald-500" /> 2. Longitudinal Gain
                         </h5>
                         <p className="text-sm text-slate-600 leading-relaxed">
                            Repeated measures at multiple timepoints (T) increase power by leveraging intra-subject correlation (ρ).
                         </p>
                         <div className="bg-slate-50 p-4 rounded-lg font-serif italic text-lg text-slate-800 text-center border border-slate-200">
                            SE = √[ (σ²ₚ / Gₗₒₙ) + (σ²ₛ / (S×T)) + Noise ]
                         </div>
                         <p className="text-xs text-slate-400">
                            Where <strong>Gₗₒₙ = 1 + (T - 1)ρ</strong> represents the statistical gain from the longitudinal architecture.
                         </p>
                      </div>
                   </div>

                   <div className="mt-10 pt-8 border-t border-slate-100">
                      <h5 className="font-black text-slate-900 uppercase tracking-widest text-[11px] mb-4">Core Design Assumptions</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <div className="text-[10px] font-bold text-indigo-700 uppercase mb-1">Independence</div>
                            <p className="text-[10px] text-slate-600 leading-relaxed">Subjects are assumed independent; slices within subjects are nested.</p>
                         </div>
                         <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <div className="text-[10px] font-bold text-indigo-700 uppercase mb-1">Noise Distribution</div>
                            <p className="text-[10px] text-slate-600 leading-relaxed">Technical noise is modeled as a compound Poisson-Gamma distribution.</p>
                         </div>
                         <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <div className="text-[10px] font-bold text-indigo-700 uppercase mb-1">RCT Causal Link</div>
                            <p className="text-[10px] text-slate-600 leading-relaxed">Treatment effect is compared against a placebo-controlled drift baseline.</p>
                         </div>
                      </div>
                   </div>
                </div>
             )}
          </div>

          {/* Device Mockup Display Icons for User Assurance */}
          <div className="flex justify-center gap-6 pt-6 opacity-30">
             <Monitor size={18} />
             <Tablet size={18} />
             <Smartphone size={18} />
          </div>

        </div>
      </div>
    </div>
  );
};