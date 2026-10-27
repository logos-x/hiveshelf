import base from "./base.mjs";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

export default [
  ...base,
  ...nextVitals,
  ...nextTs,

  // Prettier đặt cuối để tắt các rule định dạng có thể xung đột.
  prettier,

  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
  },
];
