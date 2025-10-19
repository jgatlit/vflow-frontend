/**
 * Utility functions for converting between CSV field notation and JSON schema
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
