// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Language } from "@hiveshelf/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("../../scripts/check-i18n.mjs", import.meta.url));

let fixtureDirectory: string;

function writeNamespace(locale: Language, namespace: string, messages: unknown) {
  writeFileSync(
    join(fixtureDirectory, locale, `${namespace}.json`),
    JSON.stringify(messages),
    "utf8",
  );
}

function runCheck() {
  const result = spawnSync(process.execPath, [scriptPath, fixtureDirectory], {
    encoding: "utf8",
    timeout: 10_000,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

beforeEach(() => {
  fixtureDirectory = mkdtempSync(join(tmpdir(), "hiveshelf-i18n-"));

  for (const locale of Object.values(Language)) {
    mkdirSync(join(fixtureDirectory, locale));

    writeNamespace(locale, "common", {
      actions: {
        retry: locale === Language.VI ? "Thử lại" : "Try again",
      },
    });

    for (const namespace of ["auth", "reader", "catalog"]) {
      writeNamespace(locale, namespace, {});
    }
  }
});

afterEach(() => {
  rmSync(fixtureDirectory, {
    recursive: true,
    force: true,
  });
});

describe("check-i18n script", () => {
  it("thành công khi các ngôn ngữ có cùng cấu trúc khóa", () => {
    const result = runCheck();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Translation validation passed");
  });

  it("báo lỗi khi tiếng Anh thiếu khóa lồng nhau", () => {
    writeNamespace(Language.EN, "common", {
      actions: {},
    });

    const result = runCheck();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[en] Missing key: common.actions.retry");
  });

  it("báo lỗi khi tiếng Anh có khóa mà tiếng Việt không có", () => {
    writeNamespace(Language.EN, "common", {
      actions: {
        retry: "Try again",
        cancel: "Cancel",
      },
    });

    const result = runCheck();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[en] Extra key compared with vi: common.actions.cancel");
  });

  it("báo lỗi khi kiểu dữ liệu của khóa không khớp", () => {
    writeNamespace(Language.EN, "common", {
      actions: {
        retry: {},
      },
    });

    const result = runCheck();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[en] Type mismatch: common.actions.retry");
  });

  it("báo lỗi khi bản dịch chỉ chứa khoảng trắng", () => {
    writeNamespace(Language.EN, "common", {
      actions: {
        retry: "   ",
      },
    });

    const result = runCheck();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[en] Empty translation: common.actions.retry");
  });

  it("báo lỗi khi thiếu file namespace bắt buộc", () => {
    rmSync(join(fixtureDirectory, Language.EN, "auth.json"));

    const result = runCheck();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[en] Missing namespace: auth");
  });

  it("báo lỗi khi JSON sai cú pháp", () => {
    writeFileSync(join(fixtureDirectory, Language.EN, "common.json"), "{", "utf8");

    const result = runCheck();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[en] Cannot read common.json:");
  });
});
