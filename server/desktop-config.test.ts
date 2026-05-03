import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");
const electronMainPath = path.join(projectRoot, "electron", "main.mjs");
const electronPreloadPath = path.join(projectRoot, "electron", "preload.mjs");
const desktopArchitectureDocPath = path.join(projectRoot, "docs", "desktop-architecture.md");

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    main?: string;
    scripts?: Record<string, string>;
    build?: {
      appId?: string;
      productName?: string;
      win?: {
        target?: Array<{ target?: string; arch?: string[] }>;
      };
      nsis?: {
        oneClick?: boolean;
        allowToChangeInstallationDirectory?: boolean;
      };
    };
  };
}

describe("desktop bootstrap", () => {
  it("declara los scripts principales para desarrollo y empaquetado de Windows", () => {
    const packageJson = readPackageJson();

    expect(packageJson.main).toBe("electron/main.mjs");
    expect(packageJson.scripts?.["desktop:dev"]).toContain("electron electron/main.mjs");
    expect(packageJson.scripts?.["desktop:dev"]).toContain("wait-on http://127.0.0.1:3210");
    expect(packageJson.scripts?.["desktop:build"]).toContain("electron-builder --win nsis");
  });

  it("incluye la configuración mínima de electron-builder para generar instalador NSIS", () => {
    const packageJson = readPackageJson();

    expect(packageJson.build?.appId).toBe("com.boutiquepos.desktop");
    expect(packageJson.build?.productName).toBe("Boutique POS Desktop");
    expect(packageJson.build?.win?.target).toEqual([
      {
        target: "nsis",
        arch: ["x64"],
      },
    ]);
    expect(packageJson.build?.nsis).toMatchObject({
      oneClick: false,
      allowToChangeInstallationDirectory: true,
    });
  });

  it("mantiene presentes los archivos base de Electron y la documentación de arquitectura", () => {
    expect(fs.existsSync(electronMainPath)).toBe(true);
    expect(fs.existsSync(electronPreloadPath)).toBe(true);
    expect(fs.existsSync(desktopArchitectureDocPath)).toBe(true);

    const mainContent = fs.readFileSync(electronMainPath, "utf8");
    expect(mainContent).toContain("Boutique POS Desktop");
    expect(mainContent).toContain("ELECTRON_RUN_AS_NODE");
    expect(mainContent).toContain("persist:boutique-pos");
  });
});
