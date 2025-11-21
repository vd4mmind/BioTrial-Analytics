
import React, { useMemo } from 'react';
import { Arm, BiomarkerDef, PatientData, Timepoint } from '../types';

interface BiomarkerOverviewProps {
  data: PatientData[];
  biomarkers: BiomarkerDef[];
}

export const BiomarkerOverview: React.FC<BiomarkerOverviewProps> = ({ data, biomarkers }) => {

  // Calculate mean % change at Week 24 for each biomarker/arm
  const summary = useMemo(() => {
    const res: Record<string, Record<Arm, number>> = {};
    
    biomarkers.forEach(bio => {
      res[bio.id] = { [Arm.PLACEBO]: 0, [Arm.DRUG_1MG]: 0, [Arm.DRUG_2MG]: 0 };
      
      Object.values(Arm).forEach(arm => {
        const values: number[] = [];
        data.forEach(p => {
          if (p.arm === arm) {
            const m = p.measurements.find(meas => meas.biomarkerId === bio.id && meas.timepoint === Timepoint.WEEK_24);
            if (m && m.percentChange !== undefined) values.push(m.percentChange);
          }
        });
        
        if (values.length) {
          res[bio.id][arm] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      });
    });
    return res;
  }, [data, biomarkers]);

  const getColor = (val: number, direction: string) => {
    // If lower is better: negative values are good (Green), positive are bad (Red)
    // If higher is better: positive values are good (Green), negative are bad (Red)
    
    const isGood = direction === 'lower_is_better' ? val < 0 : val > 0;
    const intensity = Math.min(Math.abs(val) / 30, 1); // Cap intensity at 30% change
    
    // Simple opacity logic
    if (isGood) return `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`; // Green-500
    return `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`; // Red-500
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Week 24: Efficacy Heatmap (Mean % Change)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 px-4 text-slate-500 font-medium">Biomarker</th>
              <th className="py-3 px-4 text-slate-500 font-medium text-center">Category</th>
              {Object.values(Arm).map(arm => (
                <th key={arm} className="py-3 px-4 font-medium text-center text-slate-700">{arm}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {biomarkers.map(bio => (
              <tr key={bio.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-slate-700">{bio.name}</td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    {bio.category}
                  </span>
                </td>
                {Object.values(Arm).map(arm => {
                  const val = summary[bio.id]?.[arm] || 0;
                  return (
                    <td key={arm} className="py-2 px-2">
                      <div 
                        className="py-2 px-3 rounded-md text-center font-medium text-slate-900 shadow-sm"
                        style={{ backgroundColor: getColor(val, bio.direction) }}
                      >
                        {val > 0 ? '+' : ''}{val.toFixed(1)}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-slate-400 flex gap-4 justify-end">
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-200 rounded"></div> Improvement</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 rounded"></div> Worsening</span>
      </div>
    </div>
  );
};
