// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    // Artefatos gerados (Web/Expo Router). Sem isto o `eslint .` varria os
    // bundles minificados (_expo/, dist-github-pages/) e devolvia ~22 mil
    // "erros" que não são código-fonte.
    ignores: [
      "dist/*",
      "dist-github-pages/**",
      "_expo/**",
      ".expo/**",
      "web-build/**",
    ],
  },
]);
