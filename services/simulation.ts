
import { BIOMARKERS, TIMEPOINT_ORDER } from '../constants';
import { Arm, BiomarkerDef, Measurement, PatientData, Timepoint } from '../types';

// --- Configuration Types ---

export type TimeProfileType = 'linear' | 'immediate' | 'delayed' | 'biphasic' | 'peak_drop';

export interface SimulationConfig {
  scenarioName: string;
  drugEffectSize: number;      // -1.0 to 1.0 (Negative = reduction, Positive = increase)
  placeboEffectSize: number;   // -1.0 to 1.0
  variability: number;         // 0.0 to 2.0 (Coefficient of Variation / Noise factor)
  responderRate: number;       // 0.0 to 1.0 (Percentage of patients who respond to drug)
  timeProfile: TimeProfileType;
  drift: number;               // 0.0 to 0.5 (Random longitudinal drift)
}

// --- Presets ---

export const SCENARIO_PRESETS: Record<string, SimulationConfig> = {
  'Standard Efficacy': {
    scenarioName: 'Standard Efficacy',
    drugEffectSize: -0.25, // 25% improvement
    placeboEffectSize: -0.02,
    variability: 0.15,
    responderRate: 1.0,
    timeProfile: 'linear',
    drift: 0.02
  },
  'High Placebo': {
    scenarioName: 'High Placebo Response',
    drugEffectSize: -0.25,
    placeboEffectSize: -0.15, // High placebo
    variability: 0.20,
    responderRate: 1.0,
    timeProfile: 'linear',
    drift: 0.05
  },
  'Mixed Results': {
    scenarioName: 'Mixed Results',
    drugEffectSize: -0.20,
    placeboEffectSize: -0.01,
    variability: 0.40, // High noise
    responderRate: 0.60, // Only 60% respond
    timeProfile: 'delayed',
    drift: 0.05
  },
  'Failed Trial': {
    scenarioName: 'Failed Trial',
    drugEffectSize: -0.03,
    placeboEffectSize: -0.03,
    variability: 0.10,
    responderRate: 0.0,
    timeProfile: 'linear',
    drift: 0.02
  },
  'Biphasic': {
    scenarioName: 'Biphasic Response',
    drugEffectSize: -0.30,
    placeboEffectSize: -0.02,
    variability: 0.15,
    responderRate: 0.9,
    timeProfile: 'biphasic',
    drift: 0.02
  }
};

// --- Helpers ---

// Box-Muller transform for normal distribution
function randn_bm(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const getTimeProfileMultipliers = (type: TimeProfileType): [number, number, number] => {
  switch (type) {
    case 'immediate': return [0.8, 0.9, 1.0];
    case 'delayed':   return [0.05, 0.4, 1.0];
    case 'biphasic':  return [0.7, 1.0, 0.2]; // Strong mid-term, then washout
    case 'peak_drop': return [1.0, 0.5, 0.1]; // Peak early then drop
    case 'linear':    
    default:          return [0.33, 0.66, 1.0];
  }
};

// --- Generators ---

export const generateMeasurementsForBiomarker = (
  biomarker: BiomarkerDef,
  arm: Arm,
  config: SimulationConfig,
  isResponder: boolean
): Measurement[] => {
  const measurements: Measurement[] = [];
  
  // 1. Establish Baseline
  const baseMean = biomarker.baselineMean || 10;
  // Individual patient baseline variability
  const patientBase = baseMean + (randn_bm() * (baseMean * config.variability)); 
  
  measurements.push({
    biomarkerId: biomarker.id,
    timepoint: Timepoint.BASELINE,
    value: Math.max(0.01, patientBase),
    changeFromBaseline: 0,
    percentChange: 0
  });

  // 2. Determine Max Target Effect
  let targetEffect = 0;
  
  // Directionality correction:
  // If "lower is better", a negative effect size is good. 
  // If "higher is better", a positive effect size is good.
  // The config.drugEffectSize assumes "improvement magnitude".
  // We flip the sign if "improvement" means going down.
  const directionMultiplier = biomarker.direction === 'lower_is_better' ? 1 : -1;
  
  // Logic: 
  // If config.drugEffectSize is -0.3 (30% drop), and lower_is_better (mult 1), target is -0.3 * base.
  // If higher_is_better (mult -1), and we want 30% improvement, we usually enter positive 0.3 in UI.
  // Let's normalize: UI sends "Magnitude of Effect" (e.g., -0.3).
  // If lower_is_better, -0.3 is good.
  // If higher_is_better, we want +0.3. So we multiply by -1 if the UI sends negative for "improvement".
  
  // Simplified: The Config stores the RAW percentage change intended for the active arm.
  // E.g., -0.30 means "values go down by 30%".
  // If the biomarker is "Higher is better" (e.g. Adiponectin), the preset should have positive effect.
  // However, to make the UI sliders easy (Improvement vs Worsening), let's calculate relative to direction.
  
  const isActive = arm === Arm.DRUG_1MG || arm === Arm.DRUG_2MG;
  
  if (arm === Arm.PLACEBO) {
    // Placebo effect is applied directly
    // Adjust placebo direction to match biomarker direction roughly or just use raw config
    // Usually placebo effect is in the direction of "improvement" (placebo response)
    const placeboDir = biomarker.direction === 'lower_is_better' ? -1 : 1;
    targetEffect = Math.abs(config.placeboEffectSize) * placeboDir; 
  } else if (isActive) {
      if (isResponder) {
          // Dose response: 2mg gets full effect, 1mg gets 70% of effect
          const doseFactor = arm === Arm.DRUG_2MG ? 1.0 : 0.7;
          
          // Apply directionality automatically based on biomarker definition
          // If we say "30% Effect" (0.3), it implies Improvement.
          const improvementDir = biomarker.direction === 'lower_is_better' ? -1 : 1;
          targetEffect = Math.abs(config.drugEffectSize) * improvementDir * doseFactor;
      } else {
          // Non-responder behaves like placebo
          const placeboDir = biomarker.direction === 'lower_is_better' ? -1 : 1;
          targetEffect = Math.abs(config.placeboEffectSize) * placeboDir; 
      }
  }

  // 3. Generate Follow-up Points
  const profileMultipliers = getTimeProfileMultipliers(config.timeProfile);
  const timepoints = [Timepoint.WEEK_4, Timepoint.WEEK_12, Timepoint.WEEK_24];

  timepoints.forEach((tp, idx) => {
    const timeFactor = profileMultipliers[idx];
    
    // Calculate deterministic trend component
    const trendDelta = patientBase * targetEffect * timeFactor;
    
    // Add randomness (Intra-patient variability + Drift)
    const noiseSD = patientBase * (config.variability * 0.4); // Intra-patient noise is lower than inter-patient
    const randomNoise = randn_bm() * noiseSD;
    const drift = randn_bm() * (patientBase * config.drift * (idx + 1)); // Drift increases with time

    let val = patientBase + trendDelta + randomNoise + drift;
    val = Math.max(0.01, val); // Clip negative

    measurements.push({
      biomarkerId: biomarker.id,
      timepoint: tp,
      value: val,
      changeFromBaseline: val - patientBase,
      percentChange: ((val - patientBase) / patientBase) * 100
    });
  });

  return measurements;
};

export const generateSimulatedData = (
  patientCount: number = 600, 
  biomarkers: BiomarkerDef[] = BIOMARKERS,
  config: SimulationConfig = SCENARIO_PRESETS['Standard Efficacy']
): PatientData[] => {
  const patients: PatientData[] = [];
  const arms = [Arm.PLACEBO, Arm.DRUG_1MG, Arm.DRUG_2MG];

  for (let i = 0; i < patientCount; i++) {
    const arm = arms[i % 3];
    const patientId = `PT-${(i + 1).toString().padStart(4, '0')}`;
    
    // Determine Responder Status (Patient Level)
    // Placebo is always "responder" to placebo effect. Drug arms depend on rate.
    const isResponder = Math.random() < config.responderRate;

    let measurements: Measurement[] = [];
    
    biomarkers.forEach(bio => {
      const bioMeasurements = generateMeasurementsForBiomarker(bio, arm, config, isResponder);
      measurements = [...measurements, ...bioMeasurements];
    });

    patients.push({
      patientId,
      arm,
      measurements
    });
  }

  return patients;
};

export const augmentDataWithBiomarker = (
  currentData: PatientData[], 
  newBiomarker: BiomarkerDef,
  config: SimulationConfig = SCENARIO_PRESETS['Standard Efficacy']
): PatientData[] => {
  return currentData.map(patient => {
    // We can't recover the exact "isResponder" state from previous generation easily without storing it,
    // so we re-roll probability. In a real app, patient metadata would store "responderStatus".
    // For prototype, we assume the same rate probability.
    const isResponder = Math.random() < config.responderRate;
    
    const newMeasurements = generateMeasurementsForBiomarker(
      newBiomarker,
      patient.arm,
      config,
      isResponder
    );
    return {
      ...patient,
      measurements: [...patient.measurements, ...newMeasurements]
    };
  });
};
