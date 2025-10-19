module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^@handoverkey/shared$": "<rootDir>/../shared/src",
  },
};
