
import { BIOMARKERS, TIMEPOINT_ORDER } from '../constants';
import { Arm, BiomarkerDef, Measurement, PatientData, Timepoint } from '../types';

// Helper to generate random number with normal distribution (Box-Muller transform)
function randn_bm(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export const generateMeasurementsForBiomarker = (
  biomarker: BiomarkerDef,
  arm: Arm
): Measurement[] => {
  const measurements: Measurement[] = [];
  
  const baseMean = biomarker.baselineMean || 10; // Default to 10 if not specified
  const patientBase = baseMean + (randn_bm() * (baseMean * 0.2)); 
  
  // Add baseline measurement
  measurements.push({
    biomarkerId: biomarker.id,
    timepoint: Timepoint.BASELINE,
    value: Math.max(0.1, patientBase),
    changeFromBaseline: 0,
    percentChange: 0
  });

  // Define Treatment Effect per Arm
  let effectFactor = 0;
  if (biomarker.direction === 'lower_is_better') {
    if (arm === Arm.PLACEBO) effectFactor = -0.02; // Slight placebo improvement or noise
    if (arm === Arm.DRUG_1MG) effectFactor = -0.15; // 15% reduction
    if (arm === Arm.DRUG_2MG) effectFactor = -0.30; // 30% reduction
  } else {
    // higher is better
    if (arm === Arm.PLACEBO) effectFactor = 0.01;
    if (arm === Arm.DRUG_1MG) effectFactor = 0.10;
    if (arm === Arm.DRUG_2MG) effectFactor = 0.25;
  }

  // Generate Follow-up points
  [Timepoint.WEEK_4, Timepoint.WEEK_12, Timepoint.WEEK_24].forEach((tp, idx) => {
    const timeProgress = (idx + 1) / 3; // 0.33, 0.66, 1.0
    
    // Variation: Random noise + Effect * TimeProgress
    const noise = randn_bm() * (patientBase * 0.05); // 5% measurement error
    const totalEffect = patientBase * effectFactor * timeProgress;
    
    let value = patientBase + totalEffect + noise;
    value = Math.max(0.01, value); // Prevent negative values

    measurements.push({
      biomarkerId: biomarker.id,
      timepoint: tp,
      value: value,
      changeFromBaseline: value - patientBase,
      percentChange: ((value - patientBase) / patientBase) * 100
    });
  });

  return measurements;
};

export const generateSimulatedData = (patientCount: number = 600, biomarkers: BiomarkerDef[] = BIOMARKERS): PatientData[] => {
  const patients: PatientData[] = [];
  const arms = [Arm.PLACEBO, Arm.DRUG_1MG, Arm.DRUG_2MG];
  
  for (let i = 0; i < patientCount; i++) {
    const arm = arms[i % 3];
    const patientId = `PT-${(i + 1).toString().padStart(4, '0')}`;
    let measurements: Measurement[] = [];

    biomarkers.forEach(bio => {
      const bioMeasurements = generateMeasurementsForBiomarker(bio, arm);
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
  newBiomarker: BiomarkerDef
): PatientData[] => {
  return currentData.map(patient => {
    const newMeasurements = generateMeasurementsForBiomarker(
      newBiomarker,
      patient.arm
    );
    return {
      ...patient,
      measurements: [...patient.measurements, ...newMeasurements]
    };
  });
};

export const aggregateData = (patients: PatientData[]): Record<string, any> => {
  // Complex aggregation logic could go here if needed outside components
  return {};
};
