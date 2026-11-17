import type { JSONSchema } from '@/types/domain';

/** Minimal JSON-Schema subset used to generate forms and give immediate field feedback. Harness remains the authority. */
export type FieldModel = {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  advanced: boolean;
  unit?: string;
  control: 'text' | 'textarea' | 'number' | 'integer' | 'select' | 'switch' | 'unsupported';
  options?: (string | number)[];
  schema: JSONSchema;
};

export function fieldsFromSchema(schema: JSONSchema): FieldModel[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([key, s]) => {
    const type = Array.isArray(s.type) ? s.type[0] : s.type;
    let control: FieldModel['control'] = 'unsupported';
    if (s.enum) control = 'select';
    else if (type === 'string') control = s['x-widget'] === 'textarea' || (s.maxLength ?? 0) > 200 ? 'textarea' : 'text';
    else if (type === 'number') control = 'number';
    else if (type === 'integer') control = 'integer';
    else if (type === 'boolean') control = 'switch';
    return {
      key, label: s.title ?? key, description: s.description, required: required.has(key),
      advanced: Boolean(s['x-advanced']), unit: s['x-unit'], control, options: s.enum, schema: s,
    };
  });
}

export function defaultsFromSchema(schema: JSONSchema): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, s] of Object.entries(schema.properties ?? {})) if (s.default !== undefined) values[key] = s.default;
  return values;
}

export function validateAgainstSchema(schema: JSONSchema, input: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fieldsFromSchema(schema)) {
    const value = input[field.key];
    const s = field.schema;
    if (value === undefined || value === '') { if (field.required) errors[field.key] = 'Required'; continue; }
    if (s.enum && !s.enum.includes(value as string)) errors[field.key] = 'Choose an option from the list';
    else if (field.control === 'number' || field.control === 'integer') {
      if (typeof value !== 'number' || Number.isNaN(value)) errors[field.key] = 'Enter a number';
      else if (field.control === 'integer' && !Number.isInteger(value)) errors[field.key] = 'Enter an integer';
      else if (s.minimum !== undefined && value < s.minimum) errors[field.key] = `Must be at least ${s.minimum}`;
      else if (s.maximum !== undefined && value > s.maximum) errors[field.key] = `Must be at most ${s.maximum}`;
    } else if (typeof value === 'string') {
      if (s.minLength !== undefined && value.trim().length < s.minLength) errors[field.key] = `At least ${s.minLength} characters`;
      else if (s.maxLength !== undefined && value.length > s.maxLength) errors[field.key] = `At most ${s.maxLength} characters`;
    }
  }
  if (schema.additionalProperties === false) {
    const known = new Set(Object.keys(schema.properties ?? {}));
    for (const key of Object.keys(input)) if (!known.has(key)) errors[key] = 'Unsupported parameter';
  }
  return errors;
}
