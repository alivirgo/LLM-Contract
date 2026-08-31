export const malformedJsonOutputs = {
  unclosedBrace: '{"name": "Alice", "age": 30',
  trailingComma: '{"name": "Alice", "age": 30,}',
  singleQuotes: "{'name': 'Alice', 'age': 30}",
  wrappedInMarkdown: '```json\n{"name": "Alice", "age": 30}\n```',
  wrappedInMarkdownNoLang: '```\n{"name": "Alice", "age": 30}\n```',
  surroundedByConversationalFiller: 'Here is the JSON you requested:\n\n{"name": "Alice", "age": 30}\n\nHope that helps!',
  plainInvalidText: 'I am not a JSON object.',
};
