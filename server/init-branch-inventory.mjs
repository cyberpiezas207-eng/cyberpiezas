import { createConnection } from "mysql2/promise";

const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "boutique_pos",
};

async function initializeBranchInventory() {
  const connection = await createConnection(config);

  try {
    console.log("🔄 Inicializando inventario de variantes en todas las sucursales...");

    // Get all product variants that don't have branch inventory yet
    const [variants] = await connection.query(`
      SELECT pv.id, pv.stock
      FROM productVariants pv
      WHERE pv.id NOT IN (
        SELECT DISTINCT productVariantId FROM branchInventory
      )
    `);

    if (variants.length === 0) {
      console.log("✅ Todas las variantes ya tienen inventario asignado.");
      await connection.end();
      return;
    }

    console.log(`📦 Encontradas ${variants.length} variantes sin inventario.`);

    // Get all branches
    const [branches] = await connection.query("SELECT id FROM branches");

    if (branches.length === 0) {
      console.log("⚠️  No hay sucursales creadas.");
      await connection.end();
      return;
    }

    console.log(`🏪 Asignando inventario a ${branches.length} sucursales...`);

    // For each variant, create inventory records for all branches
    let totalRecords = 0;
    for (const variant of variants) {
      const records = branches.map((branch) => [
        branch.id,
        variant.id,
        variant.stock,
        5, // minimumStock
        new Date(),
        new Date(),
      ]);

      await connection.query(
        `INSERT INTO branchInventory (branchId, productVariantId, stock, minimumStock, createdAt, updatedAt)
         VALUES ?`,
        [records]
      );

      totalRecords += records.length;
      console.log(`✓ Variante ${variant.id}: ${records.length} registros de inventario creados`);
    }

    console.log(`\n✅ Inicialización completada: ${totalRecords} registros de inventario creados.`);
  } catch (error) {
    console.error("❌ Error durante la inicialización:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initializeBranchInventory();
