
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { 
  Dna, 
  Activity, 
  Settings, 
  Info, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Database,
  Layers,
  ChevronRight,
  Calculator,
  Target,
  FlaskConical,
  Search,
  CalendarDays,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MultiplicityMethod, OmicsModality, OmicsPlatform, PowerCalculationParams, StudyDesign } from '../types';
import { OMICS_PLATFORMS } from '../constants';
import { calculateEffectiveAlpha, calculateOmicsPower, getExpertRecommendation } from '../services/omicsPower';

export const OmicsPowerDesigner: React.FC = () => {
  const [design, setDesign] = useState<StudyDesign>(StudyDesign.TRIAL);
  const [modality, setModality] = useState<OmicsModality>(OmicsModality.METABOLOMICS);
  const [platformId, setPlatformId] = useState<string>(OMICS_PLATFORMS.find(p => p.modality === OmicsModality.METABOLOMICS)?.id || '');
  const [sampleSize, setSampleSize] = useState<number>(60);
  const [effectSize, setEffectSize] = useState<number>(1.5); // 1.5x fold change
  const [numTimepoints, setNumTimepoints] = useState<number>(1);
  const [backgroundNoise, setBackgroundNoise] = useState<number>(0.2);
  const [fdr, setFdr] = useState<number>(0.05);
  const [isStratified, setIsStratified] = useState<boolean>(false);
  
  // Multiplicity Engine State
  const [numFeatures, setNumFeatures] = useState<number>(1000);
  const [featureCorrelation, setFeatureCorrelation] = useState<number>(0.4);
  const [multiplicityMethod, setMultiplicityMethod] = useState<MultiplicityMethod>(MultiplicityMethod.FDR);

  // Sync platform when modality changes
  useEffect(() => {
    const firstPlatform = OMICS_PLATFORMS.find(p => p.modality === modality);
    if (firstPlatform) {
      setPlatformId(firstPlatform.id);
    }
  }, [modality]);

  // Sync parameters when platform changes
  useEffect(() => {
    const platform = OMICS_PLATFORMS.find(p => p.id === platformId);
    if (platform) {
      setNumFeatures(platform.typicalFeatures);
      // Set default correlation based on modality/platform
      if (platform.modality === OmicsModality.LIPIDOMICS) {
        setFeatureCorrelation(0.75);
      } else if (platform.id.includes('biocrates') || platform.id.includes('nightingale')) {
        setFeatureCorrelation(0.65);
      } else {
        setFeatureCorrelation(0.4);
      }
    }
  }, [platformId]);

  const params: PowerCalculationParams = useMemo(() => ({
    modality,
    platformId,
    sampleSize,
    effectSize,
    alpha: 0.05,
    fdr,
    isStratified,
    design,
    numTimepoints,
    backgroundNoise,
    numFeatures,
    featureCorrelation,
    multiplicityMethod
  }), [modality, platformId, sampleSize, effectSize, fdr, isStratified, design, numTimepoints, backgroundNoise, numFeatures, featureCorrelation, multiplicityMethod]);

  const powerData = useMemo(() => calculateOmicsPower(params), [params]);
  
  const currentPower = useMemo(() => {
    const point = powerData.find(p => p.n >= sampleSize);
    return point ? point.power : 0;
  }, [powerData, sampleSize]);

  const effectiveAlpha = useMemo(() => calculateEffectiveAlpha(params), [params]);

  const recommendation = useMemo(() => getExpertRecommendation(params, currentPower), [params, currentPower]);

  const selectedPlatform = OMICS_PLATFORMS.find(p => p.id === platformId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
      {/* Left Sidebar: Controls */}
      <div className="lg:col-span-4 space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Settings size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Strategic Architecture</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Precision Omics Planner</h3>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Study Design Switcher */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FlaskConical size={16} className="text-slate-400" />
                Study Context
              </label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setDesign(StudyDesign.TRIAL)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    design === StudyDesign.TRIAL 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Activity size={14} />
                  Clinical Trial
                </button>
                <button
                  onClick={() => setDesign(StudyDesign.OBSERVATIONAL)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    design === StudyDesign.OBSERVATIONAL 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Search size={14} />
                  Observational
                </button>
              </div>
            </div>

            {/* Modality Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Layers size={16} className="text-slate-400" />
                Biological Modality
              </label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setModality(OmicsModality.METABOLOMICS)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    modality === OmicsModality.METABOLOMICS 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Metabolomics
                </button>
                <button
                  onClick={() => setModality(OmicsModality.LIPIDOMICS)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    modality === OmicsModality.LIPIDOMICS 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Lipidomics
                </button>
              </div>
            </div>

            {/* Platform Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Database size={16} className="text-slate-400" />
                SOTA Platform Preset
              </label>
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                {OMICS_PLATFORMS.filter(p => p.modality === modality).map(p => (
                  <option key={p.id} value={p.id}>{p.company} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* Longitudinal Sampling */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CalendarDays size={16} className="text-slate-400" />
                  Timepoints
                </label>
                <span className="text-sm font-bold text-indigo-600">{numTimepoints} {numTimepoints === 1 ? 'Timepoint' : 'Timepoints'}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={numTimepoints}
                onChange={(e) => setNumTimepoints(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[10px] text-slate-500 italic">
                {numTimepoints > 1 
                  ? "Applying intra-individual correlation bonus (Baseline Adjustment)." 
                  : "Cross-sectional design (Highest inter-individual variance)."}
              </p>
            </div>

            {/* Background Noise / Placebo Effect */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Wind size={16} className="text-slate-400" />
                  {design === StudyDesign.TRIAL ? 'Placebo Drift' : 'Confounder Noise'}
                </label>
                <span className="text-sm font-bold text-amber-600">{(backgroundNoise * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={backgroundNoise}
                onChange={(e) => setBackgroundNoise(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[10px] text-slate-500">
                {design === StudyDesign.TRIAL 
                  ? "Expected metabolic improvement in the control arm." 
                  : "Variance explained by non-target traits (Age, BMI, etc)."}
              </p>
            </div>

            {/* Sample Size Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Sample Size (N per arm)</label>
                <span className="text-lg font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{sampleSize}</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="10"
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Effect Size Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Expected Fold Change (Δ)</label>
              <div className="grid grid-cols-3 gap-2">
                {[1.2, 1.5, 2.0].map(val => (
                  <button
                    key={val}
                    onClick={() => setEffectSize(val)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      effectSize === val 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
            </div>

            {/* Multiplicity Engine Panel */}
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <Calculator size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Multiplicity Engine</span>
              </div>

              {/* Feature Count */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-600">Feature Count (m)</label>
                  <span className="text-xs font-bold text-indigo-600">{numFeatures}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="2000"
                  step="10"
                  value={numFeatures}
                  onChange={(e) => setNumFeatures(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Correlation Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-600">Feature Collinearity (ρ)</label>
                  <span className="text-xs font-bold text-indigo-600">{(featureCorrelation * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.95"
                  step="0.05"
                  value={featureCorrelation}
                  onChange={(e) => setFeatureCorrelation(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[9px] text-indigo-400 italic">
                  {featureCorrelation > 0.6 ? "High redundancy reduces multiplicity tax." : "Independent features increase testing burden."}
                </p>
              </div>

              {/* Adjustment Method */}
              <div className="flex p-1 bg-white rounded-lg border border-indigo-100">
                <button
                  onClick={() => setMultiplicityMethod(MultiplicityMethod.FDR)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                    multiplicityMethod === MultiplicityMethod.FDR 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  FDR (Discovery)
                </button>
                <button
                  onClick={() => setMultiplicityMethod(MultiplicityMethod.BONFERRONI)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                    multiplicityMethod === MultiplicityMethod.BONFERRONI 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  FWER (Regulatory)
                </button>
              </div>
            </div>

            {/* FDR / Alpha Selector */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <TrendingUp size={18} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{multiplicityMethod === MultiplicityMethod.FDR ? 'Target FDR' : 'Target Alpha'}</p>
                  <p className="text-[10px] text-slate-500">{multiplicityMethod === MultiplicityMethod.FDR ? 'Benjamini-Hochberg' : 'Bonferroni'}</p>
                </div>
              </div>
              <select 
                value={fdr}
                onChange={(e) => setFdr(parseFloat(e.target.value))}
                className="bg-transparent text-sm font-bold text-indigo-600 outline-none"
              >
                <option value={0.01}>1%</option>
                <option value={0.05}>5%</option>
                <option value={0.10}>10%</option>
              </select>
            </div>

            {/* Stratification Toggle */}
            <button
              onClick={() => setIsStratified(!isStratified)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                isStratified 
                  ? 'bg-amber-50 border-amber-200 text-amber-900' 
                  : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <Dna size={18} className={isStratified ? 'text-amber-600' : 'text-slate-400'} />
                <div className="text-left">
                  <p className="text-xs font-bold">Patient Stratification</p>
                  <p className="text-[10px] opacity-70">Apply subgroup penalty</p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${isStratified ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isStratified ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Right Content: Visualization & Recommendations */}
      <div className="lg:col-span-8 space-y-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Statistical Power</p>
            <div className="flex items-end gap-2">
              <h4 className={`text-3xl font-black ${currentPower >= 0.8 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {(currentPower * 100).toFixed(1)}%
              </h4>
              <span className="text-xs font-bold text-slate-400 mb-1.5">at N={sampleSize}</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${currentPower * 100}%` }}
                className={`h-full ${currentPower >= 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sig. Threshold</p>
            <div className="flex items-end gap-2">
              <h4 className="text-2xl font-black text-indigo-600">
                p &lt; {effectiveAlpha < 0.001 ? effectiveAlpha.toExponential(1) : effectiveAlpha.toFixed(4)}
              </h4>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
              <Info size={10} />
              Effective α after multiplicity
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Study Feasibility</p>
            <div className="flex items-center gap-2 mt-1">
              {currentPower >= 0.8 ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={24} />
                  <span className="text-lg font-bold">High</span>
                </div>
              ) : currentPower >= 0.6 ? (
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle size={24} />
                  <span className="text-lg font-bold">Moderate</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertCircle size={24} />
                  <span className="text-lg font-bold">Low</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              {design === StudyDesign.TRIAL ? 'Regulatory-grade' : 'Discovery-grade'} confidence
            </p>
          </motion.div>
        </div>

        {/* Chart Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Strategic Power Curve</h3>
              <p className="text-xs text-slate-500">Sample Size vs. Statistical Power (FDR Adjusted)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-[10px] font-bold text-slate-600 uppercase">Power Curve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-20" />
                <span className="text-[10px] font-bold text-slate-600 uppercase">Target (80%)</span>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={powerData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="n" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  label={{ value: 'Sample Size (N per arm)', position: 'insideBottom', offset: -10, fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  domain={[0, 1]} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={(val) => `${(val * 100)}%`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Power']}
                  labelFormatter={(label) => `N = ${label}`}
                />
                <ReferenceLine y={0.8} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.5} />
                <ReferenceLine x={sampleSize} stroke="#4f46e5" strokeWidth={2} />
                <Area 
                  type="monotone" 
                  dataKey="power" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPower)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Expert Recommendation Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-200"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Target size={18} />
              </div>
              <h3 className="text-lg font-bold">Precision Strategy Recommendation</h3>
            </div>
            
            <p className="text-indigo-100 leading-relaxed text-sm mb-6">
              {recommendation}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-2">Design Efficiency</p>
                <p className="text-xs leading-relaxed">
                  {numTimepoints > 1 
                    ? `Using ${numTimepoints} timepoints per patient reduces required N by ~${Math.round((1 - (1 / Math.sqrt(numTimepoints))) * 100)}% compared to single-point discovery.` 
                    : "Single-timepoint design requires higher N to overcome inter-individual variance. Consider longitudinal sampling."}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-2">Strategic Fit</p>
                <p className="text-xs leading-relaxed">
                  {design === StudyDesign.TRIAL 
                    ? "Optimized for Treatment-by-Time interaction models (LMM/ANCOVA)." 
                    : "Optimized for Case-Control matching and confounder-adjusted discovery."}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
