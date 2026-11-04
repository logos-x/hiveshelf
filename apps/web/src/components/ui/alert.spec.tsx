import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

describe("Alert", () => {
  it("renders an accessible alert with its content", () => {
    render(
      <Alert>
        <AlertTitle>Lưu thành công</AlertTitle>
        <AlertDescription>Thay đổi của bạn đã được lưu.</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByRole("alert");

    expect(alert).toBeInTheDocument();
    expect(within(alert).getByText("Lưu thành công")).toBeInTheDocument();
    expect(within(alert).getByText("Thay đổi của bạn đã được lưu.")).toBeInTheDocument();
  });
});
