// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CollapsibleNavigation } from "../app/components/CollapsibleNavigation";

afterEach(cleanup);

describe("CollapsibleNavigation", () => {
  it("hides and restores its navigation content", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleNavigation defaultWidth={280} label="complete book menu">
        <nav aria-label="Complete handbook sections">Sections</nav>
      </CollapsibleNavigation>,
    );

    await user.click(screen.getByRole("button", { name: "Resize or collapse complete book menu" }));
    expect(screen.queryByRole("navigation", { name: "Complete handbook sections" })).toBeNull();
    const expand = screen.getByRole("button", { name: "Expand complete book menu" });
    expect(expand.getAttribute("aria-expanded")).toBe("false");

    await user.click(expand);
    expect(screen.getByRole("navigation", { name: "Complete handbook sections" })).toBeTruthy();
  });

  it("resizes from the keyboard without collapsing", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CollapsibleNavigation defaultWidth={280} label="complete book menu">
        <nav>Sections</nav>
      </CollapsibleNavigation>,
    );
    const handle = screen.getByRole("button", { name: "Resize or collapse complete book menu" });
    const navigation = container.querySelector<HTMLElement>(".desktop-navigation");

    handle.focus();
    await user.keyboard("{ArrowRight}");
    expect(navigation?.style.width).toBe("296px");
    expect(handle.getAttribute("aria-expanded")).toBe("true");
  });
});
