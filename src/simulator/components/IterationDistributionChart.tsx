import React from 'react';
import type { IterationResult } from '../types';
import { colors, fonts, spacing } from '../../shared/design-tokens';

interface Props {
  iterationResults: IterationResult[];
}

const SVG_WIDTH = 480;
const SVG_HEIGHT = 120;
const MARGIN = { top: 10, right: 20, bottom: 28, left: 54 };
const PLOT_W = SVG_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;
const ROW_HEIGHT = PLOT_H / 2;
const DOT_R = 3;

export const IterationDistributionChart: React.FC<Props> = ({ iterationResults }) => {
  const allValues = iterationResults.flatMap((r) => [r.smartUtil, r.naiveUtil]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const pad = (maxVal - minVal) * 0.08 || 0.01;
  const domainMin = Math.max(0, minVal - pad);
  const domainMax = Math.min(1, maxVal + pad);
  const range = domainMax - domainMin || 0.01;

  const x = (v: number) => MARGIN.left + ((v - domainMin) / range) * PLOT_W;

  const smartMean = iterationResults.reduce((s, r) => s + r.smartUtil, 0) / iterationResults.length;
  const naiveMean = iterationResults.reduce((s, r) => s + r.naiveUtil, 0) / iterationResults.length;

  const smartY = MARGIN.top + ROW_HEIGHT * 0.5;
  const naiveY = MARGIN.top + ROW_HEIGHT + ROW_HEIGHT * 0.5;

  // Jitter dots vertically to avoid overlap
  const jitter = (index: number, count: number) => {
    const spread = ROW_HEIGHT * 0.35;
    return ((index % 7) - 3) * (spread / 3.5);
  };

  // Tick marks
  const tickCount = 5;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(domainMin + (range * i) / tickCount);
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Row labels */}
      <text x={MARGIN.left - 8} y={smartY} textAnchor="end" dominantBaseline="central"
        style={{ fontSize: '11px', fill: colors.primary, fontFamily: fonts.family }}>
        Smart
      </text>
      <text x={MARGIN.left - 8} y={naiveY} textAnchor="end" dominantBaseline="central"
        style={{ fontSize: '11px', fill: colors.textMuted, fontFamily: fonts.family }}>
        Naive
      </text>

      {/* Horizontal separator */}
      <line x1={MARGIN.left} x2={MARGIN.left + PLOT_W}
        y1={MARGIN.top + ROW_HEIGHT} y2={MARGIN.top + ROW_HEIGHT}
        stroke={colors.borderLight} strokeWidth={1} />

      {/* Smart mean line */}
      <line x1={x(smartMean)} x2={x(smartMean)}
        y1={MARGIN.top} y2={MARGIN.top + ROW_HEIGHT}
        stroke={colors.primary} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />

      {/* Naive mean line */}
      <line x1={x(naiveMean)} x2={x(naiveMean)}
        y1={MARGIN.top + ROW_HEIGHT} y2={MARGIN.top + PLOT_H}
        stroke={colors.textMuted} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />

      {/* Smart dots */}
      {iterationResults.map((r, i) => (
        <circle key={`s-${i}`} cx={x(r.smartUtil)} cy={smartY + jitter(i, iterationResults.length)}
          r={DOT_R} fill={colors.primary} opacity={0.65} />
      ))}

      {/* Naive dots */}
      {iterationResults.map((r, i) => (
        <circle key={`n-${i}`} cx={x(r.naiveUtil)} cy={naiveY + jitter(i, iterationResults.length)}
          r={DOT_R} fill={colors.textMuted} opacity={0.65} />
      ))}

      {/* X-axis ticks */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={x(t)} x2={x(t)} y1={MARGIN.top + PLOT_H} y2={MARGIN.top + PLOT_H + 4}
            stroke={colors.border} strokeWidth={1} />
          <text x={x(t)} y={MARGIN.top + PLOT_H + 16} textAnchor="middle"
            style={{ fontSize: '10px', fill: colors.textMuted, fontFamily: fonts.family }}>
            {(t * 100).toFixed(1)}%
          </text>
        </g>
      ))}

      {/* X-axis line */}
      <line x1={MARGIN.left} x2={MARGIN.left + PLOT_W}
        y1={MARGIN.top + PLOT_H} y2={MARGIN.top + PLOT_H}
        stroke={colors.border} strokeWidth={1} />
    </svg>
  );
};
