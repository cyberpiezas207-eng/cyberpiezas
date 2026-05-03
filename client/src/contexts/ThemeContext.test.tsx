import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function ThemeProbe() {
  const { theme, toggleTheme, switchable } = useTheme();

  return (
    <button
      type="button"
      data-testid="theme-probe"
      data-theme={theme}
      data-switchable={switchable ? "true" : "false"}
      onClick={() => toggleTheme?.()}
    >
      Cambiar tema
    </button>
  );
}

describe("ThemeContext", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.documentElement.className = "";
    window.localStorage.clear();
  });

  it("aplica el tema por defecto y persiste el valor cuando el modo es conmutable", () => {
    act(() => {
      root.render(
        <ThemeProvider defaultTheme="light" switchable>
          <ThemeProbe />
        </ThemeProvider>,
      );
    });

    const probe = container.querySelector('[data-testid="theme-probe"]');

    expect(probe?.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("theme")).toBe("light");
  });

  it("recupera el tema guardado y alterna correctamente a claro", () => {
    window.localStorage.setItem("theme", "dark");

    act(() => {
      root.render(
        <ThemeProvider defaultTheme="light" switchable>
          <ThemeProbe />
        </ThemeProvider>,
      );
    });

    const probe = container.querySelector('[data-testid="theme-probe"]') as HTMLButtonElement;

    expect(probe.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      probe.click();
    });

    expect(probe.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("theme")).toBe("light");
  });
});
