import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      /**
       * The React Compiler-oriented rules shipped in eslint-config-next 16 flag
       * several patterns this codebase uses deliberately and correctly:
       *  - the "latest ref" pattern (assigning `ref.current` during render) so a
       *    memoised callback always sees the freshest closure,
       *  - synchronising local state from an external source (URL params, the
       *    pre-paint theme class) inside a mount effect,
       *  - kicking off a fetch and setting `loading` inside an effect.
       * We keep them as warnings so genuinely new issues still surface.
       */
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
