
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

export enum AppTab {
  DASHBOARD = 'dashboard',
  POWER = 'power',
  SINGLE_CELL = 'singlecell',
  SPATIAL = 'spatial',
  OMICS = 'omics',
}

export enum OmicsModality {
  METABOLOMICS = 'metabolomics',
  LIPIDOMICS = 'lipidomics',
}

export enum StudyDesign {
  TRIAL = 'trial',
  OBSERVATIONAL = 'observational',
}

export enum MultiplicityMethod {
  FDR = 'fdr',
  BONFERRONI = 'bonferroni',
}

export interface OmicsPlatform {
  id: string;
  name: string;
  company: string;
  modality: OmicsModality;
  typicalFeatures: number;
  medianCV: number; // Coefficient of Variation (0.1 = 10%)
  description: string;
}

export interface PowerCalculationParams {
  modality: OmicsModality;
  platformId: string;
  sampleSize: number;
  effectSize: number; // Fold change or Cohen's d
  alpha: number;
  fdr: number;
  isStratified: boolean;
  design: StudyDesign;
  numTimepoints: number; // 1 to 5
  backgroundNoise: number; // 0 to 1 (Placebo effect or confounder noise)
  numFeatures: number;
  featureCorrelation: number; // 0 to 1
  multiplicityMethod: MultiplicityMethod;
}

export interface PowerResultPoint {
  n: number;
  power: number;
}
