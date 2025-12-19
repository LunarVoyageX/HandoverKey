import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
it("renders a div", () => {
  render(<div>test</div>);
  expect(screen.getByText("test")).toBeInTheDocument();
});
