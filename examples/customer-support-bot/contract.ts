import { z } from 'zod';
import {
  defineContract,
  zodAdapter,
  mustPreserveFacts,
  mustNotInvent,
  mustAskWhenUncertain,
  assertNoContradiction,
  assertForbiddenPhrases,
  assertRequiredTopicsCovered,
} from '../../src/index.js';

export const SupportResponseSchema = z.object({
  reply: z.string().min(10),
  category: z.enum(['billing', 'technical', 'refund', 'general']),
  requiresFollowUp: z.boolean(),
  urgency: z.enum(['low', 'medium', 'high']),
});

export const customerSupportContract = defineContract({
  name: 'customer-support-contract',
  version: '1.2.0',
  schema: zodAdapter(SupportResponseSchema),
  normalization: {
    stripCodeFences: true,
    trimWhitespace: true,
    extractJsonBlock: true,
  },
  invariants: [
    mustPreserveFacts({ threshold: 1.0 }),
    mustNotInvent({ mode: 'strict' }),
    mustAskWhenUncertain({
      isAmbiguousInput: (input) => typeof input === 'string' && input.toLowerCase().includes('change date'),
    }),
    assertNoContradiction(),
    assertForbiddenPhrases([
      'our servers are completely broken',
      'i guarantee you 100% money back immediately without authorization',
    ]),
  ],
  assertions: [
    assertRequiredTopicsCovered(['refund', 'policy'], { weight: 0.5 }),
  ],
  options: {
    bailOnSchemaError: true,
  },
});
