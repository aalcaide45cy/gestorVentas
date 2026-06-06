import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  commissionPlans,
  commissionPlanModelRates,
  commissionRules,
  commissionBonusRules,
  commissionFinanceRules,
  modelos,
  usuarios
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Ayudante para verificar autorización de Administrador
async function checkAdminAuth() {
  const { userId } = await auth();
  if (!userId) return null;

  const localUser = await db.query.usuarios.findFirst({
    where: eq(usuarios.clerk_id, userId),
  });

  if (!localUser || localUser.rol !== "administrador") {
    return null;
  }
  return localUser;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      // Obtener un plan específico con todas sus configuraciones
      const plan = await db.query.commissionPlans.findFirst({
        where: eq(commissionPlans.id_plan, Number(id)),
        with: {
          rates: {
            with: {
              modelo: {
                with: {
                  marca: true
                }
              }
            }
          },
          rules: {
            with: {
              marca: true,
              modelo: true
            }
          },
          bonusRules: {
            with: {
              marca: true,
              modelo: true
            }
          },
          financeRules: true,
          liquidations: {
            with: {
              lines: true
            }
          }
        }
      });

      if (!plan) {
        return NextResponse.json({ message: "Plan no encontrado" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: plan });
    }

    // Listar todos los planes
    const planes = await db.query.commissionPlans.findMany({
      orderBy: [desc(commissionPlans.fecha_inicio)],
      with: {
        liquidations: true
      }
    });

    return NextResponse.json({ success: true, data: planes });
  } catch (error: any) {
    console.error("Error al obtener planes de comisión:", error);
    return NextResponse.json({ message: error.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado. Se requieren permisos de administrador." }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, fecha_inicio, fecha_fin, objetivo_base, arrastre, min_matriculaciones, cloneFromId } = body;

    if (!nombre || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ message: "Faltan datos obligatorios (nombre, fecha de inicio y fin)" }, { status: 400 });
    }

    let nuevoPlanId: number;

    if (cloneFromId) {
      // --- PROCESO DE CLONADO EN TRANSACCIÓN ---
      const sourcePlanId = Number(cloneFromId);
      
      const result = await db.transaction(async (tx) => {
        // 1. Insertar el nuevo plan copiando campos básicos
        const [insertedPlan] = await tx.insert(commissionPlans).values({
          nombre,
          fecha_inicio,
          fecha_fin,
          objetivo_base: objetivo_base !== undefined ? Number(objetivo_base) : 0,
          arrastre: arrastre !== undefined ? Number(arrastre) : 0,
          min_matriculaciones: min_matriculaciones !== undefined ? Number(min_matriculaciones) : 6,
          estado: "borrador",
        }).returning();

        const newId = insertedPlan.id_plan;

        // 2. Clonar tarifas de modelos (rates)
        const sourceRates = await tx.query.commissionPlanModelRates.findMany({
          where: eq(commissionPlanModelRates.id_plan, sourcePlanId)
        });
        if (sourceRates.length > 0) {
          await tx.insert(commissionPlanModelRates).values(
            sourceRates.map(r => ({
              id_plan: newId,
              id_modelo: r.id_modelo,
              rate_x_minus_3: r.rate_x_minus_3,
              rate_x_minus_2: r.rate_x_minus_2,
              rate_x_minus_1: r.rate_x_minus_1,
              rate_x: r.rate_x,
              rate_x_plus_1: r.rate_x_plus_1,
              rate_x_plus_2: r.rate_x_plus_2,
              valor_objetivo: r.valor_objetivo,
              activo: r.activo,
            }))
          );
        }

        // 3. Clonar reglas generales (rules)
        const sourceRules = await tx.query.commissionRules.findMany({
          where: eq(commissionRules.id_plan, sourcePlanId)
        });
        if (sourceRules.length > 0) {
          await tx.insert(commissionRules).values(
            sourceRules.map(r => ({
              id_plan: newId,
              nombre: r.nombre,
              tipo_evento: r.tipo_evento,
              id_marca: r.id_marca,
              id_modelo: r.id_modelo,
              afecta_objetivo: r.afecta_objetivo,
              valor_objetivo: r.valor_objetivo,
              afecta_comision: r.afecta_comision,
              importe: r.importe,
              activa: r.activa,
            }))
          );
        }

        // 4. Clonar reglas de bonus (bonusRules)
        const sourceBonus = await tx.query.commissionBonusRules.findMany({
          where: eq(commissionBonusRules.id_plan, sourcePlanId)
        });
        if (sourceBonus.length > 0) {
          await tx.insert(commissionBonusRules).values(
            sourceBonus.map(b => ({
              id_plan: newId,
              nombre: b.nombre,
              descripcion: b.descripcion,
              tipo_evento: b.tipo_evento,
              id_marca: b.id_marca,
              id_modelo: b.id_modelo,
              importe: b.importe,
              afecta_objetivo: b.afecta_objetivo,
              valor_objetivo: b.valor_objetivo,
              fecha_inicio: b.fecha_inicio,
              fecha_fin: b.fecha_fin,
              activo: b.activo,
            }))
          );
        }

        // 5. Clonar reglas de financiación (financeRules)
        const sourceFinance = await tx.query.commissionFinanceRules.findFirst({
          where: eq(commissionFinanceRules.id_plan, sourcePlanId)
        });
        
        await tx.insert(commissionFinanceRules).values({
          id_plan: newId,
          importe_normal: sourceFinance ? sourceFinance.importe_normal : 0,
          importe_preference: sourceFinance ? sourceFinance.importe_preference : 0,
        });

        return newId;
      });

      nuevoPlanId = result;
    } else {
      // --- CREAR NUEVO PLAN VACÍO CON VALORES POR DEFECTO ---
      const result = await db.transaction(async (tx) => {
        const [insertedPlan] = await tx.insert(commissionPlans).values({
          nombre,
          fecha_inicio,
          fecha_fin,
          objetivo_base: objetivo_base ? Number(objetivo_base) : 12,
          arrastre: arrastre ? Number(arrastre) : 0,
          min_matriculaciones: min_matriculaciones ? Number(min_matriculaciones) : 6,
          estado: "borrador",
        }).returning();

        const newId = insertedPlan.id_plan;

        // Cargar todos los modelos activos del sistema
        const systemModels = await tx.query.modelos.findMany();
        if (systemModels.length > 0) {
          await tx.insert(commissionPlanModelRates).values(
            systemModels.map(m => ({
              id_plan: newId,
              id_modelo: m.id_modelo,
              rate_x_minus_3: 80, // valores semilla razonables
              rate_x_minus_2: 90,
              rate_x_minus_1: 100,
              rate_x: 120,
              rate_x_plus_1: 140,
              rate_x_plus_2: 160,
              valor_objetivo: 1,
              activo: true,
            }))
          );
        }

        // Inicializar regla de financiación vacía
        await tx.insert(commissionFinanceRules).values({
          id_plan: newId,
          importe_normal: 80,
          importe_preference: 120,
        });

        return newId;
      });

      nuevoPlanId = result;
    }

    return NextResponse.json({ success: true, message: "Plan creado con éxito", data: { id_plan: nuevoPlanId } }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear plan de comisión:", error);
    return NextResponse.json({ message: error.message || "Error interno al guardar plan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado. Se requieren permisos de administrador." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id_plan,
      nombre,
      fecha_inicio,
      fecha_fin,
      estado,
      objetivo_base,
      arrastre,
      min_matriculaciones,
      // Actualizaciones anidadas opcionales
      rates,
      financeRules,
      rules,
      bonusRules
    } = body;

    if (!id_plan) {
      return NextResponse.json({ message: "Falta el ID del plan" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // 1. Campos generales del plan
      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (fecha_inicio !== undefined) updateData.fecha_inicio = fecha_inicio;
      if (fecha_fin !== undefined) updateData.fecha_fin = fecha_fin;
      if (estado !== undefined) updateData.estado = estado;
      if (objetivo_base !== undefined) updateData.objetivo_base = Number(objetivo_base);
      if (arrastre !== undefined) updateData.arrastre = Number(arrastre);
      if (min_matriculaciones !== undefined) updateData.min_matriculaciones = Number(min_matriculaciones);

      if (Object.keys(updateData).length > 0) {
        await tx.update(commissionPlans).set(updateData).where(eq(commissionPlans.id_plan, Number(id_plan)));
      }

      // 2. Actualizar tarifas de modelos (rates)
      if (rates && Array.isArray(rates)) {
        for (const r of rates) {
          if (r.id_rate) {
            await tx.update(commissionPlanModelRates).set({
              rate_x_minus_3: Number(r.rate_x_minus_3),
              rate_x_minus_2: Number(r.rate_x_minus_2),
              rate_x_minus_1: Number(r.rate_x_minus_1),
              rate_x: Number(r.rate_x),
              rate_x_plus_1: Number(r.rate_x_plus_1),
              rate_x_plus_2: Number(r.rate_x_plus_2),
              valor_objetivo: Number(r.valor_objetivo),
              activo: r.activo,
            }).where(eq(commissionPlanModelRates.id_rate, Number(r.id_rate)));
          }
        }
      }

      // 3. Actualizar financiación
      if (financeRules) {
        await tx.update(commissionFinanceRules).set({
          importe_normal: Number(financeRules.importe_normal),
          importe_preference: Number(financeRules.importe_preference),
        }).where(eq(commissionFinanceRules.id_plan, Number(id_plan)));
      }

      // 4. Actualizar reglas generales
      if (rules && Array.isArray(rules)) {
        // Eliminar reglas anteriores de este plan para simplificar sincronización
        await tx.delete(commissionRules).where(eq(commissionRules.id_plan, Number(id_plan)));
        // Insertar las reglas vigentes
        const activeRules = rules.filter((r: any) => r.nombre);
        if (activeRules.length > 0) {
          await tx.insert(commissionRules).values(
            activeRules.map((r: any) => ({
              id_plan: Number(id_plan),
              nombre: r.nombre,
              tipo_evento: r.tipo_evento,
              id_marca: r.id_marca ? Number(r.id_marca) : null,
              id_modelo: r.id_modelo ? Number(r.id_modelo) : null,
              afecta_objetivo: !!r.afecta_objetivo,
              valor_objetivo: Number(r.valor_objetivo || 0),
              afecta_comision: !!r.afecta_comision,
              importe: Number(r.importe || 0),
              activa: r.activa !== undefined ? !!r.activa : true,
            }))
          );
        }
      }

      // 5. Actualizar reglas de bonus
      if (bonusRules && Array.isArray(bonusRules)) {
        // Eliminar bonus anteriores
        await tx.delete(commissionBonusRules).where(eq(commissionBonusRules.id_plan, Number(id_plan)));
        // Insertar los bonus vigentes
        const activeBonus = bonusRules.filter((b: any) => b.nombre);
        if (activeBonus.length > 0) {
          await tx.insert(commissionBonusRules).values(
            activeBonus.map((b: any) => ({
              id_plan: Number(id_plan),
              nombre: b.nombre,
              descripcion: b.descripcion || null,
              tipo_evento: b.tipo_evento,
              id_marca: b.id_marca ? Number(b.id_marca) : null,
              id_modelo: b.id_modelo ? Number(b.id_modelo) : null,
              importe: Number(b.importe || 0),
              afecta_objetivo: !!b.afecta_objetivo,
              valor_objetivo: Number(b.valor_objetivo || 0),
              fecha_inicio: b.fecha_inicio || null,
              fecha_fin: b.fecha_fin || null,
              activo: b.activo !== undefined ? !!b.activo : true,
            }))
          );
        }
      }
    });

    return NextResponse.json({ success: true, message: "Plan de comisión actualizado con éxito" });
  } catch (error: any) {
    console.error("Error al actualizar plan de comisión:", error);
    return NextResponse.json({ message: error.message || "Error interno al actualizar plan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado. Se requieren permisos de administrador." }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Falta el ID del plan a eliminar" }, { status: 400 });
    }

    const planId = Number(id);

    // Verificar si el plan está cerrado
    const plan = await db.query.commissionPlans.findFirst({
      where: eq(commissionPlans.id_plan, planId)
    });

    if (!plan) {
      return NextResponse.json({ message: "Plan no encontrado" }, { status: 404 });
    }

    if (plan.estado === "cerrado") {
      return NextResponse.json({ message: "No se puede eliminar un plan cerrado." }, { status: 400 });
    }

    // Ejecutar eliminación en cascada (Drizzle onDelete cascade limpiará rates, rules, bonus, liquidations)
    await db.delete(commissionPlans).where(eq(commissionPlans.id_plan, planId));

    return NextResponse.json({ success: true, message: "Plan de comisionamiento eliminado correctamente" });
  } catch (error: any) {
    console.error("Error al eliminar plan de comisión:", error);
    return NextResponse.json({ message: error.message || "Error interno al eliminar plan" }, { status: 500 });
  }
}
