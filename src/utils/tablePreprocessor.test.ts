/**
 * Unit tests for table preprocessor
 */

import {
  preprocessTableHTML,
  containsTables,
  getTableStats,
} from './tablePreprocessor';

describe('tablePreprocessor', () => {
  describe('containsTables', () => {
    it('should detect tables in HTML', () => {
      const html = '<div><table><tr><td>Test</td></tr></table></div>';
      expect(containsTables(html)).toBe(true);
    });

    it('should return false for HTML without tables', () => {
      const html = '<div><p>Just a paragraph</p></div>';
      expect(containsTables(html)).toBe(false);
    });
  });

  describe('getTableStats', () => {
    it('should count tables correctly', () => {
      const html = `
        <div>
          <table><tr><td>1</td></tr></table>
          <table><tr><td>2</td></tr></table>
        </div>
      `;
      const stats = getTableStats(html);
      expect(stats.tableCount).toBe(2);
    });

    it('should count rows and columns', () => {
      const html = `
        <table>
          <tr><td>A</td><td>B</td><td>C</td></tr>
          <tr><td>1</td><td>2</td><td>3</td></tr>
        </table>
      `;
      const stats = getTableStats(html);
      expect(stats.totalRows).toBe(2);
      expect(stats.totalColumns).toBe(3);
    });

    it('should detect wrapper divs', () => {
      const html = `
        <div class="overflow-x-auto">
          <table><tr><td>Test</td></tr></table>
        </div>
      `;
      const stats = getTableStats(html);
      expect(stats.hasWrapper).toBe(true);
    });
  });

  describe('preprocessTableHTML', () => {
    it('should remove overflow wrapper divs', () => {
      const html = `
        <div class="overflow-x-auto my-4">
          <table class="min-w-full border-collapse border border-gray-300">
            <tr><td>Test</td></tr>
          </table>
        </div>
      `;

      const processed = preprocessTableHTML(html);

      // Should not contain wrapper div
      expect(processed).not.toMatch(/<div[^>]*overflow-x-auto/);
      // Should contain table
      expect(processed).toMatch(/<table/);
    });

    it('should add legacy table attributes', () => {
      const html = `
        <table>
          <tr><td>Test</td></tr>
        </table>
      `;

      const processed = preprocessTableHTML(html);

      expect(processed).toMatch(/border="1"/);
      expect(processed).toMatch(/cellpadding="4"/);
      expect(processed).toMatch(/cellspacing="0"/);
    });

    it('should ensure tbody element exists', () => {
      const html = `
        <table>
          <thead><tr><th>Header</th></tr></thead>
          <tr><td>Data</td></tr>
        </table>
      `;

      const processed = preprocessTableHTML(html);

      expect(processed).toMatch(/<tbody>/);
      expect(processed).toMatch(/<\/tbody>/);
    });

    it('should convert Tailwind classes to inline styles', () => {
      const html = `
        <table class="min-w-full border-collapse">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Header</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-4 py-2">Data</td>
            </tr>
          </tbody>
        </table>
      `;

      const processed = preprocessTableHTML(html);

      // Should have inline styles
      expect(processed).toMatch(/style="[^"]*width:\s*100%/);
      expect(processed).toMatch(/style="[^"]*background-color:\s*#f3f4f6/);
      expect(processed).toMatch(/style="[^"]*border:\s*1px solid/);
      expect(processed).toMatch(/style="[^"]*padding-left:\s*16px/);
      expect(processed).toMatch(/style="[^"]*text-align:\s*left/);

      // Should not have Tailwind classes
      expect(processed).not.toMatch(/class="[^"]*min-w-full/);
      expect(processed).not.toMatch(/class="[^"]*bg-gray-100/);
      expect(processed).not.toMatch(/class="[^"]*border-gray-300/);
    });

    it('should add column width hints', () => {
      const html = `
        <table>
          <tr>
            <th>Short</th>
            <th>This is a much longer header</th>
            <th>Med</th>
          </tr>
          <tr>
            <td>A</td>
            <td>B</td>
            <td>C</td>
          </tr>
        </table>
      `;

      const processed = preprocessTableHTML(html);

      // Should have width percentages
      expect(processed).toMatch(/width:\s*\d+%/);
    });

    it('should add Office compatibility markers', () => {
      const html = '<table><tr><td>Test</td></tr></table>';
      const processed = preprocessTableHTML(html);

      expect(processed).toMatch(/<!--StartFragment-->/);
      expect(processed).toMatch(/<!--EndFragment-->/);
    });

    it('should handle complex tables with multiple sections', () => {
      const html = `
        <div class="overflow-x-auto">
          <table class="min-w-full border-collapse border border-gray-300">
            <thead class="bg-gray-100">
              <tr>
                <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Col1</th>
                <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Col2</th>
              </tr>
            </thead>
            <tr>
              <td class="border border-gray-300 px-4 py-2">Data1</td>
              <td class="border border-gray-300 px-4 py-2">Data2</td>
            </tr>
          </table>
        </div>
      `;

      const processed = preprocessTableHTML(html);

      // Check all transformations
      expect(processed).not.toMatch(/overflow-x-auto/); // No wrapper
      expect(processed).toMatch(/border="1"/); // Legacy attrs
      expect(processed).toMatch(/<tbody>/); // Has tbody
      expect(processed).toMatch(/style="[^"]*width:/); // Inline styles
      expect(processed).toMatch(/<!--StartFragment-->/); // Office markers
    });

    it('should handle non-table content correctly', () => {
      const html = `
        <h1 class="text-2xl font-bold">Title</h1>
        <p class="my-3">Paragraph</p>
      `;

      const processed = preprocessTableHTML(html);

      // Should still convert classes to styles for non-table elements
      expect(processed).toMatch(/style=/);
      expect(processed).not.toMatch(/class="text-2xl/);
    });

    it('should preserve existing inline styles', () => {
      const html = `
        <table style="margin: 20px;">
          <tr>
            <td style="color: red;">Test</td>
          </tr>
        </table>
      `;

      const processed = preprocessTableHTML(html);

      // Should preserve original styles
      expect(processed).toMatch(/margin:\s*20px/);
      expect(processed).toMatch(/color:\s*red/);
      // And add new ones
      expect(processed).toMatch(/border-collapse:\s*collapse/);
    });

    it('should handle empty tables gracefully', () => {
      const html = '<table></table>';
      const processed = preprocessTableHTML(html);

      expect(processed).toMatch(/<table/);
      expect(processed).toMatch(/border="1"/);
    });

    it('should handle multiple tables independently', () => {
      const html = `
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <tr><td>Table 1</td></tr>
          </table>
        </div>
        <p>Some text</p>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <tr><td>Table 2</td></tr>
          </table>
        </div>
      `;

      const processed = preprocessTableHTML(html);

      // Both tables should be processed
      const tableMatches = processed.match(/<table/g);
      expect(tableMatches).toHaveLength(2);

      // Both should have legacy attributes
      const borderMatches = processed.match(/border="1"/g);
      expect(borderMatches).toHaveLength(2);

      // No overflow wrappers
      expect(processed).not.toMatch(/overflow-x-auto/);
    });
  });
});
