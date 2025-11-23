
import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { Calculator, Settings, Info, FlaskConical, AlertCircle } from 'lucide-react';

// --- Statistical Utilities ---

// Approximation of the inverse standard normal cumulative distribution function (Probit)
// Used to convert a probability (alpha/power) into a Z-score.
function getZScore(p: number): number {
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  return t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
}

// Approximation of the standard normal CDF
// Used to calculate Power given an N and Effect Size.
function getNormalProbability(z: number): number {
  if (z < -6.5) return 0;
  if (z > 6.5) return 1;
  
  let factK = 1;
  let sum = 0;
  let term = 1;
  let k = 0;
  let loopStop = Math.exp(-23);
  
  while(Math.abs(term) > loopStop) {
    term = .3989422804 * Math.pow(-1,k) * Math.pow(z, 2*k+1) / (2*k+1) / Math.pow(2,k) / factK;
    sum += term;
    k++;
    factK *= k;
  }
  sum += 0.5;
  return sum;
}

// --- Constants & Types ---

enum AssayType {
  ELISA = 'ELISA (Single-plex)',
  MSD = 'MSD/Luminex (Multiplex)',
  OLINK = 'Olink (Proteomics)',
  CUSTOM = 'Custom Assay'
}

const ASSAY_PRESETS = {
  [AssayType.ELISA]: { cv: 8, description: 'High sensitivity, gold standard for single analytes. Lower noise.', cost: '$$' },
  [AssayType.MSD]: { cv: 12, description: 'Robust multiplexing, wide dynamic range. Moderate noise.', cost: '$$$' },
  [AssayType.OLINK]: { cv: 18, description: 'High throughput proteomics. Higher variability due to NPX scale/normalization.', cost: '$$$$' },
  [AssayType.CUSTOM]: { cv: 10, description: 'User defined specifications.', cost: '?' }
};

export const PowerCalculator: React.FC = () => {
  // Study Design State
  const [phase, setPhase] = useState<'II' | 'III'>('II');
  const [assayType, setAssayType] = useState<AssayType>(AssayType.ELISA);
  
  // Statistical Parameters
  const [controlMean, setControlMean] = useState<number>(100);
  const [percentChange, setPercentChange] = useState<number>(20); // Expected effect size (%)
  const [cv, setCv] = useState<number>(ASSAY_PRESETS[AssayType.ELISA].cv); // Coefficient of Variation (%)
  const [alpha, setAlpha] = useState<number>(0.05);
  const [targetPower, setTargetPower] = useState<number>(0.80);

  // Update CV when assay type changes
  useEffect(() => {
    setCv(ASSAY_PRESETS[assayType].cv);
  }, [assayType]);

  // Derived Values & Calculations
  const calculationResults = useMemo(() => {
    // 1. Calculate Absolute Means and SD
    const treatmentMean = controlMean * (1 + (percentChange / 100)); // Direction doesn't matter for 2-tailed magnitude
    const diff = Math.abs(treatmentMean - controlMean);
    
    // SD is derived from CV. SD = Mean * (CV/100).
    // In trials, we usually assume pooled variance. Let's average the means to apply CV, 
    // or strictly apply it to Control (baseline). Let's use Control for conservative estimate.
    const sd = controlMean * (cv / 100);
    
    // 2. Cohen's d (Effect Size)
    // d = (Mean1 - Mean2) / SD
    const cohensD = diff / sd;

    // 3. Calculate Required N (per arm)
    // Formula: N = 2 * ((Z_alpha/2 + Z_beta) / d)^2
    const zAlpha = getZScore(1 - (alpha / 2)); // Two-tailed
    const zBeta = getZScore(targetPower);      // Power = 1 - beta
    
    let requiredN = 0;
    if (cohensD > 0) {
      requiredN = Math.ceil(2 * Math.pow((zAlpha + zBeta) / cohensD, 2));
    }

    // 4. Generate Power Curve Data (Power vs Sample Size)
    // We want to show a range from N=5 to N = requiredN * 2
    const curveData = [];
    const maxPlotN = requiredN > 0 ? Math.max(requiredN * 2, 50) : 100;
    const step = Math.max(1, Math.floor(maxPlotN / 50));

    for (let n = 2; n <= maxPlotN; n += step) {
      // Calculate Power for this N
      // Z_beta = sqrt(n * d^2 / 2) - Z_alpha/2
      const zBetaCalc = Math.sqrt((n * Math.pow(cohensD, 2)) / 2) - zAlpha;
      const powerCalc = getNormalProbability(zBetaCalc);
      
      curveData.push({
        n,
        power: powerCalc * 100, // Convert to %
        target: targetPower * 100
      });
    }

    return {
      treatmentMean,
      sd,
      cohensD,
      requiredN,
      curveData,
      zAlpha // used for reference
    };
  }, [controlMean, percentChange, cv, alpha, targetPower]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* Left Column: Inputs */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Study Context Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
            <FlaskConical className="text-indigo-600" size={20} />
            <h3>Study Context</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Study Phase</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button 
                  onClick={() => setPhase('II')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${phase === 'II' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Phase II (PoC)
                </button>
                <button 
                  onClick={() => setPhase('III')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${phase === 'III' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Phase III (Conf)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assay Platform</label>
              <select 
                value={assayType}
                onChange={(e) => setAssayType(e.target.value as AssayType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                {Object.values(AssayType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                <p className="font-semibold">{assayType}</p>
                <p>{ASSAY_PRESETS[assayType].description}</p>
                <p className="mt-1">Typical CV: <span className="font-mono text-slate-700">{ASSAY_PRESETS[assayType].cv}%</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistical Parameters Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
            <Settings className="text-indigo-600" size={20} />
            <h3>Parameters</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Baseline Mean</label>
                <input 
                  type="number" 
                  value={controlMean}
                  onChange={(e) => setControlMean(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Exp. Change (%)</label>
                 <div className="relative">
                    <input 
                      type="number" 
                      value={percentChange}
                      onChange={(e) => setPercentChange(parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
                 </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Assay CV (%)</label>
              <div className="flex items-center gap-2">
                 <input 
                    type="range" 
                    min="1" max="40" 
                    value={cv} 
                    onChange={(e) => {
                      setCv(parseFloat(e.target.value));
                      setAssayType(AssayType.CUSTOM);
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="w-12 text-right text-sm font-mono">{cv}%</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Alpha (Significance)</label>
                  <select 
                    value={alpha}
                    onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value={0.1}>0.10 (90% CI)</option>
                    <option value={0.05}>0.05 (95% CI)</option>
                    <option value={0.01}>0.01 (99% CI)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Target Power</label>
                  <select 
                    value={targetPower}
                    onChange={(e) => setTargetPower(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value={0.8}>80%</option>
                    <option value={0.9}>90%</option>
                    <option value={0.95}>95%</option>
                  </select>
               </div>
            </div>

          </div>
        </div>

      </div>

      {/* Right Column: Results & Visualization */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Results Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 rounded-xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
           <div>
              <h2 className="text-2xl font-bold mb-1">Required Sample Size</h2>
              <p className="text-indigo-200 text-sm">Per Arm (1:1 Allocation)</p>
           </div>
           
           <div className="flex items-end gap-2">
              <span className="text-6xl font-bold tracking-tighter">{calculationResults.requiredN}</span>
              <span className="text-xl text-indigo-300 font-medium mb-2">subjects</span>
           </div>

           <div className="text-right border-l border-indigo-700 pl-6 hidden sm:block">
              <div className="mb-1">
                <span className="text-xs text-indigo-300 uppercase block">Total N</span>
                <span className="text-xl font-semibold">{calculationResults.requiredN * 2}</span>
              </div>
              <div>
                <span className="text-xs text-indigo-300 uppercase block">Effect Size (d)</span>
                <span className="text-xl font-semibold">{calculationResults.cohensD.toFixed(2)}</span>
              </div>
           </div>
        </div>

        {/* Warning Banner if N is unrealistic */}
        {(calculationResults.requiredN > 1000 || calculationResults.requiredN < 3) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
             <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20} />
             <div className="text-sm text-amber-800">
                <strong>Guidance:</strong> 
                {calculationResults.requiredN < 3 
                  ? " Sample size is extremely small. The effect size might be overestimated relative to the variance."
                  : " Sample size is very large (>1000). Consider if the clinical significance of the effect size justifies this trial cost, or if a more precise assay (lower CV) is available."}
             </div>
          </div>
        )}

        {/* Power Curve Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Calculator size={20} className="text-indigo-600" />
            Power Curve
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Relationship between sample size (N) and statistical power (1-β).
          </p>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calculationResults.curveData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="n" 
                  label={{ value: 'Sample Size (N) per Arm', position: 'insideBottom', offset: -10 }} 
                  stroke="#64748b"
                />
                <YAxis 
                  label={{ value: 'Power (%)', angle: -90, position: 'insideLeft' }} 
                  stroke="#64748b"
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Power']}
                  labelFormatter={(label) => `N = ${label}`}
                />
                <ReferenceLine 
                  y={targetPower * 100} 
                  stroke="#10b981" 
                  strokeDasharray="3 3" 
                  label={{ value: `Target: ${targetPower*100}%`, fill: '#10b981', position: 'insideTopRight' }}
                />
                <ReferenceLine 
                  x={calculationResults.requiredN} 
                  stroke="#6366f1" 
                  strokeDasharray="3 3" 
                  label={{ value: `Required N: ${calculationResults.requiredN}`, fill: '#6366f1', position: 'insideBottomRight' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="power" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPower)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Methodology Footer */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
           <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
             <Info size={14} /> Methodology
           </h4>
           <p className="text-xs text-slate-600 leading-relaxed">
             Calculations use the <strong>Two-Sample T-Test</strong> model for independent groups (Placebo vs. Treatment). 
             Effect size (Cohen's d) is derived from the expected percent change and the assay's Coefficient of Variation (CV).
             Formula: <code>N = 2 × ((Z<sub>α/2</sub> + Z<sub>β</sub>) / d)²</code>.
             Assumed equal variance between arms. Z-scores are approximated using standard probit functions.
           </p>
        </div>

      </div>

    </div>
  );
};
