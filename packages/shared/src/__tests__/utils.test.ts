import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  calculateMargin,
  calculateMarginPercentage,
  formatCurrency,
  clamp,
  generateOrderNumber,
} from '../utils';

describe('generateSlug', () => {
  it('converts text to slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });
  it('handles special characters', () => {
    expect(generateSlug('¡Hola!')).toBe('hola');
  });
  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('calculateMargin', () => {
  it('calculates margin correctly', () => {
    expect(calculateMargin(100, 80)).toBeCloseTo(0.2);
  });
  it('handles zero price', () => {
    expect(calculateMargin(0, 80)).toBe(0);
  });
});

describe('calculateMarginPercentage', () => {
  it('returns percentage value', () => {
    expect(calculateMarginPercentage(100, 80)).toBeCloseTo(20);
  });
});

describe('formatCurrency', () => {
  it('formats MXN by default', () => {
    const result = formatCurrency(100);
    expect(result).toContain('100');
  });
  it('formats with specified currency', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100');
  });
});

describe('clamp', () => {
  it('clamps below min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });
  it('clamps above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
  it('keeps value in range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

describe('generateOrderNumber', () => {
  it('starts with PH-', () => {
    expect(generateOrderNumber()).toMatch(/^PH-/);
  });
  it('has correct format', () => {
    expect(generateOrderNumber()).toMatch(/^PH-\d{8}-\d{6}$/);
  });
  it('generates unique numbers', () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
  });
});
