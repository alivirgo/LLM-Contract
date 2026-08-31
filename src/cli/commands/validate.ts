import { defineContract } from '../../core/define-contract.js';
import { evaluate } from '../../core/evaluate.js';
import { formatEvaluationTerminal } from '../../reporters/terminal.js';

export interface ValidateCommandOptions {
  input: string;
  output: string;
  context?: string;
}

export async function validateCommand(options: ValidateCommandOptions): Promise<number> {
  const contract = defineContract({
    name: 'ad-hoc-validation',
    invariants: [],
    assertions: [],
  });

  const result = await evaluate(contract, {
    input: options.input,
    output: options.output,
    context: options.context,
  });

  console.log(formatEvaluationTerminal(result));
  return result.passed ? 0 : 1;
}
