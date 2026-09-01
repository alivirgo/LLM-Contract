# Your AI Testing Setup Is Too Complicated. I Replaced It With One Command.

> **Punch line: If your AI agent can write an app in minutes, testing that agent should not take your team a week.**

![One command transforms AI testing chaos into a passing test](./one-command-ai-tested.png)

AI evaluation has a setup problem.

The idea sounds simple: define the behavior your AI must preserve, run representative cases, and block regressions. Then implementation begins. You choose metrics, wire a model provider, create datasets, debate judges, build reports, configure CI, and teach every coding agent in the team how it all fits together.

By the time the first test runs, the prompt has changed twice.

That is backwards. Testing should be the easiest part of changing an AI system—not another AI platform your team has to operate.

## The three-command version

```bash
npm install llm-contract
npx llm-contract init
npm run test:ai
```

The initializer creates a real, runnable suite rather than an empty configuration file. You get a contract, sample cases, an npm script, and short instructions that coding agents can understand.

No provider migration. No API key. No hidden request to somebody else's server.

Keep OpenAI, Anthropic, Gemini, a local model, or your existing agent framework. `llm-contract` evaluates the output your application already produces.

## Why I did not split everything into ten packages

Modularity can look elegant on an architecture diagram while feeling miserable at the keyboard. A core package, provider adapter, reporter package, CLI package, dataset package, and five agent plugins would create more version coordination than value.

The simpler boundary is this:

- Your application generates output.
- A behavioral contract says what must remain true.
- `llm-contract` evaluates it and reports exactly what failed.

Optional schema libraries stay optional. Provider SDKs stay in your application. The core makes no hidden network calls. That keeps installation small and the mental model smaller.

## AI coding agents now get the same map

Modern projects are changed by humans and coding agents together. A test tool is not truly easy to integrate if Cursor follows one convention, Claude gets different context, and the next Codex session has to reverse-engineer the evaluation folder.

The initializer creates concise instructions for common agent conventions, including `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and a Cursor rule. Each says the same important things:

1. Read the behavioral contract before changing prompts, tools, models, retrieval, or orchestration.
2. Add a representative case.
3. Run the AI test.
4. Do not weaken the contract just to turn a failure green.

Antigravity and other agents that understand repository instructions can follow the same workflow. The contract becomes shared project knowledge instead of tribal knowledge trapped in one chat.

## Start deterministic, add sophistication only when it earns its place

Not every evaluation needs another model.

JSON parsing, schema validity, forbidden phrases, required concepts, numeric bounds, citations, fact preservation, and business rules can often be checked deterministically. Those checks are cheap, repeatable, inspectable, and appropriate for CI.

An external judge can still help with genuinely subjective questions. But a probabilistic judge should not erase a deterministic failure. If the output contradicts a known price or violates the schema, a flattering quality score does not make it releasable.

This is why `llm-contract` returns evidence, checks, failure codes, warnings, raw output, normalized output, and a transparent score breakdown—not one mysterious number called “AI quality.”

## What the generated contract looks like

```js
export default defineContract({
  name: 'my-ai-response',
  normalization: { trimWhitespace: true, stripCodeFences: true },
  invariants: [
    assertForbiddenPhrases(['I made that up'], { isHard: true }),
  ],
  assertions: [
    assertRequiredTopicsCovered(['help'], { minCoveredCount: 1 }),
  ],
});
```

It is deliberately boring. You can understand it without learning a configuration language. Replace the example rules with behavior that matters to your product: never invent an order status, ask for an account identifier when it is missing, preserve quoted figures, refuse a prohibited action, or keep a structured field within an allowed range.

Then fill the cases file with incidents you never want to repeat and representative flows you cannot afford to break.

## The real goal is a shorter distance to confidence

Evaluation tooling often competes on the number of metrics it can display. Developers experience something different: the distance between “I changed the prompt” and “I know whether that change is safe.”

That distance should be one command.

`llm-contract` does not claim to solve hallucinations universally. It does something more practical: it lets you state the behavior your system owes its users, test that behavior across real cases, detect regressions, expose flakiness, and enforce the result in CI.

Install it. Initialize it. Replace the samples with the failures that matter to you.

**Your AI will keep changing. Its promises should not.**

---

Project: https://github.com/alivirgo/LLM-Contract  
npm: https://www.npmjs.com/package/llm-contract  
Documentation: https://alivirgo.github.io/LLM-Contract/
