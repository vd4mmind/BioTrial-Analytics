
import { BiomarkerCategory, BiomarkerDef, Arm, Timepoint, OmicsPlatform, OmicsModality } from './types';

export const OMICS_PLATFORMS: OmicsPlatform[] = [
  // Metabolomics
  {
    id: 'metabolon-global',
    name: 'Global Discovery Panel',
    company: 'Metabolon',
    modality: OmicsModality.METABOLOMICS,
    typicalFeatures: 1500,
    medianCV: 0.15,
    description: 'Untargeted discovery of ~1,500 metabolites. High coverage, moderate variance.'
  },
  {
    id: 'biocrates-p500',
    name: 'AbsoluteIDQ p500',
    company: 'Biocrates',
    modality: OmicsModality.METABOLOMICS,
    typicalFeatures: 500,
    medianCV: 0.08,
    description: 'Targeted absolute quantification of 500 metabolites. Highly reproducible.'
  },
  {
    id: 'nightingale-nmr',
    name: 'NMR Biomarker Panel',
    company: 'Nightingale Health',
    modality: OmicsModality.METABOLOMICS,
    typicalFeatures: 250,
    medianCV: 0.05,
    description: 'NMR-based quantification of lipoproteins and small molecules. Low variance.'
  },
  // Lipidomics
  {
    id: 'sciex-lipidyzer',
    name: 'Lipidyzer Platform',
    company: 'Sciex',
    modality: OmicsModality.LIPIDOMICS,
    typicalFeatures: 1100,
    medianCV: 0.07,
    description: 'Quantitative species-level lipidomics. Gold standard for precision.'
  },
  {
    id: 'lipotype-shotgun',
    name: 'Shotgun Lipidomics',
    company: 'Lipotype',
    modality: OmicsModality.LIPIDOMICS,
    typicalFeatures: 600,
    medianCV: 0.10,
    description: 'High-throughput lipid fingerprinting. Ideal for large population cohorts.'
  },
  {
    id: 'thermo-lcms',
    name: 'High-Res LC-MS',
    company: 'Thermo Fisher',
    modality: OmicsModality.LIPIDOMICS,
    typicalFeatures: 2000,
    medianCV: 0.18,
    description: 'Deep discovery lipidomics. High sensitivity but higher sparsity/noise.'
  }
];

export const BIOMARKERS: BiomarkerDef[] = [
  // Inflammation
  { id: 'hsCRP', name: 'hs-CRP', category: BiomarkerCategory.INFLAMMATION, unit: 'mg/L', direction: 'lower_is_better', baselineMean: 3.5 },
  { id: 'IL-6', name: 'IL-6', category: BiomarkerCategory.INFLAMMATION, unit: 'pg/mL', direction: 'lower_is_better', baselineMean: 5.0 },
  { id: 'TNF-a', name: 'TNF-alpha', category: BiomarkerCategory.INFLAMMATION, unit: 'pg/mL', direction: 'lower_is_better', baselineMean: 15.0 },
  
  // Fibrosis
  { id: 'Col1a1', name: 'Collagen 1a1', category: BiomarkerCategory.FIBROSIS, unit: 'ng/mL', direction: 'lower_is_better', baselineMean: 120 },
  { id: 'TGF-b', name: 'TGF-beta', category: BiomarkerCategory.FIBROSIS, unit: 'ng/mL', direction: 'lower_is_better', baselineMean: 45 },
  { id: 'a-SMA', name: 'alpha-SMA', category: BiomarkerCategory.FIBROSIS, unit: 'IU/L', direction: 'lower_is_better', baselineMean: 30 },
  
  // Oxidative Stress
  { id: 'MDA', name: 'Malondialdehyde', category: BiomarkerCategory.OXIDATIVE_STRESS, unit: 'µM', direction: 'lower_is_better', baselineMean: 2.5 },
  { id: 'GSH', name: 'Glutathione', category: BiomarkerCategory.OXIDATIVE_STRESS, unit: 'µM', direction: 'higher_is_better', baselineMean: 800 },

  // Metabolic
  { id: 'HbA1c', name: 'HbA1c', category: BiomarkerCategory.METABOLIC_HEALTH, unit: '%', direction: 'lower_is_better', baselineMean: 6.2 },
  { id: 'Adiponectin', name: 'Adiponectin', category: BiomarkerCategory.METABOLIC_HEALTH, unit: 'µg/mL', direction: 'higher_is_better', baselineMean: 10 },
];

export const ARM_COLORS = {
  [Arm.PLACEBO]: '#94a3b8', // Slate 400
  [Arm.DRUG_1MG]: '#3b82f6', // Blue 500
  [Arm.DRUG_2MG]: '#7c3aed', // Violet 600
};

export const TIMEPOINT_ORDER = [
  Timepoint.BASELINE,
  Timepoint.WEEK_4,
  Timepoint.WEEK_12,
  Timepoint.WEEK_24,
];
