
export enum Arm {
  PLACEBO = 'Placebo',
  DRUG_1MG = 'Drug X 1mg',
  DRUG_2MG = 'Drug X 2mg',
}

export enum Timepoint {
  BASELINE = 'Baseline',
  WEEK_4 = 'Week 4',
  WEEK_12 = 'Week 12',
  WEEK_24 = 'Week 24',
}

export enum BiomarkerCategory {
  INFLAMMATION = 'Inflammation',
  FIBROSIS = 'Fibrosis',
  OXIDATIVE_STRESS = 'Oxidative Stress',
  METABOLIC_HEALTH = 'Metabolic Health',
  CUSTOM = 'Custom',
}

export interface BiomarkerDef {
  id: string;
  name: string;
  category: BiomarkerCategory;
  unit: string;
  direction: 'lower_is_better' | 'higher_is_better';
  baselineMean?: number;
}

export interface PatientData {
  patientId: string;
  arm: Arm;
  measurements: Measurement[];
}

export interface Measurement {
  biomarkerId: string;
  timepoint: Timepoint;
  value: number;
  changeFromBaseline?: number; // Absolute change
  percentChange?: number; // % change
}

export interface AggregatedPoint {
  timepoint: Timepoint;
  arm: Arm;
  mean: number;
  sem: number; // Standard Error of Mean
  n: number;
}

export interface StatsSummary {
  biomarkerId: string;
  data: AggregatedPoint[];
}
