import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

/**
 * Validate a body against a JSON Schema. Throws a descriptive error on mismatch.
 */
export function validateAgainstSchema(
  data: unknown,
  schema: Record<string, unknown>,
  label: string = 'body'
): void {
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    const errors = validate.errors
      ?.map((e) => `${e.instancePath || '/'} ${e.message}`)
      .join('; ');
    throw new Error(`${label} validation failed: ${errors}`);
  }
}

/**
 * Infer a basic JSON Schema from a value. Used as a fallback when
 * --body-schema is not provided. Note: all object keys are marked
 * required (since we can't know optionality from a single example).
 */
export function inferSchema(value: unknown): Record<string, unknown> {
  if (value === null) return { type: 'null' };
  if (Array.isArray(value)) {
    return {
      type: 'array',
      ...(value.length > 0 ? { items: inferSchema(value[0]) } : {}),
    };
  }
  switch (typeof value) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object': {
      const obj = value as Record<string, unknown>;
      const properties: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        properties[k] = inferSchema(v);
      }
      return {
        type: 'object',
        properties,
        required: Object.keys(obj),
      };
    }
    default:
      return {};
  }
}
