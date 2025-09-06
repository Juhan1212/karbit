export default {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleDirectories: ["node_modules"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/app/$1",
    "^lightweight-charts$": "<rootDir>/node_modules/lightweight-charts",
    "^gate-api$": "<rootDir>/node_modules/gate-api",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(gate-api|remix-auth|remix-auth-form|@remix-run|@remix-auth)/)",
  ],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  verbose: true,
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.test.ts"],
};
