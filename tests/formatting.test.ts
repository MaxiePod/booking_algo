import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../src/calculator/utils/formatting';

describe('formatCurrency', () => {
  it('formats dollars without decimals', () => {
    expect(formatCurrency(1234)).toBe('$1,234');
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(1000000)).toBe('$1,000,000');
  });

  it('rounds to nearest dollar', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });
});

describe('formatNumber', () => {
  it('formats with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatPercent', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercent(12.34)).toBe('12.3%');
    expect(formatPercent(100)).toBe('100.0%');
  });

  it('accepts custom decimal places', () => {
    expect(formatPercent(12.3456, 2)).toBe('12.35%');
    expect(formatPercent(5, 0)).toBe('5%');
  });
});
