// =============================================================================
// disable-drizzle-railway.js
// =============================================================================
// Script que se ejecuta despues de npm install (postinstall).
// Si estamos en Railway, reemplaza el binario drizzle-kit con un no-op.
// Esto evita que el Pre-deploy Command de Railway rompa el deploy.
// Localmente NO hace nada (drizzle-kit funciona normal).
// =============================================================================

import fs from "fs";
import path from "path";

const isRailway =
  process.env.RAILWAY_DEPLOYMENT_ID ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_ENVIRONMENT;

if (!isRailway) {
  console.log("[postinstall] Local environment - drizzle-kit available");
  process.exit(0);
}

console.log("[postinstall] Railway detected - disabling drizzle-kit binary");

const wrapperContent = `#!/bin/sh
echo "================================================"
echo " drizzle-kit disabled in Railway deploy"
echo " Run migrations manually via admin endpoint"
echo "================================================"
exit 0
`;

// Posibles ubicaciones del binario drizzle-kit
const possiblePaths = [
  "node_modules/.bin/drizzle-kit",
  "node_modules/.pnpm/drizzle-kit@0.31.10/node_modules/drizzle-kit/bin.cjs",
];

let replaced = 0;

for (const binPath of possiblePaths) {
  try {
    if (fs.existsSync(binPath)) {
      fs.writeFileSync(binPath, wrapperContent);
      fs.chmodSync(binPath, 0o755);
      console.log("[postinstall] Replaced: " + binPath);
      replaced++;
    }
  } catch (err) {
    console.log("[postinstall] Could not replace " + binPath + ": " + err.message);
  }
}

if (replaced === 0) {
  console.log("[postinstall] WARNING: drizzle-kit binary not found");
} else {
  console.log("[postinstall] " + replaced + " drizzle-kit binary(ies) replaced successfully");
}

process.exit(0);
