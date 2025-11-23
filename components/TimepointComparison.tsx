import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
  ReferenceLine
} from 'recharts';
import { Download, Sigma, TrendingUp, BarChart as BarChartIcon, Table as TableIcon, Info } from 'lucide-react';
import { Arm, BiomarkerDef, PatientData, Timepoint } from '../types';
import { ARM_COLORS } from '../constants';

interface TimepointComparisonProps {
  data: PatientData[];
  biomarker: BiomarkerDef;
  showPercentChange: boolean;
}

export const TimepointComparison: React.FC<TimepointComparisonProps> = ({ data, biomarker, showPercentChange }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'auc' | 'table'>('chart');

  const processedData = useMemo(() => {
    const timepoints = [Timepoint.WEEK_4, Timepoint.WEEK_12, Timepoint.WEEK_24];
    
    return timepoints.map(tp => {
      const entry: any = { timepoint: tp };
      
      Object.values(Arm).forEach(arm => {
        const values = data
          .filter(p => p.arm === arm)
          .map(p => {
             const m = p.measurements.find(m => m.biomarkerId === biomarker.id && m.timepoint === tp);
             return m ? (showPercentChange ? m.percentChange : m.changeFromBaseline) : undefined;
          })
          .filter((v): v is number => v !== undefined);

        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
          const sem = Math.sqrt(variance) / Math.sqrt(values.length);

          entry[arm] = mean;
          entry[`${arm}_error`] = sem;
          entry[`${arm}_n`] = values.length;
        } else {
          entry[arm] = 0;
          entry[`${arm}_error`] = 0;
          entry[`${arm}_n`] = 0;
        }
      });
      
      return entry;
    });
  }, [data, biomarker.id, showPercentChange]);

  // Helper to extract numeric week from Timepoint
  const getWeek = (tp: Timepoint | string): number => {
    if (tp === Timepoint.BASELINE) return 0;
    if (tp === Timepoint.WEEK_4) return 4;
    if (tp === Timepoint.WEEK_12) return 12;
    if (tp === Timepoint.WEEK_24) return 24;
    return 0;
  };

  const aucData = useMemo(() => {
    const result: Record<Arm, number> = {
      [Arm.PLACEBO]: 0,
      [Arm.DRUG_1MG]: 0,
      [Arm.DRUG_2MG]: 0
    };

    Object.values(Arm).forEach(arm => {
      // Points: (0,0) -> (4, val4) -> (12, val12) -> (24, val24)
      const p0 = 0; // Baseline change is assumed 0
      
      // Extract means from processedData
      const getVal = (tp: Timepoint) => {
        const row = processedData.find(d => d.timepoint === tp);
        return row ? (row[arm] || 0) : 0;
      };

      const p4 = getVal(Timepoint.WEEK_4);
      const p12 = getVal(Timepoint.WEEK_12);
      const p24 = getVal(Timepoint.WEEK_24);

      // Trapezoidal Rule
      let area = 0;
      // 0 to 4
      area += (getWeek(Timepoint.WEEK_4) - 0) * (p0 + p4) / 2;
      // 4 to 12
      area += (getWeek(Timepoint.WEEK_12) - getWeek(Timepoint.WEEK_4)) * (p4 + p12) / 2;
      // 12 to 24
      area += (getWeek(Timepoint.WEEK_24) - getWeek(Timepoint.WEEK_12)) * (p12 + p24) / 2;

      result[arm] = area;
    });

    return result;
  }, [processedData]);

  // Prepare data specifically for Area Chart (needs numeric X axis for correct area representation)
  const aucPlotData = useMemo(() => {
    const weeks = [0, 4, 12, 24];
    return weeks.map(week => {
      const entry: any = { week };
      
      Object.values(Arm).forEach(arm => {
        if (week === 0) {
          entry[arm] = 0;
        } else {
          // Find the value from processedData
          let tp: Timepoint;
          if (week === 4) tp = Timepoint.WEEK_4;
          else if (week === 12) tp = Timepoint.WEEK_12;
          else tp = Timepoint.WEEK_24;

          const row = processedData.find(d => d.timepoint === tp);
          entry[arm] = row ? row[arm] : 0;
        }
      });
      return entry;
    });
  }, [processedData]);

  const handleExportCSV = () => {
    const headers = ['Timepoint', 'Arm', 'N', `Mean Change ${showPercentChange ? '(%)' : `(${biomarker.unit})`}`, 'SEM'];
    const csvRows = [headers.join(',')];

    processedData.forEach(row => {
      Object.values(Arm).forEach(arm => {
        const line = [
          row.timepoint,
          arm,
          row[`${arm}_n`],
          row[arm]?.toFixed(4) || '0',
          row[`${arm}_error`]?.toFixed(4) || '0'
        ];
        csvRows.push(line.join(','));
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${biomarker.name}_change_analysis.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const yAxisLabel = showPercentChange 
    ? 'Mean % Change from Baseline' 
    : `Mean Change (${biomarker.unit})`;

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Change from Baseline Analysis</h3>
          <p className="text-sm text-slate-500">
            Comparison of {showPercentChange ? 'percentage' : 'absolute'} change by timepoint.
            {biomarker.direction === 'lower_is_better' ? ' (Lower is better)' : ' (Higher is better)'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm whitespace-nowrap"
            title="Export data to CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'chart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bar Chart View"
            >
              <BarChartIcon size={14} />
              Bar
            </button>
            <button
              onClick={() => setViewMode('auc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'auc' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="AUC Plot View"
            >
              <TrendingUp size={14} />
              AUC
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={14} />
              Table
            </button>
          </div>
        </div>
      </div>

      <div className="h-[400px]">
        {viewMode === 'chart' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="timepoint" stroke="#64748b" fontSize={12} tickMargin={10} />
              <YAxis stroke="#64748b" fontSize={12} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string, props: any) => {
                    const error = props.payload[`${name}_error`];
                    return [
                        `${value.toFixed(2)}${showPercentChange ? '%' : ''} (±${error.toFixed(2)})`, 
                        name
                    ];
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              {Object.values(Arm).map(arm => (
                <Bar key={arm} dataKey={arm} name={arm} fill={ARM_COLORS[arm]} radius={[4, 4, 0, 0]}>
                    <ErrorBar dataKey={`${arm}_error`} width={4} strokeWidth={2} stroke="rgba(0,0,0,0.5)" />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'auc' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={aucPlotData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="week" 
                type="number" 
                domain={[0, 24]} 
                tickCount={7} 
                stroke="#64748b" 
                fontSize={12} 
                label={{ value: 'Weeks', position: 'insideBottomRight', offset: -5 }} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value.toFixed(2)}${showPercentChange ? '%' : ''}`, 'Mean Change']}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              {Object.values(Arm).map(arm => (
                <Area 
                  key={arm} 
                  type="linear" 
                  dataKey={arm} 
                  name={arm}
                  stroke={ARM_COLORS[arm]} 
                  fill={ARM_COLORS[arm]} 
                  fillOpacity={0.1} 
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'table' && (
          <div className="overflow-x-auto h-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold text-slate-700">Timepoint</th>
                  <th className="py-3 px-4 font-semibold text-slate-700">Arm</th>
                  <th className="py-3 px-4 font-semibold text-slate-700 text-right">N</th>
                  <th className="py-3 px-4 font-semibold text-slate-700 text-right">
                    Mean Change {showPercentChange ? '(%)' : `(${biomarker.unit})`}
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-700 text-right">SEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((row) => (
                  <React.Fragment key={row.timepoint}>
                    {Object.values(Arm).map((arm, idx) => (
                      <tr key={`${row.timepoint}-${arm}`} className="hover:bg-slate-50/50">
                        {idx === 0 && (
                          <td className="py-3 px-4 font-medium text-slate-900 align-top border-r border-slate-100 bg-white" rowSpan={3}>
                            {row.timepoint}
                          </td>
                        )}
                        <td className="py-3 px-4 text-slate-600 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ARM_COLORS[arm] }}></span>
                          {arm}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-right font-mono">{row[`${arm}_n`]}</td>
                        <td className={`py-3 px-4 text-right font-mono font-medium`}>
                          {row[arm] > 0 ? '+' : ''}{row[arm].toFixed(2)}{showPercentChange ? '%' : ''}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-right font-mono">
                          ±{row[`${arm}_error`].toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AUC Section */}
      <div className="mt-8 pt-6 border-t border-slate-100">
         <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
              <Sigma size={16} />
            </div>
            Area Under the Curve (AUC: 0-24 Weeks)
         </h4>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(Arm).map(arm => (
                <div key={arm} className="bg-slate-50 rounded-lg p-4 border border-slate-200 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sigma size={48} color={ARM_COLORS[arm]} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: ARM_COLORS[arm] }}></span>
                        <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">{arm}</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-800 tracking-tight">
                        {aucData[arm].toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                      {showPercentChange ? 'Percent' : biomarker.unit} · Weeks
                    </div>
                </div>
            ))}
         </div>
         
         <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex gap-2 items-start">
            <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-800 leading-relaxed">
              <strong>Calculation Methodology:</strong> AUC is computed using the trapezoidal rule applied to group means at discrete timepoints (Baseline to Week 24). This cumulative metric aggregates the total magnitude of change over the study duration, where a larger area indicates a sustained effect.
            </p>
         </div>
      </div>
    </div>
  );
};