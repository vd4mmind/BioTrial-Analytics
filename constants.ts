
import { BiomarkerCategory, BiomarkerDef, Arm, Timepoint } from './types';

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
