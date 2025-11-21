import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
  ReferenceLine
} from 'recharts';
import { Download } from 'lucide-react';
import { Arm, BiomarkerDef, PatientData, Timepoint } from '../types';
import { ARM_COLORS } from '../constants';

interface TimepointComparisonProps {
  data: PatientData[];
  biomarker: BiomarkerDef;
  showPercentChange: boolean;
}

export const TimepointComparison: React.FC<TimepointComparisonProps> = ({ data, biomarker, showPercentChange }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

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
        // Escape CSV values if needed, though these are simple numbers/strings
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
          <h3 className="text-lg font-semibold text-slate-800">Change from Baseline</h3>
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
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'chart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chart View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="h-[400px]">
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
        </div>
      ) : (
        <div className="overflow-x-auto">
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
  );
};