import { describe, expect, it } from "vitest";
import { Language } from "@hiveshelf/shared";
import { loadMessages, mergeMessages } from "./messages";

describe("mergeMessages", () => {
  it("ưu tiên bản dịch khi khóa tồn tại", () => {
    const result = mergeMessages({ title: "Trang chủ" }, { title: "Home" });

    expect(result.title).toBe("Home");
  });

  it("dùng tiếng Việt khi bản dịch thiếu khóa", () => {
    const result = mergeMessages(
      {
        title: "Trang chủ",
        description: "Không gian đọc sách",
      },
      { title: "Home" },
    );

    expect(result).toEqual({
      title: "Home",
      description: "Không gian đọc sách",
    });
  });

  it("giữ fallback cho khóa lồng nhau", () => {
    const result = mergeMessages(
      {
        common: {
          actions: {
            retry: "Thử lại",
            cancel: "Hủy",
          },
        },
      },
      {
        common: {
          actions: {
            retry: "Try again",
          },
        },
      },
    );

    expect(result).toEqual({
      common: {
        actions: {
          retry: "Try again",
          cancel: "Hủy",
        },
      },
    });
  });

  it("giữ toàn bộ namespace khi bản dịch chưa có nội dung", () => {
    const result = mergeMessages(
      {
        auth: {
          login: {
            title: "Đăng nhập",
          },
        },
      },
      { auth: {} },
    );

    expect(result).toEqual({
      auth: {
        login: {
          title: "Đăng nhập",
        },
      },
    });
  });

  it("không thay đổi dữ liệu đầu vào", () => {
    const fallback = {
      actions: {
        retry: "Thử lại",
        cancel: "Hủy",
      },
    };

    const translated = {
      actions: {
        retry: "Try again",
      },
    };

    mergeMessages(fallback, translated);

    expect(fallback).toEqual({
      actions: {
        retry: "Thử lại",
        cancel: "Hủy",
      },
    });

    expect(translated).toEqual({
      actions: {
        retry: "Try again",
      },
    });
  });
});

describe("loadMessages", () => {
  it("nạp bản dịch tiếng Việt từ các file JSON", () => {
    const messages = loadMessages(Language.VI);

    expect(messages).toMatchObject({
      common: {
        actions: {
          retry: "Thử lại",
        },
      },
      auth: {},
      reader: {},
      catalog: {},
    });
  });

  it("nạp bản dịch tiếng Anh từ các file JSON", () => {
    const messages = loadMessages(Language.EN);

    expect(messages).toMatchObject({
      common: {
        actions: {
          retry: "Try again",
        },
      },
      auth: {},
      reader: {},
      catalog: {},
    });
  });
});
