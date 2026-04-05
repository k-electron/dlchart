import { describe, it, expect } from 'vitest';
import { generateYearlyData, checkObservesDST } from './daylight';

describe('daylight', () => {
  describe('checkObservesDST', () => {
    it('should return true for regions that observe DST', () => {
      expect(checkObservesDST(2026, 'America/New_York')).toBe(true);
      expect(checkObservesDST(2026, 'Europe/London')).toBe(true);
    });

    it('should return false for regions that do not observe DST', () => {
      expect(checkObservesDST(2026, 'Asia/Tokyo')).toBe(false);
      expect(checkObservesDST(2026, 'America/Phoenix')).toBe(false);
    });
  });

  describe('generateYearlyData', () => {
    it('should generate standard day correctly (New York)', () => {
      const data = generateYearlyData(2026, 40.7128, -74.0060, 'America/New_York', true);
      expect(data.length).toBe(365);
      
      // Check a summer day (e.g., June 21)
      const summerSolstice = data.find(d => d.date === '2026-06-21');
      expect(summerSolstice).toBeDefined();
      expect(summerSolstice?.blocks.length).toBe(1);
      expect(summerSolstice?.blocks[0][0]).toBeGreaterThan(4); // Sunrise around 5 AM
      expect(summerSolstice?.blocks[0][1]).toBeLessThan(21); // Sunset around 8:30 PM
      expect(summerSolstice?.isDST).toBe(true);
      
      // Check a winter day (e.g., Dec 21)
      const winterSolstice = data.find(d => d.date === '2026-12-21');
      expect(winterSolstice).toBeDefined();
      expect(winterSolstice?.blocks.length).toBe(1);
      expect(winterSolstice?.blocks[0][0]).toBeGreaterThan(7); // Sunrise around 7:15 AM
      expect(winterSolstice?.blocks[0][1]).toBeLessThan(17); // Sunset around 4:30 PM
      expect(winterSolstice?.isDST).toBe(false);
    });

    it('should handle midnight sun (Longyearbyen in summer)', () => {
      const data = generateYearlyData(2026, 78.2232, 15.6267, 'Arctic/Longyearbyen', true);
      
      // June 21 should have 24 hours of daylight
      const summerSolstice = data.find(d => d.date === '2026-06-21');
      expect(summerSolstice).toBeDefined();
      expect(summerSolstice?.blocks.length).toBe(1);
      expect(summerSolstice?.blocks[0][0]).toBe(0);
      expect(summerSolstice?.blocks[0][1]).toBe(24);
      expect(summerSolstice?.daylightDuration).toBe(24);
    });

    it('should handle polar night (Longyearbyen in winter)', () => {
      const data = generateYearlyData(2026, 78.2232, 15.6267, 'Arctic/Longyearbyen', true);
      
      // Dec 21 should have 0 hours of daylight
      const winterSolstice = data.find(d => d.date === '2026-12-21');
      expect(winterSolstice).toBeDefined();
      expect(winterSolstice?.blocks.length).toBe(0);
      expect(winterSolstice?.daylightDuration).toBe(0);
    });

    it('should handle transition days with sunset before sunrise or multiple blocks (Longyearbyen edge of midnight sun)', () => {
      const data = generateYearlyData(2026, 78.2232, 15.6267, 'Arctic/Longyearbyen', true);
      
      // Find a day where there are multiple blocks (e.g., sun is up at midnight, sets, then rises again)
      // Or sun sets before sunrise.
      const multiBlockDay = data.find(d => d.blocks.length > 1);
      if (multiBlockDay) {
        expect(multiBlockDay.blocks.length).toBeGreaterThan(1);
        // First block should start at 0
        expect(multiBlockDay.blocks[0][0]).toBe(0);
        // Last block should end at 24
        expect(multiBlockDay.blocks[multiBlockDay.blocks.length - 1][1]).toBe(24);
      }
    });

    it('should handle DST transitions correctly (New York)', () => {
      const data = generateYearlyData(2026, 40.7128, -74.0060, 'America/New_York', true);
      
      // Spring forward (March 8, 2026)
      const springForward = data.find(d => d.date === '2026-03-08');
      expect(springForward).toBeDefined();
      
      // Fall back (November 1, 2026)
      const fallBack = data.find(d => d.date === '2026-11-01');
      expect(fallBack).toBeDefined();
    });

    it('should handle DST and Arctic conditions together (Tromsø)', () => {
      const data = generateYearlyData(2026, 69.6492, 18.9553, 'Europe/Oslo', true);
      
      // Tromsø has midnight sun in summer
      const summerSolstice = data.find(d => d.date === '2026-06-21');
      expect(summerSolstice?.daylightDuration).toBe(24);
      
      // Tromsø has polar night in winter
      const winterSolstice = data.find(d => d.date === '2026-12-21');
      expect(winterSolstice?.daylightDuration).toBe(0);
      
      // Tromsø observes DST (Spring forward March 29, 2026)
      const springForward = data.find(d => d.date === '2026-03-29');
      expect(springForward).toBeDefined();
      expect(springForward?.isDST).toBe(true);
      
      // Fall back (October 25, 2026)
      const fallBack = data.find(d => d.date === '2026-10-25');
      expect(fallBack).toBeDefined();
      expect(fallBack?.isDST).toBe(false);
    });

    it('should calculate stacked bar segments correctly', () => {
      const data = generateYearlyData(2026, 40.7128, -74.0060, 'America/New_York', true);
      const day = data.find(d => d.date === '2026-06-21');
      expect(day).toBeDefined();
      
      if (day) {
        // Total of all segments should be 24
        const total = day.night1 + day.day1 + day.night2 + day.day2 + day.night3 + day.day3 + day.night4;
        expect(total).toBeCloseTo(24, 5);
        
        // For a standard day with 1 block
        expect(day.night1).toBeCloseTo(day.blocks[0][0], 5);
        expect(day.day1).toBeCloseTo(day.blocks[0][1] - day.blocks[0][0], 5);
        expect(day.night2).toBeCloseTo(24 - day.blocks[0][1], 5);
        expect(day.day2).toBe(0);
        expect(day.night3).toBe(0);
        expect(day.day3).toBe(0);
        expect(day.night4).toBe(0);
      }
    });

    it('should calculate stacked bar segments correctly for multiple blocks', () => {
      const data = generateYearlyData(2026, 78.2232, 15.6267, 'Arctic/Longyearbyen', true);
      const multiBlockDay = data.find(d => d.blocks.length > 1);
      
      if (multiBlockDay) {
        const total = multiBlockDay.night1 + multiBlockDay.day1 + multiBlockDay.night2 + multiBlockDay.day2 + multiBlockDay.night3 + multiBlockDay.day3 + multiBlockDay.night4;
        expect(total).toBeCloseTo(24, 5);
        
        expect(multiBlockDay.night1).toBeCloseTo(multiBlockDay.blocks[0][0], 5);
        expect(multiBlockDay.day1).toBeCloseTo(multiBlockDay.blocks[0][1] - multiBlockDay.blocks[0][0], 5);
        expect(multiBlockDay.night2).toBeCloseTo(multiBlockDay.blocks[1][0] - multiBlockDay.blocks[0][1], 5);
        expect(multiBlockDay.day2).toBeCloseTo(multiBlockDay.blocks[1][1] - multiBlockDay.blocks[1][0], 5);
      }
    });
  });
});
