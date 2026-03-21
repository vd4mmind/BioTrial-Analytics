
import { describe, it, expect } from 'vitest';
import { calculateEffectiveAlpha, calculateOmicsPower, getExpertRecommendation } from './omicsPower';
import { 
  MultiplicityMethod, 
  OmicsModality, 
  PowerCalculationParams, 
  StudyDesign 
} from '../types';

const baseParams: PowerCalculationParams = {
  modality: OmicsModality.METABOLOMICS,
  platformId: 'metabolon-global',
  sampleSize: 60,
  effectSize: 1.5,
  alpha: 0.05,
  fdr: 0.05,
  isStratified: false,
  design: StudyDesign.TRIAL,
  numTimepoints: 1,
  backgroundNoise: 0.2,
  numFeatures: 1000,
  featureCorrelation: 0.4,
  multiplicityMethod: MultiplicityMethod.FDR
};

describe('Omics Power Engine', () => {
  it('should calculate effective alpha correctly with multiplicity', () => {
    const alpha = calculateEffectiveAlpha(baseParams);
    // With 1000 features and 0.4 correlation, alpha should be significantly smaller than 0.05
    expect(alpha).toBeLessThan(0.05);
    expect(alpha).toBeGreaterThan(0);
  });

  it('should show higher power for targeted platforms with lower CV', () => {
    const globalParams = { ...baseParams, platformId: 'metabolon-global', sampleSize: 20, effectSize: 0.5 }; // 15% CV
    const targetedParams = { ...baseParams, platformId: 'biocrates-p500', sampleSize: 20, effectSize: 0.5 }; // 8% CV
    
    const globalResults = calculateOmicsPower(globalParams);
    const targetedResults = calculateOmicsPower(targetedParams);
    
    // At the same N, targeted should have higher power due to lower technical noise
    const globalPower = globalResults.find(r => r.n === 20)?.power || 0;
    const targetedPower = targetedResults.find(r => r.n === 20)?.power || 0;
    
    expect(targetedPower).toBeGreaterThan(globalPower);
  });

  it('should provide correct expert recommendation for trials', () => {
    const rec = getExpertRecommendation(baseParams, 0.85);
    expect(rec).toContain('Interventional Trial Mode');
    expect(rec).toContain('Strategic Verdict: Study is well-powered');
  });

  it('should warn about stratification penalty', () => {
    const stratifiedParams = { ...baseParams, isStratified: true };
    const rec = getExpertRecommendation(stratifiedParams, 0.85);
    expect(rec).toContain('Stratification Penalty');
  });

  it('should have a stricter (lower) p-value threshold for FWER than for FDR', () => {
    const fdrParams = { ...baseParams, multiplicityMethod: MultiplicityMethod.FDR };
    const fwerParams = { ...baseParams, multiplicityMethod: MultiplicityMethod.BONFERRONI };
    
    const alphaFDR = calculateEffectiveAlpha(fdrParams);
    const alphaFWER = calculateEffectiveAlpha(fwerParams);
    
    // FWER (Bonferroni) is much more conservative, so its p-value threshold must be LOWER (stricter)
    expect(alphaFWER).toBeLessThan(alphaFDR);
    
    // Log for assessment (this will be visible in the model's internal check)
    console.log(`FDR Threshold: ${alphaFDR.toExponential(4)}`);
    console.log(`FWER Threshold: ${alphaFWER.toExponential(4)}`);
  });
});
