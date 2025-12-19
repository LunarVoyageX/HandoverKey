module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        isolatedModules: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!(uuid|@handoverkey)/)"],
  moduleNameMapper: {
    "^@handoverkey/shared$": "<rootDir>/packages/shared/src",
    "^@handoverkey/database$": "<rootDir>/packages/database/src",
    "^@handoverkey/crypto$": "<rootDir>/packages/crypto/src",
  },
  rootDir: ".",
};
