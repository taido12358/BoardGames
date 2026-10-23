import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameInstructions from "./GameInstructions";
import type { InstructionSection } from "../platform/gameLibraryTypes";

const sections: InstructionSection[] = [
  { id: "intro", label: "Giới thiệu", kind: "text", paragraphs: ["Nội dung đầu"] },
  { id: "rules", label: "Luật chơi", kind: "text", paragraphs: ["Nội dung luật"] },
  { id: "end", label: "Kết thúc", kind: "text", paragraphs: ["Nội dung cuối"] },
];

describe("GameInstructions — điều hướng bàn phím", () => {
  it("mũi tên chuyển tab, tiêu điểm và nội dung cùng nhau", async () => {
    const user = userEvent.setup();
    render(<GameInstructions sections={sections} />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "Giới thiệu" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    const selected = screen.getByRole("tab", { name: "Luật chơi" });
    expect(selected).toHaveFocus();
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Luật chơi" })).toHaveTextContent("Nội dung luật");
    await user.tab();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });

  it("Home/End và mũi tên vòng qua đầu cuối", async () => {
    const user = userEvent.setup();
    render(<GameInstructions sections={sections} />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Kết thúc" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Giới thiệu" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Kết thúc" })).toHaveFocus();
  });
});
