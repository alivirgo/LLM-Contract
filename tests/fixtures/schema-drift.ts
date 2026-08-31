export const schemaDriftOutputs = {
  validUser: JSON.stringify({
    userId: "USR-101",
    email: "alice@example.com",
    role: "admin",
    age: 32,
  }),
  missingRequiredField: JSON.stringify({
    userId: "USR-101",
    role: "admin",
    age: 32,
    // missing email
  }),
  wrongFieldType: JSON.stringify({
    userId: "USR-101",
    email: "alice@example.com",
    role: "admin",
    age: "thirty-two", // string instead of number
  }),
  invalidEnum: JSON.stringify({
    userId: "USR-101",
    email: "alice@example.com",
    role: "super-god-mode", // not in allowed enum ['admin', 'user', 'guest']
    age: 32,
  }),
  negativeNumericRange: JSON.stringify({
    userId: "USR-101",
    email: "alice@example.com",
    role: "user",
    age: -5,
  }),
};
