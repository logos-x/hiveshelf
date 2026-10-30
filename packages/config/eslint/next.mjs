import base from "./base.mjs";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

export default [
  ...base,
  ...nextVitals,

  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  prettier,
];
