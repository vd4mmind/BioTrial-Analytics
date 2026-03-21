
import { MultiplicityMethod, OmicsModality, OmicsPlatform, PowerCalculationParams, PowerResultPoint, StudyDesign } from '../types';
import { OMICS_PLATFORMS } from '../constants';

/**
 * Calculates the effective significance threshold (alpha) after multiplicity adjustment.
 */
export const calculateEffectiveAlpha = (params: PowerCalculationParams): number => {
  const m = params.numFeatures;
  // Non-linear scaling: as correlation increases, the "Effective Number of Tests" drops.
  // 0 correlation = m tests. 1 correlation = 1 test.
  const correlationPenalty = Math.pow(1 - params.featureCorrelation, 0.8);
  const mEff = Math.max(1, m * correlationPenalty);
  
  if (params.multiplicityMethod === MultiplicityMethod.BONFERRONI) {
    // FWER: Bonferroni
    return params.alpha / mEff;
  } else {
    // FDR: Benjamini-Hochberg Approximation
    const m1 = Math.max(1, m * 0.1); // Assume 10% are truly differential
    return (m1 * params.fdr) / (mEff * (1 - params.fdr));
  }
};

/**
 * Calculates statistical power for high-dimensional omics data.
 * Forked Architecture: Distinguishes between Interventional Trials (Baseline-Adjusted)
 * and Observational Discovery (Confounder-Adjusted).
 */
export const calculateOmicsPower = (params: PowerCalculationParams): PowerResultPoint[] => {
  const platform = OMICS_PLATFORMS.find(p => p.id === params.platformId);
  if (!platform) return [];

  const results: PowerResultPoint[] = [];
  const isTrial = params.design === StudyDesign.TRIAL;
  
  // 1. Multiplicity Adjustment (The "Engine")
  const alphaAdj = calculateEffectiveAlpha(params);
  
  // 2. Variance & Effective N Logic (The "Fork")
  // Platform-aware correlation: Targeted panels (Biocrates/Nightingale) have higher correlation
  // than global discovery panels (Metabolon/Thermo).
  let rho = params.featureCorrelation;
  if (platform.id.includes('biocrates') || platform.id.includes('nightingale')) {
    rho = Math.max(rho, 0.75);
  } else if (platform.id.includes('sciex')) {
    rho = Math.max(rho, 0.7);
  }
  
  let varianceMultiplier: number;
  let timepointGain: number;
  let netEffectSize: number;

  // Incorporate Platform Technical Variance (CV%)
  // A platform with 15% CV (0.15) has more noise than one with 5% CV (0.05).
  const technicalNoiseFactor = 1 + (platform.medianCV * 2);

  if (isTrial) {
    // CLINICAL TRIAL: Baseline-Adjusted (ANCOVA/DiD)
    // Variance is reduced by (1 - rho) because we use each patient as their own control.
    varianceMultiplier = (1 - rho) * technicalNoiseFactor;
    
    // Timepoints in a trial provide linear-ish gain in effective N (LMM models)
    timepointGain = params.numTimepoints;
    
    // Background noise in trials is "Placebo Drift" (Signal Subtraction)
    netEffectSize = Math.max(0.05, params.effectSize - (params.backgroundNoise * 0.4));
  } else {
    // OBSERVATIONAL: Cross-sectional / Discovery
    // No baseline cancellation. Variance is 1.0 (standardized).
    varianceMultiplier = 1.0 * technicalNoiseFactor;
    
    // Timepoints in observational have diminishing returns (sqrt gain)
    timepointGain = Math.sqrt(params.numTimepoints);
    
    // Background noise in observational is "Confounder Burden" (Variance Addition)
    // Each 10% noise increases residual variance, lowering effective power.
    varianceMultiplier += (params.backgroundNoise * 0.8);
    netEffectSize = params.effectSize;
  }
  
  // 3. Stratification Penalty
  const stratificationFactor = params.isStratified ? 0.6 : 1.0;

  // Generate curve
  for (let n = 10; n <= 250; n += 10) {
    // Effective N calculation
    // Trial: N is boosted by (1/varianceMultiplier) and timepointGain
    // Observational: N is penalized by varianceMultiplier (confounders)
    const effectiveN = (n / varianceMultiplier) * timepointGain * stratificationFactor;
    const power = calculateTTestPower(effectiveN, netEffectSize, alphaAdj);
    results.push({ n, power });
  }

  return results;
};

/**
 * Simplified Power Calculation for a two-sample t-test
 */
function calculateTTestPower(n: number, d: number, alpha: number): number {
  if (alpha <= 0) return 0;
  if (alpha >= 1) return 1;

  const zAlpha = Math.abs(normInv(alpha / 2));
  const delta = d * Math.sqrt(n / 2);
  const power = 1 - normDist(zAlpha - delta);
  
  return Math.min(0.999, Math.max(0.001, power));
}

// Helper: Normal Inverse CDF (approximation)
function normInv(p: number): number {
  const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
  const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
  const b1 = -54.4760987948391, b2 = 161.585836858041, b3 = -155.698979859887;
  const b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029E-03;
  const c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
  const c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146E-03;
  const d2 = 0.32246712907004, d3 = 2.44513413714299, d4 = 3.75440866190742;
  const p_low = 0.02425, p_high = 1 - p_low;
  let q, r;

  if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= p_high) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
}

// Helper: Normal CDF
function normDist(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export const getExpertRecommendation = (params: PowerCalculationParams, currentPower: number): string => {
  const platform = OMICS_PLATFORMS.find(p => p.id === params.platformId);
  if (!platform) return "";

  let rec = "";
  const isTrial = params.design === StudyDesign.TRIAL;
  
  // 1. Design Context
  if (isTrial) {
    rec += "Interventional Trial Mode: Using Baseline-Adjustment (ANCOVA) logic. ";
    if (params.backgroundNoise > 0.3) {
      rec += "High 'Placebo Drift' detected. This background improvement in the control arm is shrinking your net treatment effect. ";
    }
  } else {
    rec += "Observational Discovery Mode: Using Confounder-Adjusted Cross-sectional logic. ";
    if (params.backgroundNoise > 0.3) {
      rec += "High Confounder Burden detected. Variance from Age/BMI/Sex is significantly increasing the required N to achieve discovery. ";
    }
  }

  // 2. Longitudinal Strategy
  if (params.numTimepoints > 1) {
    if (isTrial) {
      rec += `Longitudinal Trial Bonus: By sampling ${params.numTimepoints} timepoints, you are leveraging intra-individual correlation to 'cancel out' baseline variance. This is the most efficient design. `;
    } else {
      rec += `Longitudinal Discovery: Sampling ${params.numTimepoints} timepoints provides diminishing returns in observational settings but helps confirm biomarker stability. `;
    }
  } else {
    rec += "Cross-sectional design: This is highly sensitive to inter-individual noise. In omics, this usually requires very large N to overcome the FDR penalty. ";
  }

  // 3. Multiplicity Impact
  const alphaEff = calculateEffectiveAlpha(params);
  const methodLabel = params.multiplicityMethod === MultiplicityMethod.BONFERRONI ? "FWER (Bonferroni)" : "FDR";
  
  rec += `Multiplicity Tax: Using ${methodLabel} adjustment. `;
  if (alphaEff < 0.0001) {
    rec += `Your significance threshold is very strict (p < ${alphaEff.toExponential(2)}). `;
    if (params.featureCorrelation < 0.3) {
      rec += "Low feature correlation is maximizing the testing burden. ";
    } else {
      rec += "High feature count requires a larger cohort to overcome the multiplicity tax. ";
    }
  }

  // 4. Platform & Stratification Nuance
  if (platform.id === 'metabolon-global') {
    rec += "Metabolon Global Insight: Broad coverage provides high discovery potential but carries a significant multiplicity penalty. ";
  } else if (platform.id === 'biocrates-p500') {
    rec += "Biocrates Targeted Insight: Absolute quantification and lower technical variance (CV%) improve effect size reliability. ";
  } else if (platform.id === 'thermo-lcms') {
    rec += "Thermo High-Res Insight: Deep discovery sensitivity is offset by higher technical noise, requiring robust N. ";
  } else if (platform.id === 'nightingale-nmr') {
    rec += "Nightingale NMR Insight: Low technical variance allows for high precision in large-scale metabolic profiling. ";
  }

  if (params.isStratified) {
    rec += "Stratification Penalty: Sub-group analysis is reducing your effective N. Ensure the primary endpoint remains powered for the total cohort. ";
  }

  // 5. Modality Specifics
  if (params.modality === OmicsModality.LIPIDOMICS) {
    rec += "Lipidomics Insight: High feature correlation reduces the effective multiple testing burden compared to independent metabolites. ";
  } else {
    rec += "Metabolomics Insight: High feature independence increases the FDR penalty. ";
  }

  // 6. Final Verdict
  if (currentPower >= 0.8) {
    rec += ` Strategic Verdict: Study is well-powered. ${isTrial ? 'Ready for regulatory-grade evidence.' : 'Robust discovery cohort.'}`;
  } else {
    rec += ` Strategic Verdict: Underpowered. ${isTrial ? 'Consider stricter inclusion to reduce placebo drift.' : 'Increase N to overcome confounder variance.'}`;
  }

  return rec;
};
