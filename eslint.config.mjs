import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/lib/**/*.{js,ts,mjs,cjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "next",
                "next/*",
                "react",
                "react-dom",
                "react/*",
                "@/app",
                "@/app/*",
                "@/components",
                "@/components/*",
                "@/features",
                "@/features/*",
              ],
              message:
                "src/lib/** tidak boleh mengimpor next, react, @/app, @/components, atau @/features (AGENTS.md §4).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
