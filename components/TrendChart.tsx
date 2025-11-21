import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar
} from 'recharts';
import { Arm, BiomarkerDef, PatientData, Timepoint } from '../types';
import { ARM_COLORS, TIMEPOINT_ORDER } from '../constants';

interface TrendChartProps {
  data: PatientData[];
  biomarker: BiomarkerDef;
  showPercentChange: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, biomarker, showPercentChange }) => {
  
  // Calculate Mean and SEM for each Arm at each Timepoint
  const chartData = useMemo(() => {
    const result: any[] = [];

    TIMEPOINT_ORDER.forEach(tp => {
      const pointData: any = { name: tp };
      
      Object.values(Arm).forEach(arm => {
        // Filter measurements for this arm, timepoint, and biomarker
        const values: number[] = [];
        
        data.forEach(p => {
          if (p.arm === arm) {
            const m = p.measurements.find(m => m.biomarkerId === biomarker.id && m.timepoint === tp);
            if (m) {
              if (showPercentChange) {
                values.push(m.percentChange || 0);
              } else {
                values.push(m.value);
              }
            }
          }
        });

        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
          const sd = Math.sqrt(variance);
          const sem = sd / Math.sqrt(values.length);

          pointData[arm] = mean;
          pointData[`${arm}_error`] = sem;
        }
      });

      result.push(pointData);
    });

    return result;
  }, [data, biomarker.id, showPercentChange]);

  const yAxisLabel = showPercentChange ? '% Change from Baseline' : `${biomarker.name} (${biomarker.unit})`;

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        {biomarker.name} - {showPercentChange ? 'Mean Percent Change' : 'Mean Absolute Value'} (±SEM)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
          <YAxis stroke="#64748b" fontSize={12} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10, style: {textAnchor: 'middle'} }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            formatter={(value: number) => [value.toFixed(2), '']}
          />
          <Legend verticalAlign="top" height={36} />
          
          {Object.values(Arm).map(arm => (
            <Line
              key={arm}
              type="monotone"
              dataKey={arm}
              stroke={ARM_COLORS[arm]}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            >
              <ErrorBar dataKey={`${arm}_error`} width={4} strokeWidth={2} stroke={ARM_COLORS[arm]} direction="y" />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};