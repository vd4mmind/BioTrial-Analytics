
import React, { useState, useMemo, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Calculator, Settings, Info, FlaskConical, Users, Layers, AlertTriangle, BookOpen, ChevronDown, ChevronUp, Dna } from 'lucide-react';

// --- Statistical Utilities ---

// Inverse standard normal cumulative distribution function (Probit)
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

// Standard normal CDF
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
  OLINK_FLEX = 'Olink Flex (Targeted)',
  OLINK_EXPLORE = 'Olink Explore HT (High-Plex)',
  SOMA = 'SomaScan (Aptamer)',
  CUSTOM = 'Custom Assay'
}

interface AssayPreset {
  cv: number;
  bioCv: number;
  description: string;
  isMultiplex?: boolean;
  defaultAnalytes?: number;
}

const ASSAY_PRESETS: Record<AssayType, AssayPreset> = {
  [AssayType.ELISA]: { cv: 8, bioCv: 45, description: 'High precision, low noise.', isMultiplex: false },
  [AssayType.MSD]: { cv: 12, bioCv: 50, description: 'Good dynamic range, multiplex noise.', isMultiplex: true, defaultAnalytes: 10 },
  [AssayType.OLINK_FLEX]: { cv: 8, bioCv: 50, description: 'Targeted PEA panel (~21 proteins). High sensitivity.', isMultiplex: true, defaultAnalytes: 21 },
  [AssayType.OLINK_EXPLORE]: { cv: 12, bioCv: 60, description: 'NGS readout (~5400 proteins). Requires correction.', isMultiplex: true, defaultAnalytes: 5400 },
  [AssayType.SOMA]: { cv: 5, bioCv: 60, description: 'Low tech CV (5%), massive multiplexing (~7k).', isMultiplex: true, defaultAnalytes: 7000 },
  [AssayType.CUSTOM]: { cv: 10, bioCv: 50, description: 'User defined.', isMultiplex: false }
};

export const PowerCalculator: React.FC = () => {
  // Study Design State
  const [assayType, setAssayType] = useState<AssayType>(AssayType.ELISA);
  const [showGuide, setShowGuide] = useState(false);
  
  // Statistical Parameters
  const [controlMean, setControlMean] = useState<number>(100);
  const [percentChange, setPercentChange] = useState<number>(20); 
  
  // Variances
  const [techCv, setTechCv] = useState<number>(ASSAY_PRESETS[AssayType.ELISA].cv); // Technical (Assay) CV
  const [bioCv, setBioCv] = useState<number>(ASSAY_PRESETS[AssayType.ELISA].bioCv);   // Biological (Patient) CV
  
  const [alpha, setAlpha] = useState<number>(0.05);
  const [targetPower, setTargetPower] = useState<number>(0.80);
  
  // Multiplexing / Multiple Testing
  const [isMultiplex, setIsMultiplex] = useState(false);
  const [numAnalytes, setNumAnalytes] = useState(1);
  const [applyCorrection, setApplyCorrection] = useState(false);

  // Comparison State
  const [showReference, setShowReference] = useState(false);
  const [refN, setRefN] = useState(0);

  // Update CVs and Multiplex settings when assay type changes
  useEffect(() => {
    const preset = ASSAY_PRESETS[assayType];
    setTechCv(preset.cv);
    setBioCv(preset.bioCv);
    
    if (preset.isMultiplex) {
      setIsMultiplex(true);
      setNumAnalytes(preset.defaultAnalytes || 10);
      // Auto-enable correction for high-plex proteomics
      setApplyCorrection(assayType === AssayType.SOMA || assayType === AssayType.OLINK_EXPLORE);
    } else {
      setIsMultiplex(false);
      setNumAnalytes(1);
      setApplyCorrection(false);
    }
  }, [assayType]);

  // Derived Values & Calculations
  const calculationResults = useMemo(() => {
    // 1. Calculate Total CV (Root Sum of Squares)
    const totalCv = Math.sqrt(Math.pow(techCv, 2) + Math.pow(bioCv, 2));

    // 2. Calculate Means and SD
    const sd = controlMean * (totalCv / 100);
    const diff = Math.abs(controlMean * (percentChange / 100));
    
    // 3. Cohen's d (Effect Size)
    const cohensD = diff / sd; 

    // 4. Calculate Required N (per arm)
    
    // --- Correction Logic (Bonferroni) ---
    // If we are measuring 7000 proteins, we can't use alpha 0.05, we must use 0.05 / 7000
    const effectiveAlpha = (applyCorrection && numAnalytes > 1) ? (alpha / numAnalytes) : alpha;

    const zAlpha = getZScore(1 - (effectiveAlpha / 2)); 
    const zBeta = getZScore(targetPower);
    
    let requiredN = 0;
    if (cohensD > 0) {
      requiredN = Math.ceil(2 * Math.pow((zAlpha + zBeta) / cohensD, 2));
    }

    // 5. Generate Power Curve Data
    const curveData = [];
    const maxPlotN = Math.max(requiredN * 2, 100); 
    const step = Math.max(2, Math.floor(maxPlotN / 40));

    for (let n = 5; n <= maxPlotN; n += step) {
      const zBetaCalc = Math.sqrt((n * Math.pow(cohensD, 2)) / 2) - zAlpha;
      const powerCalc = getNormalProbability(zBetaCalc);
      
      curveData.push({
        n,
        power: powerCalc * 100,
        target: targetPower * 100
      });
    }

    // Variance Composition Data
    const varianceData = [
      { name: 'Technical', value: techCv, fill: '#6366f1' }, // Indigo
      { name: 'Biological', value: bioCv, fill: '#ec4899' }, // Pink
    ];

    return {
      totalCv,
      sd,
      cohensD,
      requiredN,
      effectiveAlpha,
      curveData,
      varianceData
    };
  }, [controlMean, percentChange, techCv, bioCv, alpha, targetPower, applyCorrection, numAnalytes]);

  const handleSetReference = () => {
    setRefN(calculationResults.requiredN);
    setShowReference(true);
  };

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      
      {/* Educational Guide Section */}
      <div className="mb-8">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg border border-indigo-100"
        >
          <BookOpen size={18} />
          Guide: Understanding the Parameters
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showGuide && (
          <div className="mt-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Technical CV
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  <strong>Assay Precision.</strong> Targeted methods (ELISA, Olink Flex) typically range 5-10%. SomaScan is uniquely low (~5%). High throughput methods can introduce more technical noise.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span> Biological CV
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  <strong>Inter-patient heterogeneity.</strong> Usually the dominant factor (40-100%). Proteomics (Olink/Soma) often see high bio-variability due to dynamic physiology.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings size={14} className="text-slate-600" /> Effect Size
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  The <strong>Target Difference</strong> vs Placebo. Detecting subtle changes (10-15%) in noisy biological data requires large cohorts, regardless of assay quality.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Dna size={14} className="text-slate-600" /> Multiple Testing
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  <strong>False Discovery Control.</strong> For high-plex (SomaScan, Olink Explore), testing 5000+ proteins requires a stricter Alpha (Bonferroni) to prevent random hits, increasing N.
                </p>
              </div>

            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Inputs */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Assay & Variability Panel */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <FlaskConical className="text-indigo-600" size={20} />
              <h3>Assay & Variability</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assay Platform</label>
                <select 
                  value={assayType}
                  onChange={(e) => setAssayType(e.target.value as AssayType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  {Object.values(AssayType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5 ml-1">
                  {ASSAY_PRESETS[assayType].description}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                 <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                      <span>Technical CV (Assay)</span>
                      <span>{techCv}%</span>
                    </div>
                    <input 
                      type="range" min="1" max="30" value={techCv} 
                      onChange={(e) => { setTechCv(parseFloat(e.target.value)); setAssayType(AssayType.CUSTOM); }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                 </div>

                 <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                      <span>Biological CV (Patient)</span>
                      <span className="text-pink-600">{bioCv}%</span>
                    </div>
                    <input 
                      type="range" min="10" max="150" value={bioCv} 
                      onChange={(e) => { setBioCv(parseFloat(e.target.value)); setAssayType(AssayType.CUSTOM); }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                 </div>
                 
                 <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Total Effective CV</span>
                    <span className="text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {calculationResults.totalCv.toFixed(1)}%
                    </span>
                 </div>
              </div>

              {/* Multiplexing / Multiple Testing Section */}
              {isMultiplex && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Dna size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase text-indigo-800">Multiple Testing Correction</h4>
                  </div>
                  
                  <div className="space-y-3">
                     <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Number of Analytes</label>
                        <input 
                          type="number" 
                          value={numAnalytes}
                          onChange={(e) => setNumAnalytes(parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 border border-indigo-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                        />
                     </div>
                     <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="correction"
                          checked={applyCorrection}
                          onChange={(e) => setApplyCorrection(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="correction" className="text-xs font-medium text-slate-700">Apply Bonferroni Correction</label>
                     </div>
                     {applyCorrection && (
                       <div className="text-[10px] text-indigo-600 font-mono bg-white p-2 rounded border border-indigo-100">
                         Adj. Alpha: {calculationResults.effectiveAlpha.toExponential(2)}
                       </div>
                     )}
                  </div>
                </div>
              )}
              
              <div className="h-32 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={calculationResults.varianceData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barSize={20}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 10}} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {calculationResults.varianceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              </div>

            </div>
          </div>

          {/* Statistical Parameters Panel */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <Settings className="text-indigo-600" size={20} />
              <h3>Study Design</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Exp. Effect (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={percentChange}
                        onChange={(e) => setPercentChange(parseFloat(e.target.value) || 0)}
                        className="w-full pl-3 pr-6 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                      />
                      <span className="absolute right-2 top-2 text-slate-400 text-sm">%</span>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Target Power</label>
                    <select 
                      value={targetPower}
                      onChange={(e) => setTargetPower(parseFloat(e.target.value))}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value={0.8}>80%</option>
                      <option value={0.9}>90%</option>
                    </select>
                 </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Visualization */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Results Hero */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Main Result */}
             <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Users size={100} />
                </div>
                <h2 className="text-lg font-medium text-indigo-200 mb-1">Recommended Sample Size</h2>
                <div className="flex items-baseline gap-2 mb-4">
                   <span className="text-5xl font-bold tracking-tight">{calculationResults.requiredN}</span>
                   <span className="text-lg text-indigo-200">per arm</span>
                </div>
                
                <div className="flex gap-4 text-xs text-indigo-300 border-t border-indigo-800/50 pt-4">
                   <div>
                      <span className="block uppercase opacity-70">Total Subjects</span>
                      <strong className="text-white text-base">{calculationResults.requiredN * 2}</strong>
                   </div>
                   <div>
                      <span className="block uppercase opacity-70">Effect Size (d)</span>
                      <strong className="text-white text-base">{calculationResults.cohensD.toFixed(2)}</strong>
                   </div>
                   <div>
                      <span className="block uppercase opacity-70">Total CV</span>
                      <strong className="text-white text-base">{calculationResults.totalCv.toFixed(0)}%</strong>
                   </div>
                </div>
             </div>

             {/* Comparison / Insight */}
             <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h3 className="text-slate-800 font-semibold mb-2 flex items-center gap-2">
                      <Layers size={18} className="text-indigo-500" />
                      Sensitivity Check
                   </h3>
                   <p className="text-sm text-slate-500 leading-relaxed mb-4">
                     Biological variability often drives sample size. Even with a perfect assay (0% Tech CV), 
                     N would typically drop by only ~5-10%.
                   </p>
                </div>
                
                {showReference ? (
                   <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between items-center border border-slate-200">
                      <div>
                         <span className="text-slate-500 block text-xs uppercase font-bold">Reference N</span>
                         <span className="text-xl font-bold text-slate-700">{refN}</span>
                      </div>
                      <div className="text-right">
                         <span className="block text-xs text-slate-400">Difference</span>
                         <span className={`font-bold ${calculationResults.requiredN > refN ? 'text-red-500' : 'text-green-500'}`}>
                           {calculationResults.requiredN - refN > 0 ? '+' : ''}{calculationResults.requiredN - refN}
                         </span>
                      </div>
                      <button onClick={() => setShowReference(false)} className="text-xs text-slate-400 hover:text-slate-600 underline ml-2">Clear</button>
                   </div>
                ) : (
                  <button 
                    onClick={handleSetReference}
                    className="w-full py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    Set Current as Reference
                  </button>
                )}
             </div>
          </div>

          {/* Diagnostic Warning */}
          {calculationResults.requiredN < 10 && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={18} />
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> The calculated sample size is very low ({calculationResults.requiredN}). 
                  This implies a massive Effect Size (d={calculationResults.cohensD.toFixed(2)}). 
                  In clinical trials, Cohen's d is rarely {'>'} 0.8. Check if your Expected Effect (20%) is too high relative to the large Biological CV.
                </p>
             </div>
          )}

          {/* Power Curve */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calculator size={20} className="text-indigo-600" />
                Power Curve
              </h3>
              <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500">
                 N vs Power (1-β)
              </span>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculationResults.curveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="n" 
                    label={{ value: 'Sample Size (N) per Arm', position: 'insideBottom', offset: -10 }} 
                    stroke="#64748b"
                    tick={{fontSize: 12}}
                  />
                  <YAxis 
                    label={{ value: 'Power (%)', angle: -90, position: 'insideLeft' }} 
                    stroke="#64748b"
                    domain={[0, 100]}
                    tick={{fontSize: 12}}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [`${val.toFixed(1)}%`, 'Power']}
                    labelFormatter={(label) => `N = ${label}`}
                  />
                  <ReferenceLine 
                    y={targetPower * 100} 
                    stroke="#10b981" 
                    strokeDasharray="3 3" 
                    label={{ value: `${targetPower*100}%`, fill: '#10b981', position: 'insideTopLeft' }}
                  />
                  <ReferenceLine 
                    x={calculationResults.requiredN} 
                    stroke="#6366f1" 
                    strokeDasharray="3 3" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="power" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPower)" 
                    activeDot={{r: 6}}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Methodology Footer */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
             <div className="flex items-center gap-2 mb-1 font-bold text-slate-600">
               <Info size={14} /> Statistical Method: Two-Sample T-Test (Independent)
             </div>
             Calculations assume equal variance. 
             <br/>
             1. <strong>Total CV</strong> = √(CV<sub>tech</sub>² + CV<sub>bio</sub>²). 
             <br/>
             2. <strong>Effect Size (d)</strong> = %Change / CV<sub>total</sub>. 
             <br/>
             3. <strong>Sample Size (N)</strong> = 2 × ((Z<sub>α/2</sub> + Z<sub>β</sub>) / d)².
             {applyCorrection && (
               <div className="mt-2 p-2 bg-indigo-100/50 text-indigo-800 rounded border border-indigo-200">
                 <strong>Multiplex Correction Applied:</strong> Alpha adjusted from {alpha} to {calculationResults.effectiveAlpha.toExponential(2)} (Bonferroni) to account for {numAnalytes} parallel tests.
               </div>
             )}
          </div>

        </div>

      </div>
    </div>
  );
};
