/**
 * Utility functions for converting between CSV field notation and JSON schema
 * and generating markdown structure documentation
 */

/**
 * Converts CSV field notation with "/" separators to nested JSON schema
 * Example: "id,name/first,name/last,contact/email" ->
 * {
 *   "type": "object",
 *   "properties": {
 *     "id": {"type": "string"},
 *     "name": {
 *       "type": "object",
 *       "properties": {
 *         "first": {"type": "string"},
 *         "last": {"type": "string"}
 *       }
 *     },
 *     "contact": {
 *       "type": "object",
 *       "properties": {
 *         "email": {"type": "string"}
 *       }
 *     }
 *   }
 * }
 */
export function csvFieldsToJsonSchema(csvFields: string): string {
  if (!csvFields || csvFields.trim() === '') {
    return '';
  }

  const fields = csvFields.split(',').map(f => f.trim()).filter(f => f.length > 0);
  const schema: any = {
    type: 'object',
    properties: {}
  };

  for (const field of fields) {
    const parts = field.split('/');
    let current = schema.properties;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      const isLast = i === parts.length - 1;

      if (isLast) {
        // Leaf node - add as string property
        current[part] = { type: 'string' };
      } else {
        // Intermediate node - create nested object if doesn't exist
        if (!current[part]) {
          current[part] = {
            type: 'object',
            properties: {}
          };
        }
        current = current[part].properties;
      }
    }
  }

  return JSON.stringify(schema, null, 2);
}

/**
 * Converts JSON schema to CSV field notation with "/" separators
 * Example: JSON schema with nested objects -> "id,name/first,name/last,contact/email"
 */
export function jsonSchemaToCSVFields(jsonSchema: string): string {
  if (!jsonSchema || jsonSchema.trim() === '') {
    return '';
  }

  try {
    // Strip markdown code blocks if present
    let schemaString = jsonSchema.trim();
    schemaString = schemaString.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '').trim();

    const schema = JSON.parse(schemaString);

    // Extract fields recursively
    const fields: string[] = [];

    function extractFields(obj: any, prefix: string = '') {
      if (!obj || typeof obj !== 'object') return;

      const properties = obj.properties || obj;

      for (const key in properties) {
        const value = properties[key];
        const fieldPath = prefix ? `${prefix}/${key}` : key;

        if (value.type === 'object' && value.properties) {
          // Nested object - recurse
          extractFields(value, fieldPath);
        } else {
          // Leaf property - add to fields
          fields.push(fieldPath);
        }
      }
    }

    extractFields(schema);
    return fields.join(', ');
  } catch (error) {
    console.warn('Failed to parse JSON schema for CSV conversion:', error);
    return '';
  }
}

/**
 * Converts JSON schema to markdown heading structure for prompt documentation
 * Example: Nested JSON schema -> "### name\n\n### number\n\n### direction\n\n#### 1\n\n#### 2\n\n"
 */
export function jsonSchemaToMarkdown(jsonSchema: string): string {
  if (!jsonSchema || jsonSchema.trim() === '') {
    return '';
  }

  try {
    // Strip markdown code blocks if present
    let schemaString = jsonSchema.trim();
    schemaString = schemaString.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '').trim();

    const schema = JSON.parse(schemaString);
    const lines: string[] = [];

    function extractMarkdown(obj: any, level: number = 3) {
      if (!obj || typeof obj !== 'object') return;

      const properties = obj.properties || obj;

      for (const key in properties) {
        const value = properties[key];
        const heading = '#'.repeat(level);

        lines.push(`${heading} ${key}`);
        lines.push(''); // Empty line after heading

        if (value.type === 'object' && value.properties) {
          // Nested object - recurse with increased heading level
          extractMarkdown(value, level + 1);
        }
      }
    }

    extractMarkdown(schema);
    return lines.join('\n');
  } catch (error) {
    console.warn('Failed to parse JSON schema for markdown conversion:', error);
    return '';
  }
}

/**
 * Converts CSV fields to markdown heading structure for prompt documentation
 * Example: "name, number, direction/1, direction/2" -> "### name\n\n### number\n\n### direction\n\n#### 1\n\n#### 2\n\n"
 */
export function csvFieldsToMarkdown(csvFields: string): string {
  if (!csvFields || csvFields.trim() === '') {
    return '';
  }

  const fields = csvFields.split(',').map(f => f.trim()).filter(f => f.length > 0);
  const lines: string[] = [];
  const processedParents = new Set<string>();

  for (const field of fields) {
    const parts = field.split('/').map(p => p.trim());

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const level = 3 + i; // Start at h3 (###)
      const heading = '#'.repeat(level);
      const pathUpToHere = parts.slice(0, i + 1).join('/');

      // Only add if we haven't processed this parent already
      if (!processedParents.has(pathUpToHere)) {
        lines.push(`${heading} ${part}`);
        lines.push(''); // Empty line after heading
        processedParents.add(pathUpToHere);
      }
    }
  }

  return lines.join('\n');
}
