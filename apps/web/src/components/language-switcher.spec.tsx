import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Language } from "@hiveshelf/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMessages } from "@/i18n/messages";
import { LanguageSwitcher } from "./language-switcher";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: navigation.usePathname,
  useRouter: () => ({
    replace: navigation.replace,
  }),
}));

const originalUrl = window.location.href;

function renderSwitcher(locale: Language = Language.VI) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={loadMessages(locale)}
      timeZone="Asia/Ho_Chi_Minh"
    >
      <LanguageSwitcher />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  navigation.replace.mockReset();
  navigation.usePathname.mockReset();
  navigation.usePathname.mockReturnValue("/catalog");

  window.history.replaceState(null, "", "/vi/catalog");
});

afterEach(() => {
  window.history.replaceState(null, "", originalUrl);
});

describe("LanguageSwitcher", () => {
  it("hiển thị nhãn tiếng Việt và locale hiện tại", () => {
    renderSwitcher(Language.VI);

    expect(screen.getByRole("combobox", { name: "Ngôn ngữ" })).toHaveValue("vi");

    expect(screen.getByRole("option", { name: "Tiếng Anh" })).toHaveValue("en");
  });

  it("hiển thị nhãn tiếng Anh và locale hiện tại", () => {
    renderSwitcher(Language.EN);

    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue("en");

    expect(screen.getByRole("option", { name: "Vietnamese" })).toHaveValue("vi");
  });

  it("đổi vi sang en và giữ đường dẫn, query lặp, hash", () => {
    navigation.usePathname.mockReturnValue("/catalog/books/42");

    window.history.replaceState(null, "", "/vi/catalog/books/42?tag=a&tag=b&page=2#details");

    renderSwitcher(Language.VI);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "en" },
    });

    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith(
      "/catalog/books/42?tag=a&tag=b&page=2#details",
      {
        locale: "en",
        scroll: false,
      },
    );
  });

  it("đổi en sang vi và giữ trang hiện tại", () => {
    window.history.replaceState(null, "", "/en/catalog");

    renderSwitcher(Language.EN);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "vi" },
    });

    expect(navigation.replace).toHaveBeenCalledWith("/catalog", {
      locale: "vi",
      scroll: false,
    });
  });

  it("không điều hướng khi chọn lại locale hiện tại", () => {
    renderSwitcher(Language.VI);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "vi" },
    });

    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
