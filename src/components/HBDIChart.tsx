import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface HBDIChartProps {
  scores: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

const HBDIChart: React.FC<HBDIChartProps> = ({ scores }) => {
  const data = [
    { subject: 'A: تحليلي/موضوعي', A: scores.A, fullMark: 100 },
    { subject: 'D: إبداعي/استراتيجي', A: scores.D, fullMark: 100 },
    { subject: 'C: مشاعري/تواصلي', A: scores.C, fullMark: 100 },
    { subject: 'B: تنفيذي/إجرائي', A: scores.B, fullMark: 100 },
  ];

  return (
    <div className="w-full h-full flex justify-center items-center p-4">
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#cbd5e0" strokeDasharray="3 3" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#4a5568', fontSize: 12, fontWeight: 700 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="HBDI"
            dataKey="A"
            stroke="#3182ce"
            fill="#3182ce"
            fillOpacity={0.2}
            strokeWidth={4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HBDIChart;
