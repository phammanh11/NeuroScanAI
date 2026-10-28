import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TUMOR_LABEL_METADATA } from '@/constants/medicalLabels';
import { formatPercent } from '@/utils/formatters';
import type { ClassProbabilities, TumorLabel } from '@/types/domain';

interface ProbabilityChartProps {
  probabilities: ClassProbabilities | null;
  isDemoFixture?: boolean;
}

const ORDERED_LABELS: TumorLabel[] = ['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'];

const normalizeProbability = (value: number | undefined): number =>
  Number.isFinite(value) ? Math.min(Math.max(value as number, 0), 1) : 0;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      name: string;
      vietnameseName: string;
      probability: number;
      color: string;
    };
  }>;
}

const CustomProbabilityTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-xl text-xs space-y-1">
      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: item.color }}
        />
        <span>{item.name}</span>
      </div>
      <div className="text-slate-600 dark:text-slate-300">
        {item.vietnameseName}
      </div>
      <div className="pt-0.5 font-mono font-semibold text-teal-700 dark:text-teal-300">
        Tỷ trọng Softmax: {item.probability}% (Minh họa)
      </div>
    </div>
  );
};

export const ProbabilityChart: React.FC<ProbabilityChartProps> = ({
  probabilities,
  isDemoFixture = true,
}) => {
  if (!probabilities) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500 dark:text-slate-400">
        Backend chưa trả về phân bố xác suất chi tiết của 4 lớp cho phiên này.
      </div>
    );
  }

  const chartData = ORDERED_LABELS.map((label) => ({
    name: label,
    vietnameseName: TUMOR_LABEL_METADATA[label].vietnameseTitle,
    probability: Number((normalizeProbability(probabilities[label]) * 100).toFixed(1)),
    rawScore: normalizeProbability(probabilities[label]),
    color: TUMOR_LABEL_METADATA[label].chartColor,
  }));
  const totalProbability = chartData.reduce((sum, item) => sum + item.rawScore, 0);
  const hasValidTotal = Math.abs(totalProbability - 1) <= 0.01;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Phân bố xác suất 4 lớp (Softmax Distribution)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {hasValidTotal
              ? 'Tổng xác suất 4 lớp bằng 100% trong không gian phân loại khép kín của mô hình.'
              : `Dữ liệu nhận được có tổng ${(totalProbability * 100).toFixed(1)}%; cần kiểm tra lại response.`}
          </p>
        </div>
        {isDemoFixture && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Dữ liệu DEMO
          </span>
        )}
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        {chartData.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {item.name}{' '}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  — {item.vietnameseName}
                </span>
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatPercent(item.rawScore)}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(item.probability, 2)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recharts BarChart visualization */}
      <div className="h-52 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
              content={<CustomProbabilityTooltip />}
            />
            <Bar dataKey="probability" radius={[0, 6, 6, 0]} barSize={20}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
