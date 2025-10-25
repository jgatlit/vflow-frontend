/**
 * Table HTML Preprocessor
 * Transforms Tailwind-styled tables into fully compatible HTML for rich text editors
 * (Google Docs, Microsoft Word, Notion, etc.)
 */

/**
 * Tailwind class to inline style mapping
 */
const TAILWIND_TO_STYLE: Record<string, string> = {
  // Layout
  'min-w-full': 'width: 100%',
  'overflow-x-auto': '', // Remove wrapper

  // Borders
  'border-collapse': 'border-collapse: collapse',
  'border': 'border: 1px solid #d1d5db',
  'border-gray-300': 'border-color: #d1d5db',
  'border-t-2': 'border-top: 2px solid',
  'border-gray-200': 'border-color: #e5e7eb',

  // Background colors
  'bg-gray-100': 'background-color: #f3f4f6',
  'bg-gray-50': 'background-color: #f9fafb',
  'bg-blue-50': 'background-color: #eff6ff',
  'bg-white': 'background-color: #ffffff',

  // Padding
  'px-4': 'padding-left: 16px; padding-right: 16px',
  'py-2': 'padding-top: 8px; padding-bottom: 8px',
  'px-1.5': 'padding-left: 6px; padding-right: 6px',
  'py-0.5': 'padding-top: 2px; padding-bottom: 2px',
  'p-4': 'padding: 16px',

  // Margins
  'my-4': 'margin-top: 16px; margin-bottom: 16px',
  'my-3': 'margin-top: 12px; margin-bottom: 12px',

  // Text
  'text-left': 'text-align: left',
  'text-center': 'text-align: center',
  'text-right': 'text-align: right',
  'font-semibold': 'font-weight: 600',
  'font-bold': 'font-weight: 700',
  'font-medium': 'font-weight: 500',
  'text-gray-900': 'color: #111827',
  'text-gray-700': 'color: #374151',
  'text-gray-600': 'color: #4b5563',
};

/**
 * Convert Tailwind classes to inline styles
 */
function convertClassesToInlineStyles(element: Element): void {
  const classList = element.className.split(/\s+/).filter(Boolean);
  const styles: string[] = [];

  classList.forEach((className) => {
    const style = TAILWIND_TO_STYLE[className];
    if (style) {
      styles.push(style);
    }
  });

  if (styles.length > 0) {
    const existingStyle = element.getAttribute('style') || '';
    const newStyle = [...styles, existingStyle].filter(Boolean).join('; ');
    element.setAttribute('style', newStyle);
  }

  // Remove class attribute for cleaner HTML
  element.removeAttribute('class');
}

/**
 * Add legacy table attributes for maximum compatibility
 */
function addLegacyTableAttributes(table: HTMLTableElement): void {
  table.setAttribute('border', '1');
  table.setAttribute('cellpadding', '4');
  table.setAttribute('cellspacing', '0');

  // Ensure border-collapse is in inline styles
  const existingStyle = table.getAttribute('style') || '';
  if (!existingStyle.includes('border-collapse')) {
    table.setAttribute('style', `border-collapse: collapse; width: 100%; ${existingStyle}`);
  }
}

/**
 * Ensure table has proper tbody structure
 */
function ensureTableBody(table: HTMLTableElement): void {
  const tbody = table.querySelector('tbody');

  if (!tbody) {
    // Find all rows that are not in thead or tfoot
    const thead = table.querySelector('thead');
    const tfoot = table.querySelector('tfoot');
    const allRows = Array.from(table.querySelectorAll('tr'));

    const theadRows = thead ? Array.from(thead.querySelectorAll('tr')) : [];
    const tfootRows = tfoot ? Array.from(tfoot.querySelectorAll('tr')) : [];

    const bodyRows = allRows.filter(
      (row) => !theadRows.includes(row) && !tfootRows.includes(row)
    );

    if (bodyRows.length > 0) {
      const newTbody = document.createElement('tbody');
      bodyRows.forEach((row) => {
        newTbody.appendChild(row);
      });

      // Insert tbody after thead or at the beginning
      if (thead) {
        thead.after(newTbody);
      } else {
        table.insertBefore(newTbody, table.firstChild);
      }
    }
  }
}

/**
 * Calculate optimal column widths based on content
 */
function optimizeColumnWidths(table: HTMLTableElement): void {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return;

  // Get the first row to count columns
  const firstRow = rows[0];
  const cells = Array.from(firstRow.querySelectorAll('th, td'));
  const columnCount = cells.length;

  // Calculate content length for each column
  const columnWidths: number[] = new Array(columnCount).fill(0);

  rows.forEach((row) => {
    const rowCells = Array.from(row.querySelectorAll('th, td'));
    rowCells.forEach((cell, index) => {
      const textLength = (cell.textContent || '').trim().length;
      columnWidths[index] = Math.max(columnWidths[index], textLength);
    });
  });

  // Calculate total content length
  const totalLength = columnWidths.reduce((sum, width) => sum + width, 0);

  // Set percentage widths based on content
  cells.forEach((cell, index) => {
    const percentage = Math.max(
      5, // Minimum 5%
      Math.min(
        50, // Maximum 50%
        Math.round((columnWidths[index] / totalLength) * 100)
      )
    );

    const existingStyle = cell.getAttribute('style') || '';
    cell.setAttribute('style', `width: ${percentage}%; ${existingStyle}`);
  });

  // Apply same widths to all rows
  rows.slice(1).forEach((row) => {
    const rowCells = Array.from(row.querySelectorAll('th, td'));
    rowCells.forEach((cell, index) => {
      if (cells[index]) {
        const width = cells[index].getAttribute('style')?.match(/width:\s*(\d+%)/)?.[1];
        if (width) {
          const existingStyle = cell.getAttribute('style') || '';
          cell.setAttribute('style', `width: ${width}; ${existingStyle}`);
        }
      }
    });
  });
}

/**
 * Add Office-specific HTML namespaces and metadata
 */
function addOfficeCompatibility(html: string): string {
  // Wrap in proper HTML structure with Office namespaces
  return `
<!--StartFragment-->
${html}
<!--EndFragment-->
  `.trim();
}

/**
 * Remove overflow wrapper divs around tables
 */
function unwrapTables(container: Element): void {
  const wrappers = container.querySelectorAll('div.overflow-x-auto, div[class*="overflow"]');

  wrappers.forEach((wrapper) => {
    const table = wrapper.querySelector('table');
    if (table) {
      // Replace wrapper with just the table
      wrapper.replaceWith(table);
    }
  });
}

/**
 * Main preprocessor function
 * Transforms HTML containing tables for rich text editor compatibility
 */
export function preprocessTableHTML(html: string): string {
  // Create a temporary DOM to manipulate
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Step 1: Remove overflow wrapper divs
  unwrapTables(tempDiv);

  // Step 2: Find all tables
  const tables = tempDiv.querySelectorAll('table');

  tables.forEach((table) => {
    // Step 3: Ensure proper tbody structure
    ensureTableBody(table);

    // Step 4: Add legacy table attributes
    addLegacyTableAttributes(table);

    // Step 5: Optimize column widths
    optimizeColumnWidths(table);

    // Step 6: Convert all Tailwind classes to inline styles
    // Process table and all children
    const allElements = [table, ...Array.from(table.querySelectorAll('*'))];
    allElements.forEach((element) => {
      convertClassesToInlineStyles(element);
    });
  });

  // Step 7: Convert all non-table Tailwind classes to inline styles
  const allElements = Array.from(tempDiv.querySelectorAll('*'));
  allElements.forEach((element) => {
    if (element.tagName !== 'TABLE' && !element.closest('table')) {
      convertClassesToInlineStyles(element);
    }
  });

  // Step 8: Get the processed HTML
  let processedHTML = tempDiv.innerHTML;

  // Step 9: Add Office compatibility markers
  processedHTML = addOfficeCompatibility(processedHTML);

  return processedHTML;
}

/**
 * Check if HTML contains tables
 */
export function containsTables(html: string): boolean {
  return html.includes('<table');
}

/**
 * Get table statistics for debugging
 */
export function getTableStats(html: string): {
  tableCount: number;
  totalRows: number;
  totalColumns: number;
  hasWrapper: boolean;
} {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const tables = tempDiv.querySelectorAll('table');
  const wrappers = tempDiv.querySelectorAll('div.overflow-x-auto, div[class*="overflow"]');

  let totalRows = 0;
  let maxColumns = 0;

  tables.forEach((table) => {
    const rows = table.querySelectorAll('tr');
    totalRows += rows.length;

    rows.forEach((row) => {
      const cells = row.querySelectorAll('th, td');
      maxColumns = Math.max(maxColumns, cells.length);
    });
  });

  return {
    tableCount: tables.length,
    totalRows,
    totalColumns: maxColumns,
    hasWrapper: wrappers.length > 0,
  };
}
