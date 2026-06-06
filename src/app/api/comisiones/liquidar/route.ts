import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  commissionPlans,
  commissionPlanModelRates,
  commissionRules,
  commissionBonusRules,
  commissionFinanceRules,
  commissionLiquidations,
  commissionLiquidationLines,
  commissionLiquidationLineItems,
  expedientes,
  usuarios
} from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado. Se requieren permisos de administrador." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const lineIdStr = searchParams.get("lineId");

    if (!lineIdStr) {
      return NextResponse.json({ message: "Falta el ID de la línea de liquidación" }, { status: 400 });
    }

    const lineId = Number(lineIdStr);

    const items = await db.query.commissionLiquidationLineItems.findMany({
      where: eq(commissionLiquidationLineItems.id_line, lineId)
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error("Error al obtener detalles de la línea:", error);
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
    const { id_plan } = body;

    if (!id_plan) {
      return NextResponse.json({ message: "Falta el ID del plan de comisión" }, { status: 400 });
    }

    const planId = Number(id_plan);

    // 1. Obtener datos del plan
    const plan = await db.query.commissionPlans.findFirst({
      where: eq(commissionPlans.id_plan, planId),
      with: {
        rates: true,
        rules: true,
        bonusRules: true,
        financeRules: true,
        liquidations: true
      }
    });

    if (!plan) {
      return NextResponse.json({ message: "Plan no encontrado" }, { status: 404 });
    }

    if (plan.estado === "cerrado") {
      return NextResponse.json({ message: "El plan ya está cerrado y su liquidación no puede ser modificada" }, { status: 400 });
    }

    const startDate = plan.fecha_inicio;
    const endDate = plan.fecha_fin;
    const X = plan.objetivo_base + plan.arrastre;

    // 2. Limpiar liquidaciones previas en borrador
    const existingLiq = plan.liquidations?.[0];
    if (existingLiq) {
      await db.delete(commissionLiquidations).where(eq(commissionLiquidations.id_liquidation, existingLiq.id_liquidation));
    }

    // 3. Consultar todos los expedientes de la BD con relaciones
    const allExpedientes = await db.query.expedientes.findMany({
      with: {
        usuario: true,
        cliente: true,
        tipoDeVenta: true,
        estadoVehiculo: true,
        modelo: {
          with: {
            marca: true
          }
        }
      }
    });

    // 4. Filtrar expedientes que cualifiquen por fechas de Pedido, Afectación o Matriculación
    const qualExpedientes = allExpedientes.filter((exp) => {
      const pedidoIn = exp.fecha_expediente && exp.fecha_expediente >= startDate && exp.fecha_expediente <= endDate;
      const afectacionIn = exp.fecha_afectacion && exp.fecha_afectacion >= startDate && exp.fecha_afectacion <= endDate;
      const matriculacionIn = exp.fecha_matriculacion && exp.fecha_matriculacion >= startDate && exp.fecha_matriculacion <= endDate;
      return pedidoIn || afectacionIn || matriculacionIn;
    });

    // 5. Agrupar expedientes por vendedor (id_usuario) para calcular tramos individuales
    const expedientesByVendedor: Record<number, typeof qualExpedientes> = {};
    qualExpedientes.forEach((exp) => {
      const idVendedor = exp.id_usuario;
      if (idVendedor) {
        if (!expedientesByVendedor[idVendedor]) {
          expedientesByVendedor[idVendedor] = [];
        }
        expedientesByVendedor[idVendedor].push(exp);
      }
    });

    // Estructuras para acumular los resultados calculados
    const linesToInsert: any[] = [];
    const lineItemsToInsertMap: Record<string, any[]> = {}; // mapea por index temporal de la línea

    let totalLiquidacionGlobal = 0;
    let indexLineaTemp = 0;

    // 6. Realizar cálculos para cada vendedor
    for (const [idVendedorStr, vendedorExps] of Object.entries(expedientesByVendedor)) {
      const idVendedor = Number(idVendedorStr);
      
      // Contar unidades computables para objetivo del vendedor
      let totalComputablesVendedor = 0;
      let matriculacionesRealesVendedor = 0;

      // Calcular unidades de objetivo del vendedor en primera pasada
      const expsCalculadosVendedor = vendedorExps.map((exp) => {
        const entraPedido = exp.fecha_expediente && exp.fecha_expediente >= startDate && exp.fecha_expediente <= endDate;
        const entraAfectacion = exp.fecha_afectacion && exp.fecha_afectacion >= startDate && exp.fecha_afectacion <= endDate;
        const entraMatriculacion = exp.fecha_matriculacion && exp.fecha_matriculacion >= startDate && exp.fecha_matriculacion <= endDate;

        if (entraMatriculacion) {
          matriculacionesRealesVendedor++;
        }

        let objValorExpediente = 0;
        const itemsDetalle: { concepto: string; importe: number; afecta_objetivo: boolean; valor_objetivo: number }[] = [];

        // A. Cómputo por tarifa del modelo
        const modelRate = plan.rates.find(r => r.id_modelo === exp.id_modelo && r.activo);
        if (modelRate && entraMatriculacion) {
          objValorExpediente += modelRate.valor_objetivo;
          itemsDetalle.push({
            concepto: `Cómputo Base Modelo (${exp.modelo?.nombre_modelo})`,
            importe: 0,
            afecta_objetivo: true,
            valor_objetivo: modelRate.valor_objetivo
          });
        }

        // B. Cómputo por reglas generales
        plan.rules.forEach((rule) => {
          if (!rule.activa) return;

          // Verificar si coincide el evento y los filtros
          const eventMatches = 
            (rule.tipo_evento === "pedido" && entraPedido) ||
            (rule.tipo_evento === "afectacion" && entraAfectacion) ||
            (rule.tipo_evento === "matriculacion" && entraMatriculacion) ||
            (rule.tipo_evento === "financiacion" && entraMatriculacion && exp.id_tipo_de_venta) ||
            (rule.tipo_evento === "preference" && entraMatriculacion && exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() === "preference");

          if (!eventMatches) return;

          const filterMarcaMatches = !rule.id_marca || exp.modelo?.marca_id === rule.id_marca;
          const filterModeloMatches = !rule.id_modelo || exp.id_modelo === rule.id_modelo;

          if (filterMarcaMatches && filterModeloMatches) {
            if (rule.afecta_objetivo) {
              objValorExpediente += rule.valor_objetivo;
              itemsDetalle.push({
                concepto: `Regla: ${rule.nombre}`,
                importe: 0,
                afecta_objetivo: true,
                valor_objetivo: rule.valor_objetivo
              });
            }
          }
        });

        // C. Cómputo por bonus personalizados
        plan.bonusRules.forEach((bonus) => {
          if (!bonus.activo) return;

          const eventMatches = 
            (bonus.tipo_evento === "pedido" && entraPedido) ||
            (bonus.tipo_evento === "afectacion" && entraAfectacion) ||
            (bonus.tipo_evento === "matriculacion" && entraMatriculacion) ||
            (bonus.tipo_evento === "financiacion" && entraMatriculacion && exp.id_tipo_de_venta) ||
            (bonus.tipo_evento === "preference" && entraMatriculacion && exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() === "preference");

          if (!eventMatches) return;

          // Filtro de fechas específicas del bonus
          if (bonus.fecha_inicio && exp.fecha_expediente && exp.fecha_expediente < bonus.fecha_inicio) return;
          if (bonus.fecha_fin && exp.fecha_expediente && exp.fecha_expediente > bonus.fecha_fin) return;

          const filterMarcaMatches = !bonus.id_marca || exp.modelo?.marca_id === bonus.id_marca;
          const filterModeloMatches = !bonus.id_modelo || exp.id_modelo === bonus.id_modelo;

          if (filterMarcaMatches && filterModeloMatches) {
            if (bonus.afecta_objetivo) {
              objValorExpediente += bonus.valor_objetivo;
              itemsDetalle.push({
                concepto: `Bonus: ${bonus.nombre}`,
                importe: 0,
                afecta_objetivo: true,
                valor_objetivo: bonus.valor_objetivo
              });
            }
          }
        });

        totalComputablesVendedor += objValorExpediente;

        return {
          exp,
          entraPedido,
          entraAfectacion,
          entraMatriculacion,
          valorObjetivoCalculado: objValorExpediente,
          itemsDetalleInitial: itemsDetalle
        };
      });

      // Determinar tramo del vendedor (basado en X y totalComputablesVendedor)
      let tramoAlcanzado: "X-3" | "X-2" | "X-1" | "X" | "X+1" | "X+2" = "X-3";
      
      const diff = totalComputablesVendedor - X;
      if (diff >= 2) tramoAlcanzado = "X+2";
      else if (diff === 1) tramoAlcanzado = "X+1";
      else if (diff === 0) tramoAlcanzado = "X";
      else if (diff === -1) tramoAlcanzado = "X-1";
      else if (diff === -2) tramoAlcanzado = "X-2";
      else tramoAlcanzado = "X-3";

      // Verificar si el vendedor cumple el mínimo de matriculaciones reales configurado
      const cumpleMinimo = matriculacionesRealesVendedor >= plan.min_matriculaciones;

      // Calcular comisiones económicas para cada expediente
      expsCalculadosVendedor.forEach(({ exp, entraPedido, entraAfectacion, entraMatriculacion, valorObjetivoCalculado, itemsDetalleInitial }) => {
        let comisionBase = 0;
        let comisionFinanciacion = 0;
        let comisionPreference = 0;
        let bonusAcumulado = 0;

        const finalItems = [...itemsDetalleInitial];

        // 1. Comisión Base por modelo (si está matriculado)
        if (entraMatriculacion) {
          const modelRate = plan.rates.find(r => r.id_modelo === exp.id_modelo && r.activo);
          if (modelRate) {
            let rateImporte = modelRate.rate_x_minus_3; // valor por defecto
            if (tramoAlcanzado === "X-2") rateImporte = modelRate.rate_x_minus_2;
            else if (tramoAlcanzado === "X-1") rateImporte = modelRate.rate_x_minus_1;
            else if (tramoAlcanzado === "X") rateImporte = modelRate.rate_x;
            else if (tramoAlcanzado === "X+1") rateImporte = modelRate.rate_x_plus_1;
            else if (tramoAlcanzado === "X+2") rateImporte = modelRate.rate_x_plus_2;

            comisionBase = rateImporte;
            finalItems.push({
              concepto: `Comisión Base Modelo (${exp.modelo?.nombre_modelo}) - Tramo ${tramoAlcanzado}`,
              importe: rateImporte,
              afecta_objetivo: false,
              valor_objetivo: 0
            });
          }
        }

        // 2. Comisión por Financiación / Preference (si está matriculado y financiado)
        if (entraMatriculacion && exp.id_tipo_de_venta && plan.financeRules) {
          const nombreTipoVenta = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
          
          if (nombreTipoVenta === "preference") {
            comisionPreference = plan.financeRules.importe_preference;
            finalItems.push({
              concepto: "Incentivo Financiación Preference",
              importe: plan.financeRules.importe_preference,
              afecta_objetivo: false,
              valor_objetivo: 0
            });
          } else if (nombreTipoVenta === "financiado" || nombreTipoVenta === "renting") {
            comisionFinanciacion = plan.financeRules.importe_normal;
            finalItems.push({
              concepto: `Incentivo Financiación Normal (${exp.tipoDeVenta?.nombre_tipo_venta})`,
              importe: plan.financeRules.importe_normal,
              afecta_objetivo: false,
              valor_objetivo: 0
            });
          }
        }

        // 3. Evaluar reglas generales de comisión (para dinero)
        plan.rules.forEach((rule) => {
          if (!rule.activa || !rule.afecta_comision) return;

          const eventMatches = 
            (rule.tipo_evento === "pedido" && entraPedido) ||
            (rule.tipo_evento === "afectacion" && entraAfectacion) ||
            (rule.tipo_evento === "matriculacion" && entraMatriculacion);

          if (!eventMatches) return;

          const filterMarcaMatches = !rule.id_marca || exp.modelo?.marca_id === rule.id_marca;
          const filterModeloMatches = !rule.id_modelo || exp.id_modelo === rule.id_modelo;

          if (filterMarcaMatches && filterModeloMatches) {
            bonusAcumulado += rule.importe;
            finalItems.push({
              concepto: `Regla de Comisión: ${rule.nombre}`,
              importe: rule.importe,
              afecta_objetivo: false,
              valor_objetivo: 0
            });
          }
        });

        // 4. Evaluar bonus personalizados (para dinero)
        plan.bonusRules.forEach((bonus) => {
          if (!bonus.activo || bonus.importe <= 0) return;

          const eventMatches = 
            (bonus.tipo_evento === "pedido" && entraPedido) ||
            (bonus.tipo_evento === "afectacion" && entraAfectacion) ||
            (bonus.tipo_evento === "matriculacion" && entraMatriculacion);

          if (!eventMatches) return;

          if (bonus.fecha_inicio && exp.fecha_expediente && exp.fecha_expediente < bonus.fecha_inicio) return;
          if (bonus.fecha_fin && exp.fecha_expediente && exp.fecha_expediente > bonus.fecha_fin) return;

          const filterMarcaMatches = !bonus.id_marca || exp.modelo?.marca_id === bonus.id_marca;
          const filterModeloMatches = !bonus.id_modelo || exp.id_modelo === bonus.id_modelo;

          if (filterMarcaMatches && filterModeloMatches) {
            bonusAcumulado += bonus.importe;
            finalItems.push({
              concepto: `Bonus Campaña: ${bonus.nombre}`,
              importe: bonus.importe,
              afecta_objetivo: false,
              valor_objetivo: 0
            });
          }
        });

        // Sumar todos los componentes para calcular la comisión económica teórica
        const totalTeoricoExpediente = comisionBase + comisionFinanciacion + comisionPreference + bonusAcumulado;

        // Si no se cumple con el mínimo de matriculaciones reales del periodo, se penaliza a 0 la comisión final.
        // Pero se conserva el desglose e ítems para auditoría y visualización de lo que habría cobrado.
        const totalGeneradoFinal = cumpleMinimo ? totalTeoricoExpediente : 0;
        
        totalLiquidacionGlobal += totalGeneradoFinal;

        // Determinar mes de generación y mes de pago (siguiente mes)
        // Usamos la fecha de matriculación si existe, de afectación o de expediente.
        const referenceDateStr = exp.fecha_matriculacion || exp.fecha_afectacion || exp.fecha_expediente || startDate;
        const refDate = new Date(referenceDateStr);
        
        const mesGeneracion = refDate.toLocaleString("es-ES", { month: "long", year: "numeric" });
        
        // Calcular mes de pago sumando 1 mes
        const payDate = new Date(refDate);
        payDate.setMonth(payDate.getMonth() + 1);
        const mesPagoEstimado = payDate.toLocaleString("es-ES", { month: "long", year: "numeric" });

        // Guardar la línea de liquidación temporalmente
        const lineKey = `line_${indexLineaTemp++}`;
        linesToInsert.push({
          id_expediente: exp.id_expediente,
          vendedor_nombre: exp.usuario?.nombre || "Desconocido",
          cliente_nombre: exp.cliente?.nombre || "Sin Cliente",
          marca_nombre: exp.modelo?.marca?.nombre || "VO",
          modelo_nombre: exp.modelo?.nombre_modelo || "Sin Modelo",
          fecha_pedido: exp.fecha_expediente,
          fecha_afectacion: exp.fecha_afectacion,
          fecha_matriculacion: exp.fecha_matriculacion,
          entra_por_pedido: !!entraPedido,
          entra_por_afectacion: !!entraAfectacion,
          entra_por_matriculacion: !!entraMatriculacion,
          valor_para_objetivo: valorObjetivoCalculado,
          comision_base: comisionBase,
          comision_financiacion: comisionFinanciacion,
          comision_preference: comisionPreference,
          bonus_acumulado: bonusAcumulado,
          total_generado: totalGeneradoFinal,
          mes_generacion: mesGeneracion,
          mes_pago_estimado: mesPagoEstimado,
          // Valores de control para mostrar en la fila del listado
          tramo_vendedor: tramoAlcanzado,
          computables_vendedor: totalComputablesVendedor,
          matriculaciones_vendedor: matriculacionesRealesVendedor,
          cumple_minimo_vendedor: cumpleMinimo
        });

        lineItemsToInsertMap[lineKey] = finalItems;
      });
    }

    // Determinar tramo global (el tramo predominante, o el del primer vendedor,
    // para rellenar la cabecera de la liquidación global, o simplemente ponemos "Calculado")
    let tramoPredominante = "X-3";
    if (linesToInsert.length > 0) {
      tramoPredominante = linesToInsert[0].tramo_vendedor;
    }

    // A. Insertar cabecera de liquidación
    const [insertedLiq] = await db.insert(commissionLiquidations).values({
      id_plan: planId,
      estado: "calculada",
      fecha_calculo: new Date().toISOString().split("T")[0],
      objetivo_base_snapshot: plan.objetivo_base,
      arrastre_snapshot: plan.arrastre,
      x_calculado_snapshot: X,
      total_computables_snapshot: linesToInsert.reduce((sum, l) => sum + l.valor_para_objetivo, 0),
      tramo_alcanzado_snapshot: tramoPredominante,
      matriculaciones_reales_snapshot: linesToInsert.filter(l => l.entra_por_matriculacion).length,
      cumple_minimo_snapshot: linesToInsert.every(l => l.cumple_minimo_vendedor),
      total_comision_economica: totalLiquidacionGlobal,
    }).returning();

    const newLiquidationId = insertedLiq.id_liquidation;

    // B. Insertar líneas e ítems de desglose
    for (let i = 0; i < linesToInsert.length; i++) {
      const lineData = linesToInsert[i];
      
      const [insertedLine] = await db.insert(commissionLiquidationLines).values({
        id_liquidation: newLiquidationId,
        id_expediente: lineData.id_expediente,
        vendedor_nombre: lineData.vendedor_nombre,
        cliente_nombre: lineData.cliente_nombre,
        marca_nombre: lineData.marca_nombre,
        modelo_nombre: lineData.modelo_nombre,
        fecha_pedido: lineData.fecha_pedido,
        fecha_afectacion: lineData.fecha_afectacion,
        fecha_matriculacion: lineData.fecha_matriculacion,
        entra_por_pedido: lineData.entra_por_pedido,
        entra_por_afectacion: lineData.entra_por_afectacion,
        entra_por_matriculacion: lineData.entra_por_matriculacion,
        valor_para_objetivo: lineData.valor_para_objetivo,
        comision_base: lineData.comision_base,
        comision_financiacion: lineData.comision_financiacion,
        comision_preference: lineData.comision_preference,
        bonus_acumulado: lineData.bonus_acumulado,
        total_generado: lineData.total_generado,
        mes_generacion: lineData.mes_generacion,
        mes_pago_estimado: lineData.mes_pago_estimado,
      }).returning();

      const lineKey = `line_${i}`;
      const items = lineItemsToInsertMap[lineKey] || [];
      
      if (items.length > 0) {
        await db.insert(commissionLiquidationLineItems).values(
          items.map(it => ({
            id_line: insertedLine.id_line,
            concepto: it.concepto,
            importe: it.importe,
            afecta_objetivo: it.afecta_objetivo,
            valor_objetivo: it.valor_objetivo
          }))
        );
      }
    }

    return NextResponse.json({ success: true, message: "Liquidación calculada con éxito" });
  } catch (error: any) {
    console.error("Error al calcular liquidación de comisiones:", error);
    return NextResponse.json({ message: error.message || "Error interno al liquidar" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado. Se requieren permisos de administrador." }, { status: 403 });
    }

    const body = await req.json();
    const { id_plan, estado_plan, id_liquidation, estado_liquidation } = body;

    if (!id_plan) {
      return NextResponse.json({ message: "Falta el ID del plan de comisión" }, { status: 400 });
    }

    // Actualizar estado del plan (borrador, activo, cerrado)
    if (estado_plan !== undefined) {
      await db.update(commissionPlans).set({
        estado: estado_plan
      }).where(eq(commissionPlans.id_plan, Number(id_plan)));
    }

    // Actualizar estado de la liquidación
    if (id_liquidation !== undefined && estado_liquidation !== undefined) {
      await db.update(commissionLiquidations).set({
        estado: estado_liquidation
      }).where(eq(commissionLiquidations.id_liquidation, Number(id_liquidation)));
    }

    return NextResponse.json({ success: true, message: "Estado de liquidación actualizado correctamente" });
  } catch (error: any) {
    console.error("Error al cambiar estado de liquidación:", error);
    return NextResponse.json({ message: error.message || "Error interno" }, { status: 500 });
  }
}
