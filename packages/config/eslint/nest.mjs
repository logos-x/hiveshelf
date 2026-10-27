import globals from "globals";
import base from "./base.mjs";

export default [
  ...base,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // NestJS thường dùng class, decorator và dependency injection.
      // Không bắt buộc khai báo return type cho mọi method.
      "@typescript-eslint/explicit-function-return-type": "off",

      // Cho phép tham số bắt đầu bằng _ nếu cố ý không sử dụng.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
