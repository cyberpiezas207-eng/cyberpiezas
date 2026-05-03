import fs from "node:fs/promises";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está disponible");
  }

  const sqlPath = new URL("../drizzle/0014_rich_maestro.sql", import.meta.url);
  const rawSql = await fs.readFile(sqlPath, "utf8");
  const statements = rawSql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const connection = await mysql.createConnection(databaseUrl);
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`Migración aplicada correctamente con ${statements.length} sentencias.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
