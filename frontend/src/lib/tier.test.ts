import { describe, it, expect } from 'vitest';
import { tierColor, tierIcon, tierLabel } from './tier';

describe('tier utilities', () => {
  describe('tierColor', () => {
    it('returns the correct color class for known tiers', () => {
      expect(tierColor('bronze')).toBe('text-[#cd7f32]');
      expect(tierColor('silver')).toBe('text-slate-400');
      expect(tierColor('gold')).toBe('text-yellow-400');
      expect(tierColor('platinum')).toBe('text-sky-300');
      expect(tierColor('diamond')).toBe('text-purple-400');
    });

    it('returns default color for unknown or missing tiers', () => {
      expect(tierColor('unknown')).toBe('text-slate-500');
      expect(tierColor(undefined)).toBe('text-slate-500');
      expect(tierColor('')).toBe('text-slate-500');
    });
  });

  describe('tierIcon', () => {
    it('returns the correct icon for known tiers', () => {
      expect(tierIcon('bronze')).toBe('🥉');
      expect(tierIcon('silver')).toBe('🥈');
      expect(tierIcon('gold')).toBe('🥇');
      expect(tierIcon('platinum')).toBe('💎');
      expect(tierIcon('diamond')).toBe('👑');
    });

    it('returns default icon for unknown or missing tiers', () => {
      expect(tierIcon('unknown')).toBe('🎖️');
      expect(tierIcon(undefined)).toBe('🎖️');
      expect(tierIcon('')).toBe('🎖️');
    });
  });

  describe('tierLabel', () => {
    it('capitalizes known tiers', () => {
      expect(tierLabel('bronze')).toBe('Bronze');
      expect(tierLabel('silver')).toBe('Silver');
    });

    it('returns Unranked for missing tiers', () => {
      expect(tierLabel(undefined)).toBe('Unranked');
      expect(tierLabel('')).toBe('Unranked');
    });
  });
});
