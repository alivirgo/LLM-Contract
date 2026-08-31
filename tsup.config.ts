import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'adapters/schema/zod': 'src/adapters/schema/zod.ts',
      'adapters/schema/valibot': 'src/adapters/schema/valibot.ts',
      'adapters/schema/json-schema': 'src/adapters/schema/json-schema.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
  },
  {
    entry: {
      'bin/llm-contract': 'src/cli/bin.ts',
    },
    format: ['esm'],
    banner: {
      js: '#!/usr/bin/env node',
    },
    dts: false,
    sourcemap: false,
  },
]);
