import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sql, eq } from "drizzle-orm";
import {
  tiendas,
  usuarios,
  usuariosTiendas,
  emailsUsuarios,
  telefonosUsuarios,
  clientes,
  emailsClientes,
  telefonosClientes,
  marcas,
  modelos,
  tipoDeVenta,
  estadoVehiculo,
  expedientes,
  commissionPlans,
  commissionPlanModelRates,
  commissionRules,
  commissionBonusRules,
  commissionFinanceRules,
  commissionUsedRates,
  commissionFinanceRates,
  commissionPreferenceRules,
  commissionVoPatterns,
  commissionBrandInterventionRates,
  commissionLiquidations,
  commissionLiquidationLines,
  commissionLiquidationLineItems
} from "@/db/schema";

const tablesMap = [
  { key: "tiendas", schema: tiendas, name: "tiendas" },
  { key: "usuarios", schema: usuarios, name: "usuarios" },
  { key: "usuariosTiendas", schema: usuariosTiendas, name: "usuarios_tiendas" },
  { key: "emailsUsuarios", schema: emailsUsuarios, name: "emails_usuarios" },
  { key: "telefonosUsuarios", schema: telefonosUsuarios, name: "telefonos_usuarios" },
  { key: "clientes", schema: clientes, name: "clientes" },
  { key: "emailsClientes", schema: emailsClientes, name: "emails_clientes" },
  { key: "telefonosClientes", schema: telefonosClientes, name: "telefonos_clientes" },
  { key: "marcas", schema: marcas, name: "marcas" },
  { key: "modelos", schema: modelos, name: "modelos" },
  { key: "tipoDeVenta", schema: tipoDeVenta, name: "tipo_de_venta" },
  { key: "estadoVehiculo", schema: estadoVehiculo, name: "estado_vehiculo" },
  { key: "expedientes", schema: expedientes, name: "expedientes" },
  { key: "commissionPlans", schema: commissionPlans, name: "commission_plans" },
  { key: "commissionPlanModelRates", schema: commissionPlanModelRates, name: "commission_plan_model_rates" },
  { key: "commissionRules", schema: commissionRules, name: "commission_rules" },
  { key: "commissionBonusRules", schema: commissionBonusRules, name: "commission_bonus_rules" },
  { key: "commissionFinanceRules", schema: commissionFinanceRules, name: "commission_finance_rules" },
  { key: "commissionUsedRates", schema: commissionUsedRates, name: "commission_used_rates" },
  { key: "commissionFinanceRates", schema: commissionFinanceRates, name: "commission_finance_rates" },
  { key: "commissionPreferenceRules", schema: commissionPreferenceRules, name: "commission_preference_rules" },
  { key: "commissionVoPatterns", schema: commissionVoPatterns, name: "commission_vo_patterns" },
  { key: "commissionBrandInterventionRates", schema: commissionBrandInterventionRates, name: "commission_brand_intervention_rates" },
  { key: "commissionLiquidations", schema: commissionLiquidations, name: "commission_liquidations" },
  { key: "commissionLiquidationLines", schema: commissionLiquidationLines, name: "commission_liquidation_lines" },
  { key: "commissionLiquidationLineItems", schema: commissionLiquidationLineItems, name: "commission_liquidation_line_items" }
];

const sequenceMap = [
  { table: 'tiendas', pk: 'id_tienda' },
  { table: 'usuarios', pk: 'id_usuario' },
  { table: 'usuarios_tiendas', pk: 'id_usuario_tienda' },
  { table: 'emails_usuarios', pk: 'id_email_usuario' },
  { table: 'telefonos_usuarios', pk: 'id_telefono_usuario' },
  { table: 'clientes', pk: 'id' },
  { table: 'emails_clientes', pk: 'id_email_cliente' },
  { table: 'telefonos_clientes', pk: 'id_telefono_cliente' },
  { table: 'marcas', pk: 'id_marca' },
  { table: 'modelos', pk: 'id_modelo' },
  { table: 'tipo_de_venta', pk: 'id_tipo_de_venta' },
  { table: 'estado_vehiculo', pk: 'id_estado_vehiculo' },
  { table: 'expedientes', pk: 'id_expediente' },
  { table: 'commission_plans', pk: 'id_plan' },
  { table: 'commission_plan_model_rates', pk: 'id_rate' },
  { table: 'commission_rules', pk: 'id_rule' },
  { table: 'commission_bonus_rules', pk: 'id_bonus_rule' },
  { table: 'commission_finance_rules', pk: 'id_finance_rule' },
  { table: 'commission_used_rates', pk: 'id_used_rate' },
  { table: 'commission_finance_rates', pk: 'id_finance_rate' },
  { table: 'commission_preference_rules', pk: 'id_pref_rule' },
  { table: 'commission_vo_patterns', pk: 'id_vo_pattern' },
  { table: 'commission_brand_intervention_rates', pk: 'id_rate' },
  { table: 'commission_liquidations', pk: 'id_liquidation' },
  { table: 'commission_liquidation_lines', pk: 'id_line' },
  { table: 'commission_liquidation_line_items', pk: 'id_item' }
];

async function checkAdmin() {
  const { userId } = await auth();
  if (!userId) return null;

  return await db.query.usuarios.findFirst({
    where: eq(usuarios.clerk_id, userId)
  });
}

export async function GET() {
  try {
    const admin = await checkAdmin();
    if (!admin || admin.rol !== "administrador") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const backupData: Record<string, any[]> = {};

    // Export all tables
    for (const table of tablesMap) {
      backupData[table.key] = await db.select().from(table.schema);
    }

    return NextResponse.json({
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: backupData
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error generating backup:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin || admin.rol !== "administrador") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { version, data } = body;

    if (version !== "1.0" || !data) {
      return NextResponse.json({ message: "Formato de backup inválido" }, { status: 400 });
    }

    // 1. Delete all tables in reverse order to avoid FK constraint violations
    const reversedTables = [...tablesMap].reverse();
    for (const table of reversedTables) {
      await db.delete(table.schema);
    }

    // 2. Insert all tables in forward order of dependencies
    for (const table of tablesMap) {
      const rows = data[table.key];
      if (rows && rows.length > 0) {
        await db.insert(table.schema).values(rows);
      }
    }

    // 3. Reset all auto-increment sequences
    for (const seq of sequenceMap) {
      await db.execute(sql.raw(`
        SELECT setval(
          pg_get_serial_sequence('${seq.table}', '${seq.pk}'),
          COALESCE((SELECT MAX(${seq.pk}) FROM ${seq.table}), 1),
          false
        );
      `));
    }

    return NextResponse.json({
      success: true,
      message: "Copia de seguridad restaurada correctamente y secuencias de base de datos reiniciadas."
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error restoring backup:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
