import React, { useState, useMemo } from 'react';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { Microscope, Grid, Dna, ShieldAlert, Target, Info, CalendarClock, Zap, LayoutTemplate, Sigma, Users, FileText } from 'lucide-react';

// Inverse standard normal CDF (Probit)
function getZScore(p: number): number {
  if (p >= 1) return 6.5;
  if (p <= 0) return -6.5;
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
}

// Standard normal CDF
function getNormalProbability(z: number): number {
  if (z < -6.5) return 0;
  if (z > 6.5) return 1;
  let term = 1, sum = 0, k = 0, factK = 1;
  const loopStop = Math.exp(-23);
  while(Math.abs(term) > loopStop) {
    term = 0.3989422804 * Math.pow(-1,k) * Math.pow(z, 2*k+1) / (2*k+1) / Math.pow(2,k) / factK;
    sum += term;
    k++;
    factK *= k;
  }
  return sum + 0.5;
}

type ScenarioType = 'standard' | 'low_effect' | 'high_var' | 'deep_seq';

interface ScenarioDef {
    id: ScenarioType;
    label: string;
    description: string;
    params: {
        effectSize: number;
        bioCV: number;
        genesPerCell: number;
        cellsPerPerson: number;
    }
}

const SCENARIOS: ScenarioDef[] = [
    { 
        id: 'standard', 
        label: 'Standard Efficacy', 
        description: 'Balanced parameters (0.5 log2FC, 60% CV)',
        params: { effectSize: 0.5, bioCV: 0.6, genesPerCell: 1500, cellsPerPerson: 5000 }
    },
    { 
        id: 'low_effect', 
        label: 'Low Effect Size', 
        description: 'Weak signal (0.3 log2FC). Requires larger N.',
        params: { effectSize: 0.3, bioCV: 0.6, genesPerCell: 1500, cellsPerPerson: 5000 }
    },
    { 
        id: 'high_var', 
        label: 'High Biological CV', 
        description: 'Noisy population (100% CV). Hard to detect changes.',
        params: { effectSize: 0.5, bioCV: 1.0, genesPerCell: 1500, cellsPerPerson: 5000 }
    },
    { 
        id: 'deep_seq', 
        label: 'High Sensitivity', 
        description: 'Deep sequencing reduces technical noise.',
        params: { effectSize: 0.5, bioCV: 0.6, genesPerCell: 2500, cellsPerPerson: 8000 }
    }
];

export const SingleCellPower: React.FC = () => {
  // --- State: Experimental Design (Trial Structure) ---
  const [patientsPerArm, setPatientsPerArm] = useState<number>(20); 
  const [targetCellsPerPerson, setTargetCellsPerPerson] = useState<number>(5000); // Throughput
  const [meanGenesPerCell, setMeanGenesPerCell] = useState<number>(1500); // Resolution (Depth)
  const [timepoints, setTimepoints] = useState<number>(2); // Longitudinal Samples (Default 2: Baseline + End)
  
  // --- State: QC & Sample Constraints ---
  const [minTotalCells, setMinTotalCells] = useState<number>(500); // Sample Yield QC
  const [minGenesPerCell, setMinGenesPerCell] = useState<number>(200); // Complexity QC (Standard scRNA parameter)
  const [minClusterSize, setMinClusterSize] = useState<number>(10); // Dropout definition
  
  // --- State: Biological Hypothesis (The "Effect") ---
  const [numCellTypes, setNumCellTypes] = useState<number>(20); 
  const [minGenesImpacted, setMinGenesImpacted] = useState<number>(250); 
  const [effectSizeLog2, setEffectSizeLog2] = useState<number>(0.5); 
  const [bioCV, setBioCV] = useState<number>(0.6); // 60% biological variability

  // --- State: Scenario ---
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('standard');
  
  // Constants
  const alpha = 0.05;
  const intraSubjectCorr = 0.5; // Longitudinal benefit

  const handleApplyScenario = (scenarioId: ScenarioType) => {
      const s = SCENARIOS.find(sc => sc.id === scenarioId);
      if (s) {
          setSelectedScenario(scenarioId);
          setEffectSizeLog2(s.params.effectSize);
          setBioCV(s.params.bioCV);
          setMeanGenesPerCell(s.params.genesPerCell);
          setTargetCellsPerPerson(s.params.cellsPerPerson);
      }
  };

  // --- Calculation Logic ---
  
  interface PowerResult {
    power: number;
    effectiveN: number;
    isQCFail: boolean;
    failReason?: string;
    expectedCells: number;
    dropoutFactor: number;
  }

  const calculatePower = (nPerArm: number, abundance: number): PowerResult => {
    // --- 1. QC Check: Resolution (Genes per Cell) ---
    // Standard scRNA QC: If the average genes detected per cell is lower than the QC threshold,
    // the data is too low quality to use.
    if (meanGenesPerCell < minGenesPerCell) {
       return { power: 0, effectiveN: 0, isQCFail: true, failReason: 'Low Resolution (< QC)', expectedCells: 0, dropoutFactor: 0 };
    }

    // --- 2. QC Check: Sample Yield (Cells per Patient) ---
    if (targetCellsPerPerson < minTotalCells) {
      return { power: 0, effectiveN: 0, isQCFail: true, failReason: 'Low Yield', expectedCells: 0, dropoutFactor: 0 };
    }

    // --- 3. Dropout Modeling ---
    const expectedCellsPerPatient = targetCellsPerPerson * abundance;
    
    // Linear penalty if cell count is below cluster threshold
    let dropoutFactor = 1;
    if (expectedCellsPerPatient < minClusterSize) {
        dropoutFactor = Math.max(0, expectedCellsPerPatient / minClusterSize); 
    }

    // Effective N per arm (patients with valid data for this cell type)
    const effectiveN = nPerArm * dropoutFactor;

    if (effectiveN < 3) {
         return { power: 0, effectiveN, isQCFail: true, failReason: 'High Dropout', expectedCells: expectedCellsPerPatient, dropoutFactor };
    }

    // --- 4. Variance Modeling (Pseudobulk LMM) ---
    
    // A. Biological Variance Component
    // (1-rho) accounts for paired design (Baseline vs End).
    // With more timepoints (T > 2), the variance of the estimated treatment trend decreases.
    // We apply a "Longitudinal Precision Factor" to account for the extra information from repeated measures.
    // Factor = 1 / (1 + (T-2)*0.5). For T=2 -> 1. For T=4 -> 0.5 (Twice the precision).
    const longitudinalFactor = 1 / (1 + (timepoints - 2) * 0.5);
    const bioVarPart = (2 * Math.pow(bioCV, 2)) / effectiveN * (1 - intraSubjectCorr) * longitudinalFactor;

    // B. Technical Variance Component
    // We assume we are testing the MEAN expression of the "Impacted Genes" (Module Score).
    // We must estimate the UMI counts available for these specific genes.
    
    // Heuristic: UMI Count ≈ GenesDetected * 2.5 (Empirical 10x ratio)
    // Dynamic noise factor based on Resolution:
    // If MeanGenes = 500 (Low), Noise is High. If MeanGenes = 2500 (High), Noise is Low.
    const resolutionFactor = 500 / meanGenesPerCell; // Scales noise up if depth is low
    
    // Counts accumulated across all cells in the patient (Pseudobulk)
    const pseudobulkCounts = expectedCellsPerPatient * (2.0 / resolutionFactor); // Approx 2 counts per gene per cell at high depth
    
    // Poisson Noise approximation
    // By averaging across 'minGenesImpacted' (Module Size), we reduce the technical noise of the estimator.
    // Variance of the mean of M independent variables = Var / M.
    const moduleSize = Math.max(1, minGenesImpacted);
    const techVarPart = 2 / (effectiveN * timepoints * pseudobulkCounts * moduleSize);

    const totalSE = Math.sqrt(bioVarPart + techVarPart);

    // --- 5. Z-Test Power ---
    const z = (Math.abs(effectSizeLog2) / totalSE) - getZScore(1 - alpha/2);
    const power = getNormalProbability(z);
    
    return { 
        power: Math.max(0, Math.min(1, power)), 
        effectiveN, 
        isQCFail: false,
        expectedCells: expectedCellsPerPatient,
        dropoutFactor
    };
  };

  // Generate Matrix Data
  const powerMatrix = useMemo(() => {
    const patientSteps = [5, 10, 15, 20, 25, 30, 40, 50]; // N per Arm
    
    // Abundance range
    const abundanceSteps = [0.005, 0.01, 0.02, 0.05, 0.10, 0.20, 0.30, 0.50];
    
    const matrix = abundanceSteps.map(proportion => {
        return {
            proportion,
            label: `${(proportion * 100).toFixed(1)}%`,
            category: proportion < 0.02 ? 'Rare' : proportion < 0.1 ? 'Medium' : 'Major',
            values: patientSteps.map(N => calculatePower(N, proportion))
        };
    });

    return { patientSteps, matrix };
  }, [targetCellsPerPerson, meanGenesPerCell, minGenesPerCell, minTotalCells, minClusterSize, minGenesImpacted, effectSizeLog2, timepoints, bioCV]);

  const getColor = (res: PowerResult) => {
      if (res.isQCFail) return 'bg-slate-100 text-slate-400 border-slate-200';
      const p = res.power;
      if (p < 0.5) return 'bg-red-50 text-red-900 border-red-100';
      if (p < 0.7) return 'bg-amber-50 text-amber-900 border-amber-100';
      if (p < 0.8) return 'bg-yellow-50 text-yellow-900 border-yellow-100';
      if (p < 0.9) return 'bg-emerald-50 text-emerald-900 border-emerald-100';
      return 'bg-emerald-100 text-emerald-900 font-bold border-emerald-200';
  };

  const currentScenarioData = useMemo(() => {
     return powerMatrix.matrix.map(row => {
         const res = calculatePower(patientsPerArm, row.proportion);
         return {
             abundance: row.label,
             power: res.power,
             effectiveN: parseFloat(res.effectiveN.toFixed(1)), // Ensure number for charting
             dropoutFactor: parseFloat(res.dropoutFactor.toFixed(2)),
             isQCFail: res.isQCFail,
             failReason: res.failReason
         };
     });
  }, [patientsPerArm, powerMatrix]);

  return (
    <div className="animate-in fade-in duration-500 pb-12">
        {/* Intro / Context Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-6 items-start">
             <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-2">
                    <Microscope size={20} />
                    Pseudobulk LMM Power Analysis
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                   This model calculates the power to detect a <strong>Drug vs Placebo</strong> effect in a randomized controlled trial.
                   It assumes a <strong>1:1 randomization</strong> (Equal N per arm). 
                   The hypothesis tests if we can detect a differential state change in {minGenesImpacted} genes (Effect Size {effectSizeLog2}) within a specific cell type.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-blue-800">
                    <span className="bg-blue-100 px-2 py-1 rounded border border-blue-200">Design: 1:1 RCT</span>
                    <span className="bg-blue-100 px-2 py-1 rounded border border-blue-200">Model: Pseudobulk LMM</span>
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded border border-indigo-200">
                        {timepoints} Timepoints (Paired/Longitudinal)
                    </span>
                </div>
             </div>
             
             <div className="w-full md:w-64 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Target size={12} />
                    Current Study Size
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span>Patients (Drug):</span>
                        <span className="font-mono font-bold">{patientsPerArm}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span>Patients (Placebo):</span>
                        <span className="font-mono font-bold">{patientsPerArm}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span>Timepoints:</span>
                        <span className="font-mono font-bold">{timepoints}</span>
                    </div>
                     <div className="flex justify-between pt-1">
                        <span title="Total sequencing libraries (N * Timepoints)">Total Libraries:</span>
                        <span className="font-mono font-bold text-indigo-600">{patientsPerArm * 2 * timepoints}</span>
                    </div>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Panel: Inputs */}
            <div className="xl:col-span-4 space-y-6">

                {/* 0. Scenario Selector */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
                        <LayoutTemplate className="text-indigo-600" size={20} />
                        <h3>Simulation Scenarios</h3>
                    </div>
                    <div className="space-y-3">
                        <p className="text-xs text-slate-500">Select a preset to demonstrate impact on power.</p>
                        <div className="grid grid-cols-1 gap-2">
                            {SCENARIOS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleApplyScenario(s.id)}
                                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                                        selectedScenario === s.id 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm ring-1 ring-indigo-200' 
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="font-semibold flex items-center gap-2">
                                        {s.label}
                                        {selectedScenario === s.id && <Zap size={12} className="text-indigo-500 fill-indigo-500" />}
                                    </div>
                                    <div className="text-[10px] opacity-80 mt-0.5">{s.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* 1. QC & Dropout Logic */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-400">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
                        <ShieldAlert className="text-amber-500" size={20} />
                        <h3>QC Criteria (Per Sample)</h3>
                    </div>
                    <div className="space-y-5">
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                             <label className="flex justify-between text-xs font-bold text-amber-800 uppercase mb-1">
                                 Min Genes Detected per Cell
                                 <span className="font-mono">{minGenesPerCell}</span>
                             </label>
                             <input 
                                type="range" min="200" max="1000" step="50"
                                value={minGenesPerCell}
                                onChange={(e) => setMinGenesPerCell(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                            />
                             <p className="text-[10px] text-amber-700 mt-1.5 leading-tight">
                                Standard scRNA QC. Cells/Samples with complexity below this threshold are discarded as low quality.
                             </p>
                        </div>

                        <div>
                             <label className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                 Min Total Cells per Sample
                                 <span className="text-slate-700 font-mono">{minTotalCells}</span>
                             </label>
                             <input 
                                type="range" min="100" max="2000" step="100"
                                value={minTotalCells}
                                onChange={(e) => setMinTotalCells(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                <div className="flex items-center gap-1.5">
                                    Min Cluster Size (Dropout Threshold)
                                    <div className="group relative flex items-center">
                                        <Info size={13} className="text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
                                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-normal normal-case tracking-normal leading-relaxed">
                                            <div className="font-semibold mb-1 text-indigo-200">Dropout Mechanism</div>
                                            Defines the minimum number of cells required to form a reliable cluster. 
                                            <br/><br/>
                                            <span className="opacity-80">Formula:</span> <br/>
                                            If <em>(Cells × Abundance) &lt; Threshold</em>, the <strong>Dropout Factor</strong> reduces the effective sample size (N), simulating that the cell type is "undetected" in some patients.
                                            <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-slate-800 rotate-45 transform"></div>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-slate-700 font-mono">{minClusterSize} cells</span>
                            </label>
                            <input 
                                type="range" min="1" max="50" step="1"
                                value={minClusterSize}
                                onChange={(e) => setMinClusterSize(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                            />
                             <div className="mt-1.5 flex items-start gap-1.5 p-2 bg-slate-50 rounded border border-slate-100">
                                <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    <strong>Effective N Impact:</strong> Rare cell types often fail to meet this cluster threshold in every patient. 
                                    This introduces a <strong>Dropout Factor</strong> that reduces your statistical power significantly for low-abundance populations.
                                </p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* 2. Experimental Design */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
                        <Grid className="text-indigo-600" size={20} />
                        <h3>Experimental Design</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                <span>Patients per Arm (N)</span>
                                <span className="text-indigo-600 font-mono bg-indigo-50 px-2 rounded">{patientsPerArm}</span>
                            </div>
                            <input 
                                type="range" min="5" max="50" step="5"
                                value={patientsPerArm} 
                                onChange={(e) => setPatientsPerArm(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                <span className="flex items-center gap-1"><CalendarClock size={12} /> Timepoints per Patient</span>
                                <span className="text-indigo-600 font-mono bg-indigo-50 px-2 rounded">{timepoints}</span>
                            </div>
                            <input 
                                type="range" min="2" max="6" step="1"
                                value={timepoints} 
                                onChange={(e) => setTimepoints(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                             <p className="text-[10px] text-slate-400 mt-1">
                                Longitudinal samples (paired) increase power by reducing within-subject biological variance.
                             </p>
                        </div>

                        <div>
                             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                 Target Throughput (Cells/Sample)
                             </label>
                             <select 
                                value={targetCellsPerPerson}
                                onChange={(e) => setTargetCellsPerPerson(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 mb-1"
                             >
                                 <option value={1000}>Low (1,000 cells)</option>
                                 <option value={3000}>Medium (3,000 cells)</option>
                                 <option value={5000}>Standard (5,000 cells)</option>
                                 <option value={8000}>High (8,000 cells)</option>
                                 <option value={10000}>Ultra (10,000 cells)</option>
                             </select>
                        </div>

                        <div>
                             <label className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                 Sequencing Depth (Resolution)
                                 <span className={`font-mono ${meanGenesPerCell < minGenesPerCell ? 'text-red-500' : 'text-slate-700'}`}>
                                    {meanGenesPerCell} Genes/Cell
                                 </span>
                             </label>
                             <input 
                                type="range" min="200" max="3000" step="100"
                                value={meanGenesPerCell}
                                onChange={(e) => setMeanGenesPerCell(parseInt(e.target.value))}
                                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${meanGenesPerCell < minGenesPerCell ? 'bg-red-200 accent-red-500' : 'bg-slate-200 accent-indigo-600'}`}
                             />
                             <p className="text-[10px] text-slate-400 mt-1">
                                Mean genes detected per cell. Must exceed QC Criteria ({minGenesPerCell}).
                             </p>
                        </div>
                    </div>
                </div>

                {/* 3. Biological Hypothesis */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-100 pb-2">
                        <Dna className="text-pink-600" size={20} />
                        <h3>Biological Hypothesis</h3>
                    </div>
                    
                    <div className="space-y-6">
                         <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                            <div className="flex justify-between text-xs font-bold text-pink-800 uppercase mb-1">
                                <span>Target: Impacted Genes</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="5" max="1000"
                                        value={minGenesImpacted}
                                        onChange={(e) => setMinGenesImpacted(parseInt(e.target.value) || 5)}
                                        className="w-16 px-1 py-0.5 text-right text-xs border border-pink-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                </div>
                            </div>
                            <input 
                                type="range" min="5" max="500" step="1"
                                value={minGenesImpacted}
                                onChange={(e) => setMinGenesImpacted(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                             />
                             <p className="text-[10px] text-pink-700 mt-1.5 leading-tight">
                                We assume the Drug impacts at least {minGenesImpacted} genes with an effect size of {effectSizeLog2}. 
                                Power is calculated for detecting the mean expression shift of this gene signature (Module Score), which reduces technical noise.
                             </p>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                <span>Avg. Effect Size (Log2FC)</span>
                                <span className="text-pink-600">{effectSizeLog2}</span>
                            </div>
                            <input 
                                type="range" min="0.2" max="2.0" step="0.1"
                                value={effectSizeLog2} 
                                onChange={(e) => setEffectSizeLog2(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                            />
                        </div>

                         <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                <span>Biological CV (Variability)</span>
                                <span className="text-pink-600">{(bioCV * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" min="0.1" max="1.5" step="0.1"
                                value={bioCV} 
                                onChange={(e) => setBioCV(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Inter-patient heterogeneity.</p>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                                <span>Cell Types (Complexity)</span>
                                <span className="text-pink-600">{numCellTypes} Types</span>
                            </div>
                            <input 
                                type="range" min="5" max="40" step="5"
                                value={numCellTypes} 
                                onChange={(e) => setNumCellTypes(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Right Panel: Output */}
            <div className="xl:col-span-8 space-y-6">
                
                {/* 1. Power Heatmap Table */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Power Matrix</h3>
                            <p className="text-sm text-slate-500">
                                Can we detect {minGenesImpacted} impacted genes ({effectSizeLog2} log2FC) in Drug vs Placebo?
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 flex-wrap">
                             <span className="w-3 h-3 bg-slate-200 border border-slate-300 rounded"></span> <span className="text-xs text-slate-500 mr-2">QC Fail</span>
                             <span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span> <span className="text-xs text-slate-500 mr-2">&lt;50%</span>
                             <span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></span> <span className="text-xs text-slate-500 mr-2">70-80%</span>
                             <span className="w-3 h-3 bg-emerald-200 border border-emerald-300 rounded"></span> <span className="text-xs text-slate-500">&gt;80%</span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 text-left bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">
                                        Cell Type Prevalence<br/>
                                        <span className="text-[10px] font-normal text-slate-400 normal-case">(Exp. Cells/Patient)</span>
                                    </th>
                                    <th colSpan={powerMatrix.patientSteps.length} className="p-2 bg-indigo-50/50 border-b border-indigo-100 text-xs font-bold text-indigo-800">
                                        Sample Size (Patients Per Arm)
                                    </th>
                                </tr>
                                <tr>
                                    <th className="p-0 border-b border-slate-200"></th>
                                    {powerMatrix.patientSteps.map(N => (
                                        <th key={N} className={`p-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 ${N === patientsPerArm ? 'bg-indigo-100 text-indigo-800 border-indigo-200 border-x border-t' : ''}`}>
                                            N={N}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {powerMatrix.matrix.map((row) => (
                                    <tr key={row.label} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-3 text-left border-b border-slate-100 font-medium text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span>{row.label}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                    row.category === 'Rare' ? 'bg-slate-100 text-slate-600' : 
                                                    row.category === 'Medium' ? 'bg-indigo-50 text-indigo-600' : 
                                                    'bg-pink-50 text-pink-600'
                                                }`}>
                                                    {row.category}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                ~{(targetCellsPerPerson * row.proportion).toFixed(0)} cells
                                            </div>
                                        </td>
                                        {row.values.map((res, idx) => (
                                            <td key={idx} className={`p-1 border-b border-slate-100 ${powerMatrix.patientSteps[idx] === patientsPerArm ? 'bg-indigo-50/30 border-x border-indigo-100' : ''}`}>
                                                <div 
                                                    className={`h-9 w-full flex items-center justify-center rounded text-xs border transition-all ${getColor(res)}`}
                                                    title={res.isQCFail ? `QC Fail: ${res.failReason}` : `Power: ${(res.power*100).toFixed(1)}%`}
                                                >
                                                    {res.isQCFail ? 'QC' : `${(res.power * 100).toFixed(0)}%`}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Power Curve for Selected N */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                Power Curve & Effective N (N={patientsPerArm} per Arm)
                            </h3>
                             <p className="text-xs text-slate-400 mt-1">
                                Showing Power (Left Axis) and Effective Sample Size after QC/Dropout (Right Axis).
                            </p>
                        </div>
                    </div>
                    
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={currentScenarioData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="abundance" 
                                    stroke="#64748b" 
                                    label={{ value: 'Cell Type Prevalence', position: 'insideBottom', offset: -10 }} 
                                    tick={{fontSize: 12}}
                                />
                                <YAxis 
                                    yAxisId="left"
                                    domain={[0, 1]} 
                                    stroke="#db2777" 
                                    label={{ value: 'Power (1-β)', angle: -90, position: 'insideLeft', fill: '#db2777' }} 
                                    tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                />
                                <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#6366f1"
                                    label={{ value: 'Effective N (Patients)', angle: 90, position: 'insideRight', fill: '#6366f1' }}
                                    domain={[0, 'dataMax']}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val: number, name: string, props: any) => {
                                        if (name === 'power') {
                                            const isFail = props.payload.isQCFail;
                                            if (isFail) return [`QC Fail: ${props.payload.failReason}`, 'Power'];
                                            return [(val * 100).toFixed(1) + '%', 'Power'];
                                        }
                                        if (name === 'Effective N') {
                                            return [val, 'Effective N'];
                                        }
                                        return [val, name];
                                    }}
                                    labelFormatter={(label) => `Prevalence: ${label}`}
                                />
                                <Legend wrapperStyle={{ paddingTop: '30px' }} />
                                
                                <ReferenceLine yAxisId="left" y={0.8} stroke="#10b981" strokeDasharray="3 3" label={{ value: "80%", position: 'insideTopRight', fill: '#10b981', fontSize: 10 }} />
                                
                                <Area 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="power" 
                                    fill="url(#colorPower)" 
                                    stroke="none" 
                                    fillOpacity={0.1}
                                />
                                <defs>
                                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#db2777" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#db2777" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>

                                <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="power" 
                                    stroke="#db2777" 
                                    strokeWidth={3} 
                                    name="Power"
                                    dot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (payload.isQCFail) {
                                             return <circle cx={cx} cy={cy} r={4} fill="#94a3b8" stroke="none" />;
                                        }
                                        return <circle cx={cx} cy={cy} r={5} fill="#db2777" strokeWidth={2} stroke="#fff" />;
                                    }}
                                    activeDot={{r: 7}}
                                />

                                <Line
                                    yAxisId="right"
                                    type="step"
                                    dataKey="effectiveN"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    name="Effective N"
                                    dot={false}
                                />

                                <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="dropoutFactor" 
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="2 2"
                                    name="Retention Rate"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Method & Stats Footer */}
                    <div className="mt-6 border-t border-slate-100 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             
                             <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                                    <Info size={16} className="text-indigo-600" />
                                    Methodology: Longitudinal Pseudobulk Analysis
                                </h4>
                                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                                    <p>
                                        <strong>1. Pseudobulk Aggregation:</strong> To maximize robustness, we aggregate single-cell counts into patient-level profiles ("pseudobulks"). This aligns the data structure with standard clinical trial statistics (Linear Mixed Models).
                                    </p>
                                    <p>
                                        <strong>2. Longitudinal Design:</strong> The model assumes repeated measures (Baseline vs End). By tracking the <em>change</em> within each patient, we remove a significant portion of biological heterogeneity (Intra-subject Correlation), increasing power compared to a cross-sectional study.
                                    </p>
                                    <p>
                                        <strong>3. Dropout Impact & Effective N:</strong> Unlike bulk RNA-seq, rare cell types may be missed entirely in some patients. We model this using a linear penalty when expected counts fall below the <em>Min Cluster Size</em>.
                                        <span className="block mt-1.5 p-1.5 bg-slate-100 rounded border border-slate-200 font-mono text-[10px]">
                                            Dropout Factor = min(1, (Cells/Sample × Prevalence) / MinClusterSize)
                                        </span>
                                        This factor reduces the sample size available for analysis (Effective N).
                                    </p>
                                </div>
                             </div>

                             <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">
                                    <Sigma size={14} /> Statistical Power Formula (Z-Test)
                                </h4>
                                
                                <div className="text-center py-2 mb-4">
                                    <div className="inline-block bg-white px-4 py-2 rounded border border-slate-200 shadow-sm font-serif italic text-slate-800 text-sm">
                                        SE = &radic; <span className="text-pink-600">(V<sub>bio</sub> &middot; (1-&rho;) / N<sub>eff</sub>)</span> + <span className="text-indigo-600">(V<sub>tech</sub> / (Depth &middot; Sig))</span>
                                    </div>
                                </div>

                                <div className="space-y-2 text-[10px] text-slate-500">
                                    <div className="flex gap-2">
                                        <Users size={12} className="shrink-0 mt-0.5 text-pink-500" />
                                        <span>
                                            <strong className="text-slate-700">Effective N (N<sub>eff</sub>):</strong> The actual number of patients retaining the cell type after QC dropout.
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <FileText size={12} className="shrink-0 mt-0.5 text-indigo-500" />
                                        <span>
                                            <strong className="text-slate-700">Signature Size (Sig):</strong> Averaging expression across {minGenesImpacted} genes (Module Score) reduces technical noise by a factor of 1/Sig.
                                        </span>
                                    </div>
                                </div>
                             </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}