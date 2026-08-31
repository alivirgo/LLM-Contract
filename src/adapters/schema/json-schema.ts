import type { SchemaAdapter, SchemaValidationResult } from '../../types/adapter.js';
import type { FailureDetail } from '../../types/failure.js';

export interface JSONSchemaObject {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null' | string[];
  properties?: Record<string, JSONSchemaObject>;
  required?: string[];
  items?: JSONSchemaObject;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JSONSchemaObject;
  [key: string]: any;
}

/**
 * Universal adapter for JSON Schema definitions.
 * Provides a lightweight, zero-dependency standard validator.
 */
export function jsonSchemaAdapter<T = unknown>(
  schema: JSONSchemaObject,
  name = 'JSONSchema'
): SchemaAdapter<T> {
  return {
    name,
    validate(data: unknown): SchemaValidationResult<T> {
      const errors: FailureDetail[] = [];
      validateNode(data, schema, [], errors);

      if (errors.length === 0) {
        return {
          success: true,
          data: data as T,
        };
      }

      return {
        success: false,
        errors,
      };
    },
    toJSONSchema() {
      return schema;
    },
  };
}

function validateNode(
  val: any,
  schema: JSONSchemaObject,
  path: (string | number)[],
  errors: FailureDetail[]
) {
  const pathStr = path.join('.');

  // 1. Type validation
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = getJsonType(val);

    const matchesType = types.some(t => {
      if (t === 'integer') return typeof val === 'number' && Number.isInteger(val);
      if (t === 'number') return typeof val === 'number';
      return actualType === t;
    });

    if (!matchesType) {
      errors.push({
        code: 'SCHEMA_VIOLATION',
        message: `Expected type ${types.join(' | ')} at '${pathStr || 'root'}', got ${actualType}`,
        severity: 'error',
        path,
        expected: types,
        actual: actualType,
      });
      return; // Stop deeper check if type fails
    }
  }

  // 2. Enum validation
  if (schema.enum && !schema.enum.includes(val)) {
    errors.push({
      code: 'SCHEMA_VIOLATION',
      message: `Value ${JSON.stringify(val)} at '${pathStr || 'root'}' is not in enum [${schema.enum.join(', ')}]`,
      severity: 'error',
      path,
      expected: schema.enum,
      actual: val,
    });
  }

  // 3. Number range validation
  if (typeof val === 'number') {
    if (schema.minimum !== undefined && val < schema.minimum) {
      errors.push({
        code: 'SCHEMA_VIOLATION',
        message: `Number ${val} at '${pathStr || 'root'}' is less than minimum ${schema.minimum}`,
        severity: 'error',
        path,
        expected: { min: schema.minimum },
        actual: val,
      });
    }
    if (schema.maximum !== undefined && val > schema.maximum) {
      errors.push({
        code: 'SCHEMA_VIOLATION',
        message: `Number ${val} at '${pathStr || 'root'}' is greater than maximum ${schema.maximum}`,
        severity: 'error',
        path,
        expected: { max: schema.maximum },
        actual: val,
      });
    }
  }

  // 4. String validations
  if (typeof val === 'string') {
    if (schema.minLength !== undefined && val.length < schema.minLength) {
      errors.push({
        code: 'SCHEMA_VIOLATION',
        message: `String length ${val.length} at '${pathStr || 'root'}' is shorter than minLength ${schema.minLength}`,
        severity: 'error',
        path,
        expected: { minLength: schema.minLength },
        actual: val.length,
      });
    }
    if (schema.maxLength !== undefined && val.length > schema.maxLength) {
      errors.push({
        code: 'SCHEMA_VIOLATION',
        message: `String length ${val.length} at '${pathStr || 'root'}' is longer than maxLength ${schema.maxLength}`,
        severity: 'error',
        path,
        expected: { maxLength: schema.maxLength },
        actual: val.length,
      });
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(val)) {
        errors.push({
          code: 'SCHEMA_VIOLATION',
          message: `String at '${pathStr || 'root'}' does not match pattern ${schema.pattern}`,
          severity: 'error',
          path,
          expected: schema.pattern,
          actual: val,
        });
      }
    }
  }

  // 5. Object validations
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    if (schema.required) {
      for (const reqKey of schema.required) {
        if (!(reqKey in val) || val[reqKey] === undefined) {
          errors.push({
            code: 'SCHEMA_VIOLATION',
            message: `Missing required property '${reqKey}' at '${pathStr || 'root'}'`,
            severity: 'error',
            path: [...path, reqKey],
            expected: reqKey,
            actual: undefined,
          });
        }
      }
    }

    if (schema.properties) {
      for (const [propKey, propSchema] of Object.entries(schema.properties)) {
        if (propKey in val) {
          validateNode(val[propKey], propSchema, [...path, propKey], errors);
        }
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      const allowedKeys = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(val)) {
        if (!allowedKeys.has(key)) {
          errors.push({
            code: 'SCHEMA_VIOLATION',
            message: `Unrecognized additional property '${key}' at '${pathStr || 'root'}'`,
            severity: 'error',
            path: [...path, key],
            actual: key,
          });
        }
      }
    }
  }

  // 6. Array validations
  if (Array.isArray(val) && schema.items) {
    for (let i = 0; i < val.length; i++) {
      validateNode(val[i], schema.items, [...path, i], errors);
    }
  }
}

function getJsonType(val: any): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}
