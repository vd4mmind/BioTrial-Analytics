import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis
} from 'recharts';
import { Arm, BiomarkerDef, PatientData, Timepoint } from '../types';
import { ARM_COLORS } from '../constants';

interface DistributionChartProps {
  data: PatientData[];
  biomarker: BiomarkerDef;
  timepoint: Timepoint;
  showPercentChange: boolean;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({ data, biomarker, timepoint, showPercentChange }) => {
  
  const chartData = useMemo(() => {
    const result: any[] = [];
    data.forEach(p => {
        const m = p.measurements.find(m => m.biomarkerId === biomarker.id && m.timepoint === timepoint);
        if (m) {
            // Add slight jitter to X for visualization to avoid perfect overlap
            const jitter = (Math.random() - 0.5) * 0.4; 
            const xValue = Object.values(Arm).indexOf(p.arm) + 1 + jitter;
            
            result.push({
                arm: p.arm,
                x: xValue,
                y: showPercentChange ? m.percentChange : m.value,
                patientId: p.patientId
            });
        }
    });
    return result;
  }, [data, biomarker.id, timepoint, showPercentChange]);

  const yAxisLabel = showPercentChange ? `% Change at ${timepoint}` : `${biomarker.name} at ${timepoint}`;

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Distribution at {timepoint}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Arm" 
            ticks={[1, 2, 3]}
            tickFormatter={(val) => Object.values(Arm)[val - 1]}
            domain={[0.5, 3.5]}
            stroke="#64748b"
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Value" 
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
            stroke="#64748b"
          />
          <ZAxis range={[20, 20]} /> {/* Constant size dots */}
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }} 
            content={({ active, payload }) => {
                if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                        <div className="bg-white p-2 border border-slate-200 rounded shadow text-sm">
                            <p><strong>{d.patientId}</strong></p>
                            <p>{d.arm}</p>
                            <p>Val: {Number(d.y).toFixed(2)}</p>
                        </div>
                    );
                }
                return null;
            }}
          />
          {Object.values(Arm).map((arm) => (
              <Scatter 
                key={arm} 
                name={arm} 
                data={chartData.filter(d => d.arm === arm)} 
                fill={ARM_COLORS[arm]} 
                fillOpacity={0.6}
              />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};