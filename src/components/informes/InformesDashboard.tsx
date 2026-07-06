"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";

interface Cliente {
  id: number;
  nombre: string | null;
  dni: string | null;
}

interface Marca {
  id_marca: number;
  nombre: string;
}

interface Modelo {
  id_modelo: number;
  nombre_modelo: string;
  marca_id: number | null;
  marca?: Marca | null;
}

interface TipoDeVenta {
  id_tipo_de_venta: number;
  nombre_tipo_venta: string;
}

interface EstadoVehiculo {
  id_estado_vehiculo: number;
  nombre_estado_vehiculo: string;
}

interface Usuario {
  id_usuario: number;
  nombre: string | null;
  rol: string | null;
  tipo_vendedor: string;
  patron_vo: string | null;
}

interface Expediente {
  id_expediente: number;
  id_usuario: number | null;
  id_cliente: number | null;
  id_modelo: number | null;
  id_tienda: number | null;
  fecha_expediente: string | null;
  fecha_afectacion: string | null;
  fecha_matriculacion: string | null;
  fecha_entrega: string | null;
  fecha_rci: string | null;
  fecha_cobrado: string | null;
  cobrado_otra_fecha: boolean | null;
  id_tipo_de_venta: number | null;
  id_estado_vehiculo: number | null;
  valor_objetivo?: number | null;
  min_coches_multiplicador?: number | null;
  comision_coche_real: string | number | null;
  comision_financiacion_real: string | number | null;
  
  cliente?: Cliente | null;
  modelo?: Modelo | null;
  tipoDeVenta?: TipoDeVenta | null;
  estadoVehiculo?: EstadoVehiculo | null;
  usuario?: Usuario | null;
}

interface InformesDashboardProps {
  initialExpedientes: Expediente[];
  initialPlanes: any[];
  marcas: Marca[];
  modelos: Modelo[];
  tiendas: any[];
  usuarios: Usuario[];
  userRole: string;
}

export default function InformesDashboard({
  initialExpedientes,
  initialPlanes,
  marcas,
  modelos,
  tiendas,
  usuarios,
  userRole,
}: InformesDashboardProps) {
  // 1. Estados de Filtros
  const today = new Date();
  const firstDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const [fechaInicio, setFechaInicio] = useState(firstDayStr);
  const [fechaFin, setFechaFin] = useState(lastDayStr);
  const [filterTienda, setFilterTienda] = useState<string>("");
  const [filterVendedor, setFilterVendedor] = useState<string>("");
  const [filterMarca, setFilterMarca] = useState<string>("");
  const [filterVNVO, setFilterVNVO] = useState<string>(""); // VN o VO
  const [filterTipoVenta, setFilterTipoVenta] = useState<string>("");

  // 2. Auxiliares de Fechas
  const getEffectiveMatDate = (e: Expediente) => {
    return e.cobrado_otra_fecha && e.fecha_cobrado ? e.fecha_cobrado : e.fecha_matriculacion;
  };

  const getReferenceDate = (e: Expediente) => {
    const effectiveMat = getEffectiveMatDate(e);
    if (e.fecha_expediente && e.fecha_afectacion) {
      return e.fecha_expediente < e.fecha_afectacion ? e.fecha_expediente : e.fecha_afectacion;
    }
    return e.fecha_expediente || e.fecha_afectacion || effectiveMat || "";
  };

  // 3. Calculadora de Comisiones (Adaptada de ExpedientesList.tsx)
  const calculatedCommissions = useMemo(() => {
    const results: Record<number, {
      baseVN: number;
      baseVO: number;
      financiacion: number;
      preference: number;
      bonus: number;
      penalizaciones: number;
      total: number;
      cumpleMinimo: boolean;
      tramo: string;
      objetivoPuntos: number;
      matriculacionesMes: number;
    }> = {};

    // Agrupar expedientes por plan y vendedor para evaluar tramos y mínimos
    const expsByPlanAndSeller: Record<string, Expediente[]> = {};
    initialExpedientes.forEach((exp) => {
      const refDate = getReferenceDate(exp);
      if (!refDate) return;

      const plan = initialPlanes.find(p => p.fecha_inicio <= refDate && p.fecha_fin >= refDate);
      if (!plan) return;

      const sellerId = exp.usuario?.id_usuario;
      if (!sellerId) return;

      const groupKey = `${plan.id_plan}_${sellerId}`;
      if (!expsByPlanAndSeller[groupKey]) {
        expsByPlanAndSeller[groupKey] = [];
      }
      expsByPlanAndSeller[groupKey].push(exp);
    });

    // Procesar cada grupo para precalcular tramo y cumplimiento de mínimo
    const sellerPlanStats: Record<string, {
      tramo: "X-4" | "X-3" | "X-2" | "X-1" | "X" | "X+1" | "X+2" | "X+3";
      cumpleMinimo: boolean;
      matriculacionesMes: number;
      objetivoPuntos: number;
    }> = {};

    Object.entries(expsByPlanAndSeller).forEach(([groupKey, groupExps]) => {
      const [planIdStr, sellerIdStr] = groupKey.split("_");
      const plan = initialPlanes.find(p => p.id_plan === Number(planIdStr));
      const seller = usuarios.find(u => u.id_usuario === Number(sellerIdStr));
      if (!plan || !seller) return;

      const isWithinPlan = (dateStr: string | null) => {
        if (!dateStr) return false;
        const d = dateStr.substring(0, 10);
        return d >= plan.fecha_inicio && d <= plan.fecha_fin;
      };

      // 1. Contar matriculaciones del mes
      let matriculacionesMes = 0;
      groupExps.forEach((exp) => {
        const matDate = getEffectiveMatDate(exp);
        if (isWithinPlan(matDate)) {
          matriculacionesMes++;
        }
      });

      const cumpleMinimo = matriculacionesMes >= plan.min_matriculaciones;

      // 2. Calcular puntos del objetivo
      let objetivoPuntos = 0;
      groupExps.forEach((exp) => {
        const actDate = getReferenceDate(exp);
        const matDate = getEffectiveMatDate(exp);
        const entraRci = isWithinPlan(exp.fecha_rci);
        const entraPedido = isWithinPlan(exp.fecha_expediente);
        const entraAfectacion = isWithinPlan(exp.fecha_afectacion);

        const isActivityThisMonth = isWithinPlan(actDate);
        const isMatriculadoThisMonth = isWithinPlan(matDate);

        if (!isActivityThisMonth && !isMatriculadoThisMonth) return;

        const saleTypeName = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
        const isCreditoVenta = saleTypeName.includes("crédito") || saleTypeName.includes("credito") || saleTypeName.includes("financiado");
        const isPreferenceVenta = saleTypeName.includes("preference") || saleTypeName.includes("box");

        // Buscar regla de financiación aplicable para obtener puntos de objetivo (se lee de brandInterventionRates o exp.valor_objetivo)
        let originalVal = 1.0;
        if (exp.valor_objetivo !== null && exp.valor_objetivo !== undefined) {
          originalVal = Number(exp.valor_objetivo);
        } else {
          const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
          if (brandId) {
            const brandIntervention = plan.brandInterventionRates?.find((r: any) => r.id_marca === brandId);
            if (brandIntervention && brandIntervention.valor_objetivo_defecto !== undefined && brandIntervention.valor_objetivo_defecto !== null) {
              originalVal = Number(brandIntervention.valor_objetivo_defecto);
            }
          }
        }

        const baseVal = originalVal === 0 ? 1.0 : originalVal;
        let objValorExpediente = baseVal;
        let afectoObjetivo = isActivityThisMonth || isMatriculadoThisMonth;

        let totalObjExp = 0;
        if (afectoObjetivo) {
          totalObjExp = objValorExpediente;
        }

        // Reglas de bonus que afectan al objetivo
        plan.bonusRules?.forEach((bonus: any) => {
          if (!bonus.activo || !bonus.afecta_objetivo) return;
          const eventMatches = 
            (bonus.tipo_evento === "pedido" && entraPedido) ||
            (bonus.tipo_evento === "afectacion" && entraAfectacion) ||
            (bonus.tipo_evento === "matriculacion" && isMatriculadoThisMonth) ||
            ((bonus.tipo_evento === "credito" || bonus.tipo_evento === "financiacion") && entraRci && isCreditoVenta) ||
            (bonus.tipo_evento === "preference" && entraRci && isPreferenceVenta);

          if (!eventMatches) return;

          const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
          const filterMarcaMatches = !bonus.id_marca || brandId === bonus.id_marca;
          const filterModeloMatches = !bonus.id_modelo || exp.id_modelo === bonus.id_modelo;

          if (filterMarcaMatches && filterModeloMatches) {
            totalObjExp += Number(bonus.valor_objetivo || 0);
          }
        });

        objetivoPuntos += totalObjExp;
      });

      // 3. Determinar tramo
      let tramo: "X-4" | "X-3" | "X-2" | "X-1" | "X" | "X+1" | "X+2" | "X+3" = "X-4";
      const X_val = plan.objetivo_base + plan.arrastre;
      const diff = objetivoPuntos - X_val;
      if (diff >= 3) tramo = "X+3";
      else if (diff === 2) tramo = "X+2";
      else if (diff === 1) tramo = "X+1";
      else if (diff === 0) tramo = "X";
      else if (diff === -1) tramo = "X-1";
      else if (diff === -2) tramo = "X-2";
      else if (diff === -3) tramo = "X-3";
      else tramo = "X-4";

      sellerPlanStats[groupKey] = { tramo, cumpleMinimo, matriculacionesMes, objetivoPuntos };
    });

    // Calcular importes para cada expediente basándose en tramos y mínimos
    initialExpedientes.forEach((exp) => {
      const refDate = getReferenceDate(exp);
      if (!refDate) return;

      const plan = initialPlanes.find(p => p.fecha_inicio <= refDate && p.fecha_fin >= refDate);
      if (!plan) {
        // Sin plan activo, comisiones a 0
        results[exp.id_expediente] = {
          baseVN: 0, baseVO: 0, financiacion: 0, preference: 0, bonus: 0, penalizaciones: 0, total: 0,
          cumpleMinimo: false, tramo: "N/A", objetivoPuntos: 0, matriculacionesMes: 0
        };
        return;
      }

      const sellerId = exp.usuario?.id_usuario;
      if (!sellerId) return;

      const groupKey = `${plan.id_plan}_${sellerId}`;
      const stats = sellerPlanStats[groupKey] || { tramo: "X-4", cumpleMinimo: false, matriculacionesMes: 0, objetivoPuntos: 0 };

      const isWithinPlan = (dateStr: string | null) => {
        if (!dateStr) return false;
        return dateStr.substring(0, 10) >= plan.fecha_inicio && dateStr.substring(0, 10) <= plan.fecha_fin;
      };

      const matDate = getEffectiveMatDate(exp);
      const isMatriculadoThisMonth = isWithinPlan(matDate);
      const entraRci = isWithinPlan(exp.fecha_rci);
      const entraPedido = isWithinPlan(exp.fecha_expediente);
      const entraAfectacion = isWithinPlan(exp.fecha_afectacion);

      const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const isVN = stateName === "nuevo" || stateName === "demo";

      const saleTypeName = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
      const isCreditoVenta = saleTypeName.includes("crédito") || saleTypeName.includes("credito") || saleTypeName.includes("financiado");
      const isPreferenceVenta = saleTypeName.includes("preference") || saleTypeName.includes("box");

      let baseVN = 0;
      let baseVO = 0;
      let baseFinan = 0;
      let basePref = 0;
      let rulesBonus = 0;
      let rulesPenal = 0;

      // 1. Comisión base VN/VO (por matriculación)
      if (isMatriculadoThisMonth) {
        const hasCocheOverride = exp.comision_coche_real !== null && exp.comision_coche_real !== undefined;
        if (hasCocheOverride) {
          if (isVN) baseVN = Number(exp.comision_coche_real);
          else baseVO = Number(exp.comision_coche_real);
        } else {
          if (isVN) {
            // Tarifa VN por tramo
            const modelRate = plan.rates?.find((r: any) => r.id_modelo === exp.id_modelo);
            if (modelRate) {
              let rateImporte = 0;
              if (stats.tramo === "X-3") rateImporte = Number(modelRate.rate_x_minus_3 || 0);
              else if (stats.tramo === "X-2") rateImporte = Number(modelRate.rate_x_minus_2 || 0);
              else if (stats.tramo === "X-1") rateImporte = Number(modelRate.rate_x_minus_1 || 0);
              else if (stats.tramo === "X") rateImporte = Number(modelRate.rate_x || 0);
              else if (stats.tramo === "X+1") rateImporte = Number(modelRate.rate_x_plus_1 || 0);
              else if (stats.tramo === "X+2") rateImporte = Number(modelRate.rate_x_plus_2 || 0);
              else if (stats.tramo === "X+3") rateImporte = Number(modelRate.rate_x_plus_3 || 0);
              else rateImporte = Number(modelRate.rate_x_minus_4 || 0); // X-4 o inferior
              baseVN = rateImporte;
            }
          } else {
            // Tarifa VO según patrón
            const patron = exp.usuario?.patron_vo || "Estándar VO";
            const usedRate = plan.usedRates?.find((r: any) => r.patron_nombre === patron);
            if (usedRate) {
              let tipoUsado = "Usado";
              if (stateName === "km0") tipoUsado = "KM0";
              else if (stateName === "buyback" || stateName === "bb") tipoUsado = "BB";
              else if (stateName === "seminuevo" || stateName === "vo") tipoUsado = "VO";

              if (tipoUsado === "KM0") baseVO = Number(usedRate.comision_km0 || 0);
              else if (tipoUsado === "BB") baseVO = Number(usedRate.comision_buyback || 0);
              else if (tipoUsado === "VO") baseVO = Number(usedRate.comision_vo || 0);
              else baseVO = Number(usedRate.comision_usado || 0);
            }
          }
        }
      }

      // 2. Comisión Financiación (por RCI)
      if (entraRci) {
        const hasFinanOverride = exp.comision_financiacion_real !== null && exp.comision_financiacion_real !== undefined;
        if (hasFinanOverride) {
          baseFinan = Number(exp.comision_financiacion_real);
          basePref = 0;
        } else {
          const isFinancedType = isCreditoVenta || isPreferenceVenta;
          if (isFinancedType && exp.id_tipo_de_venta) {
            let matchedFinanceType = "";
            if (saleTypeName.includes("preference")) matchedFinanceType = "Preference";
            else if (saleTypeName.includes("crédito") || saleTypeName.includes("credito") || saleTypeName.includes("financiado")) matchedFinanceType = "Crédito";
            else if (saleTypeName.includes("renting")) matchedFinanceType = "Renting";
            else if (saleTypeName.includes("contado")) matchedFinanceType = "Contado";

            const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
            if (matchedFinanceType && brandId) {
              const finRate = plan.financeRates?.find(
                (r: any) => r.id_marca === brandId && r.tipo_financiacion === matchedFinanceType
              );
              if (finRate) {
                baseFinan = finRate.importe;
              }
            }
          }

          // Reglas Preference / BOX3
          plan.preferenceRules?.forEach((rule: any) => {
            if (!rule.activa) return;
            const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
            const filterMarcaMatches = !rule.id_marca || brandId === rule.id_marca;
            const filterModeloMatches = !rule.id_modelo || exp.id_modelo === rule.id_modelo;

            let finMatches = true;
            if (rule.tipo_financiacion) {
              const ruleFin = rule.tipo_financiacion.toLowerCase();
              const expFin = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
              finMatches = expFin.includes(ruleFin) || ruleFin.includes(expFin);
            }

            if (filterMarcaMatches && filterModeloMatches && finMatches) {
              basePref += rule.importe;
            }
          });
        }
      }

      // 3. Reglas Generales de Comisión (Bonus/Penalizaciones)
      plan.rules?.forEach((rule: any) => {
        if (!rule.activa || rule.afecta_objetivo) return; // Las que afectan al objetivo van aparte
        const eventMatches = 
          (rule.tipo_evento === "pedido" && entraPedido) ||
          (rule.tipo_evento === "afectacion" && entraAfectacion) ||
          (rule.tipo_evento === "matriculacion" && isMatriculadoThisMonth) ||
          ((rule.tipo_evento === "credito" || rule.tipo_evento === "financiacion") && entraRci && isCreditoVenta) ||
          (rule.tipo_evento === "preference" && entraRci && isPreferenceVenta);

        if (!eventMatches) return;

        const val = Number(rule.importe_comision || 0);
        if (rule.tipo_regla === "bonus") {
          rulesBonus += val;
        } else {
          rulesPenal += val;
        }
      });

      // 4. Reglas de Bonus Personalizadas
      plan.bonusRules?.forEach((bonus: any) => {
        if (!bonus.activo || bonus.afecta_objetivo) return;
        const eventMatches = 
          (bonus.tipo_evento === "pedido" && entraPedido) ||
          (bonus.tipo_evento === "afectacion" && entraAfectacion) ||
          (bonus.tipo_evento === "matriculacion" && isMatriculadoThisMonth) ||
          ((bonus.tipo_evento === "credito" || bonus.tipo_evento === "financiacion") && entraRci && isCreditoVenta) ||
          (bonus.tipo_evento === "preference" && entraRci && isPreferenceVenta);

        if (!eventMatches) return;

        const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
        const filterMarcaMatches = !bonus.id_marca || brandId === bonus.id_marca;
        const filterModeloMatches = !bonus.id_modelo || exp.id_modelo === bonus.id_modelo;

        if (filterMarcaMatches && filterModeloMatches) {
          rulesBonus += Number(bonus.importe_comision || 0);
        }
      });

      // Penalización Fija (si no cumple mínimo de matriculaciones y tiene comisión base VN/VO)
      if (!stats.cumpleMinimo && isMatriculadoThisMonth && (baseVN > 0 || baseVO > 0)) {
        // En nuestro sistema, si no cumple el mínimo, la comisión VN/VO se anula
        baseVN = 0;
        baseVO = 0;
      }

      const total = baseVN + baseVO + baseFinan + basePref + rulesBonus - rulesPenal;

      results[exp.id_expediente] = {
        baseVN,
        baseVO,
        financiacion: baseFinan,
        preference: basePref,
        bonus: rulesBonus,
        penalizaciones: rulesPenal,
        total,
        cumpleMinimo: stats.cumpleMinimo,
        tramo: stats.tramo,
        objetivoPuntos: stats.objetivoPuntos,
        matriculacionesMes: stats.matriculacionesMes
      };
    });

    return results;
  }, [initialExpedientes, initialPlanes, usuarios]);

  // 4. Expedientes Filtrados en Tiempo Real
  const filteredExpedientes = useMemo(() => {
    return initialExpedientes.filter((exp) => {
      // Filtro de Fechas (por fecha de matriculación efectiva o en su defecto por fecha expediente)
      const refDate = getEffectiveMatDate(exp) || exp.fecha_expediente;
      if (!refDate) return false;
      if (fechaInicio && refDate < fechaInicio) return false;
      if (fechaFin && refDate > fechaFin) return false;

      // Filtro Tienda
      if (filterTienda && exp.id_tienda !== Number(filterTienda)) return false;

      // Filtro Vendedor
      if (filterVendedor && exp.usuario?.id_usuario !== Number(filterVendedor)) return false;

      // Filtro Marca
      const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
      if (filterMarca && brandId !== Number(filterMarca)) return false;

      // Filtro VN/VO
      const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const isVN = stateName === "nuevo" || stateName === "demo";
      if (filterVNVO) {
        if (filterVNVO === "VN" && !isVN) return false;
        if (filterVNVO === "VO" && isVN) return false;
      }

      // Filtro Tipo de Venta
      if (filterTipoVenta && exp.tipoDeVenta?.id_tipo_de_venta !== Number(filterTipoVenta)) return false;

      return true;
    });
  }, [initialExpedientes, fechaInicio, fechaFin, filterTienda, filterVendedor, filterMarca, filterVNVO, filterTipoVenta]);

  // 5. Estadísticas de Vendedores (Comerciales)
  const sellerStats = useMemo(() => {
    const stats: Record<number, {
      vendedor: string;
      vn: number;
      vo: number;
      total: number;
      financiadoVN: number;
      financiadoVO: number;
      totalFinanciado: number;
      baseVNComm: number;
      baseVOComm: number;
      finanComm: number;
      prefComm: number;
      bonusComm: number;
      penalComm: number;
      totalComm: number;
    }> = {};

    filteredExpedientes.forEach((exp) => {
      const seller = exp.usuario;
      if (!seller) return;

      if (!stats[seller.id_usuario]) {
        stats[seller.id_usuario] = {
          vendedor: seller.nombre || `ID: ${seller.id_usuario}`,
          vn: 0, vo: 0, total: 0,
          financiadoVN: 0, financiadoVO: 0, totalFinanciado: 0,
          baseVNComm: 0, baseVOComm: 0, finanComm: 0, prefComm: 0, bonusComm: 0, penalComm: 0, totalComm: 0
        };
      }

      const row = stats[seller.id_usuario];
      const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const isVN = stateName === "nuevo" || stateName === "demo";

      const saleTypeName = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
      const isFinanciado = saleTypeName.includes("crédito") || saleTypeName.includes("credito") || saleTypeName.includes("financiado") || saleTypeName.includes("preference") || saleTypeName.includes("box");

      if (isVN) {
        row.vn++;
        if (isFinanciado) row.financiadoVN++;
      } else {
        row.vo++;
        if (isFinanciado) row.financiadoVO++;
      }
      row.total++;
      if (isFinanciado) row.totalFinanciado++;

      // Agregar importes de comisión
      const comm = calculatedCommissions[exp.id_expediente] || { baseVN: 0, baseVO: 0, financiacion: 0, preference: 0, bonus: 0, penalizaciones: 0, total: 0 };
      row.baseVNComm += comm.baseVN;
      row.baseVOComm += comm.baseVO;
      row.finanComm += comm.financiacion;
      row.prefComm += comm.preference;
      row.bonusComm += comm.bonus;
      row.penalComm += comm.penalizaciones;
      row.totalComm += comm.total;
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [filteredExpedientes, calculatedCommissions]);

  // 6. Estadísticas por Marca
  const brandStats = useMemo(() => {
    const stats: Record<number, {
      marca: string;
      vn: number;
      vo: number;
      total: number;
    }> = {};

    filteredExpedientes.forEach((exp) => {
      const brand = exp.modelo?.marca;
      if (!brand) return;

      if (!stats[brand.id_marca]) {
        stats[brand.id_marca] = {
          marca: brand.nombre,
          vn: 0, vo: 0, total: 0
        };
      }

      const row = stats[brand.id_marca];
      const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const isVN = stateName === "nuevo" || stateName === "demo";

      if (isVN) row.vn++;
      else row.vo++;
      row.total++;
    });

    const totalVentas = filteredExpedientes.length || 1;
    return Object.values(stats)
      .map(row => ({
        ...row,
        porcentaje: Math.round((row.total / totalVentas) * 100)
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpedientes]);

  // 7. KPIs Consolidados
  const totalVN = useMemo(() => filteredExpedientes.filter(e => {
    const name = e.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
    return name === "nuevo" || name === "demo";
  }).length, [filteredExpedientes]);

  const totalVO = filteredExpedientes.length - totalVN;

  const RCIInterventionVN = useMemo(() => {
    const vnExps = filteredExpedientes.filter(e => {
      const name = e.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      return name === "nuevo" || name === "demo";
    });
    if (vnExps.length === 0) return 0;
    const financed = vnExps.filter(e => {
      const saleType = e.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
      return saleType.includes("crédito") || saleType.includes("credito") || saleType.includes("financiado") || saleType.includes("preference") || saleType.includes("box");
    }).length;
    return Math.round((financed / vnExps.length) * 100);
  }, [filteredExpedientes]);

  const totalComisiones = useMemo(() => {
    return filteredExpedientes.reduce((acc, exp) => {
      const c = calculatedCommissions[exp.id_expediente];
      return acc + (c ? c.total : 0);
    }, 0);
  }, [filteredExpedientes, calculatedCommissions]);

  const comisionPromedio = useMemo(() => {
    if (filteredExpedientes.length === 0) return 0;
    return Math.round(totalComisiones / filteredExpedientes.length);
  }, [filteredExpedientes, totalComisiones]);

  // 8. Distribución de Tipos de Venta (Métodos de pago)
  const paymentMethodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredExpedientes.forEach((exp) => {
      const name = exp.tipoDeVenta?.nombre_tipo_venta || "Desconocido";
      counts[name] = (counts[name] || 0) + 1;
    });

    const total = filteredExpedientes.length || 1;
    const colors = ["var(--primary)", "var(--secondary)", "var(--accent)", "var(--text-muted)", "#a78bfa", "#f472b6", "#34d399"];
    return Object.entries(counts).map(([name, val], idx) => ({
      metodo: name,
      unidades: val,
      porcentaje: Math.round((val / total) * 100),
      color: colors[idx % colors.length]
    })).sort((a, b) => b.unidades - a.unidades);
  }, [filteredExpedientes]);

  // 9. Acciones de Exportación
  const handleExportCSV = () => {
    if (filteredExpedientes.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = ["ID Expediente", "Nº Expediente", "Vendedor", "Cliente", "Marca", "Modelo", "VN/VO", "Tipo de Venta", "Fecha Matriculación", "Fecha RCI", "Comisión Total (€)"];
    const rows = filteredExpedientes.map(exp => {
      const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const vnvo = (stateName === "nuevo" || stateName === "demo") ? "VN" : "VO";
      const comm = calculatedCommissions[exp.id_expediente]?.total || 0;
      const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
      const brandName = marcas.find(m => m.id_marca === brandId)?.nombre || "";
      return [
        exp.id_expediente,
        exp.id_expediente,
        exp.usuario?.nombre || "",
        exp.cliente?.nombre || "",
        brandName,
        exp.modelo?.nombre_modelo || "",
        vnvo,
        exp.tipoDeVenta?.nombre_tipo_venta || "",
        getEffectiveMatDate(exp) || "",
        exp.fecha_rci || "",
        comm
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `informe_comercial_${fechaInicio}_al_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredExpedientes.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    // 1. Hoja: Resumen Vendedores
    const vendedoresData = sellerStats.map(s => ({
      "Vendedor": s.vendedor,
      "Ventas VN": s.vn,
      "Ventas VO": s.vo,
      "Total Ventas": s.total,
      "Operaciones RCI": s.totalFinanciado,
      "Tasa RCI VN (%)": s.vn > 0 ? Math.round((s.financiadoVN / s.vn) * 100) : 0,
      "Comisión VN (€)": s.baseVNComm,
      "Comisión VO (€)": s.baseVOComm,
      "Comisión RCI (€)": s.finanComm + s.prefComm,
      "Bonus Extra (€)": s.bonusComm,
      "Penalizaciones (€)": s.penalComm,
      "Comisión Total Net (€)": s.totalComm
    }));

    // 2. Hoja: Distribución Marcas
    const marcasData = brandStats.map(b => ({
      "Marca": b.marca,
      "Ventas VN": b.vn,
      "Ventas VO": b.vo,
      "Total Ventas": b.total,
      "Cuota de Ventas (%)": b.porcentaje
    }));

    // 3. Hoja: Listado de Expedientes
    const expedientesData = filteredExpedientes.map(exp => {
      const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const vnvo = (stateName === "nuevo" || stateName === "demo") ? "VN" : "VO";
      const comm = calculatedCommissions[exp.id_expediente] || { baseVN: 0, baseVO: 0, financing: 0, preference: 0, bonus: 0, penalizaciones: 0, total: 0 };
      const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
      const brandName = marcas.find(m => m.id_marca === brandId)?.nombre || "";
      return {
        "ID": exp.id_expediente,
        "Expediente": exp.id_expediente,
        "Comercial": exp.usuario?.nombre || "",
        "Cliente": exp.cliente?.nombre || "",
        "Marca": brandName,
        "Modelo": exp.modelo?.nombre_modelo || "",
        "VN/VO": vnvo,
        "Método Venta": exp.tipoDeVenta?.nombre_tipo_venta || "",
        "Fecha Matriculación": getEffectiveMatDate(exp) || "",
        "Fecha RCI": exp.fecha_rci || "",
        "Comisión Base VN/VO (€)": comm.baseVN + comm.baseVO,
        "Comisión RCI/Pref (€)": comm.financiacion + comm.preference,
        "Bonus Reglas (€)": comm.bonus,
        "Penalizaciones (€)": comm.penalizaciones,
        "Comisión Total (€)": comm.total
      };
    });

    const wb = XLSX.utils.book_new();
    const wsVendedores = XLSX.utils.json_to_sheet(vendedoresData);
    const wsMarcas = XLSX.utils.json_to_sheet(marcasData);
    const wsExpedientes = XLSX.utils.json_to_sheet(expedientesData);

    XLSX.utils.book_append_sheet(wb, wsVendedores, "Resumen Vendedores");
    XLSX.utils.book_append_sheet(wb, wsMarcas, "Marcas y Modelos");
    XLSX.utils.book_append_sheet(wb, wsExpedientes, "Listado de Ventas");

    XLSX.writeFile(wb, `informe_comercial_consolidado_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }} className="print-container">
      
      {/* 1. Cabecera (Se oculta parcialmente al imprimir si queremos un formato super limpio) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }} className="no-print">
        <div>
          <h1 style={{ fontSize: "1.85rem", marginBottom: "8px" }}>📊 Detalle y Análisis Estadístico</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Cuadro de mando analítico en tiempo real del rendimiento de ventas, comisiones y ratios de penetración financiera.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button type="button" onClick={handleExportCSV} className="btn btn-secondary glass-panel-interactive" style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
            📤 CSV
          </button>
          <button type="button" onClick={handleExportExcel} className="btn btn-secondary glass-panel-interactive" style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
            🟢 Excel (SheetJS)
          </button>
          <button type="button" onClick={handlePrintPDF} className="btn btn-primary" style={{ padding: "10px 20px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      {/* 2. Filtros Interactivos */}
      <div className="glass-panel no-print" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>🔍 Filtros de Consulta</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Fecha Inicio</span>
            <input type="date" className="form-input" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Fecha Fin</span>
            <input type="date" className="form-input" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Tienda / Sucursal</span>
            <select className="form-select" value={filterTienda} onChange={(e) => setFilterTienda(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}>
              <option value="">Todas las Tiendas</option>
              {tiendas.map(t => <option key={t.id_tienda} value={t.id_tienda}>{t.nombre}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Comercial / Vendedor</span>
            <select className="form-select" value={filterVendedor} onChange={(e) => setFilterVendedor(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}>
              <option value="">Todos los Vendedores</option>
              {usuarios.filter(u => u.rol !== "invitado").map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Marca</span>
            <select className="form-select" value={filterMarca} onChange={(e) => setFilterMarca(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}>
              <option value="">Todas las Marcas</option>
              {marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Estado Vehículo</span>
            <select className="form-select" value={filterVNVO} onChange={(e) => setFilterVNVO(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}>
              <option value="">VN y VO</option>
              <option value="VN">Nuevos / Demo (VN)</option>
              <option value="VO">Usados / Seminuevos (VO)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Título de Impresión (Solo visible al imprimir) */}
      <div className="only-print" style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Informe de Rendimiento de Ventas y Comisiones</h1>
        <p style={{ color: "#555", fontSize: "0.9rem" }}>Periodo de consulta: {fechaInicio} al {fechaFin}</p>
        <hr style={{ border: "none", borderTop: "2px solid #333", margin: "10px 0" }} />
      </div>

      {/* 3. Indicadores Clave (KPIs) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "24px"
      }}>
        {/* KPI 1: Ventas VN/VO */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", borderLeft: "4px solid var(--primary)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Vehículos Vendidos</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{filteredExpedientes.length}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {totalVN} VN / {totalVO} VO
            </span>
          </div>
        </div>

        {/* KPI 2: RCI VN */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", borderLeft: "4px solid var(--secondary)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Penetración Financiera VN</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{RCIInterventionVN}%</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Financiación RCI</span>
          </div>
        </div>

        {/* KPI 3: Total Comisiones */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", borderLeft: "4px solid var(--success)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Comisión Neta Generada</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{totalComisiones.toLocaleString()} €</span>
            <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>Neto del Periodo</span>
          </div>
        </div>

        {/* KPI 4: Promedio por Expediente */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", borderLeft: "4px solid var(--accent)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Comisión Media</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{comisionPromedio.toLocaleString()} €</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>por vehículo vendido</span>
          </div>
        </div>
      </div>

      {/* 4. Gráficos Visuales (Segunda Sección) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        gap: "24px"
      }} className="no-print">
        
        {/* GRÁFICO 1: Distribución por Marca */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Distribución por Marca</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {brandStats.slice(0, 5).map(item => (
              <div key={item.marca} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ fontWeight: 600 }}>{item.marca}</span>
                  <span style={{ color: "var(--text-muted)" }}>{item.total} uds ({item.porcentaje}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${item.porcentaje}%`, height: "100%", background: "var(--primary)", borderRadius: "4px" }}></div>
                </div>
              </div>
            ))}
            {brandStats.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Sin datos de marcas para el periodo actual.</span>}
          </div>
        </div>

        {/* GRÁFICO 2: Métodos de Pago */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Métodos de Pago</h3>
          <div style={{ display: "flex", width: "100%", height: "24px", borderRadius: "4px", overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
            {paymentMethodStats.map(item => (
              <div key={item.metodo} style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }} title={`${item.metodo}: ${item.porcentaje}%`}></div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            {paymentMethodStats.map(item => (
              <div key={item.metodo} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color }}></div>
                <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{item.metodo}</span>
                <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>{item.unidades} ({item.porcentaje}%)</span>
              </div>
            ))}
            {paymentMethodStats.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Sin datos para el periodo actual.</span>}
          </div>
        </div>
      </div>

      {/* 5. Tabla por Comercial (Consolidación) */}
      <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>📈 Rendimiento Económico por Comercial</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-light)", textAlign: "left" }}>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Comercial</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>Ventas VN</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>Ventas VO</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>Total Ventas</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>RCI Financiado</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>Ratio RCI VN</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Base VN/VO (€)</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Financiación (€)</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Bonus Extra (€)</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Penalizaciones (€)</th>
                <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Comisión Total (€)</th>
              </tr>
            </thead>
            <tbody>
              {sellerStats.map(s => (
                <tr key={s.vendedor} style={{ borderBottom: "1px solid var(--border-light)", fontSize: "0.85rem" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{s.vendedor}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>{s.vn}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>{s.vo}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>{s.total}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>{s.totalFinanciado}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>{s.vn > 0 ? `${Math.round((s.financiadoVN / s.vn) * 100)}%` : "0%"}</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>{(s.baseVNComm + s.baseVOComm).toLocaleString()} €</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>{(s.finanComm + s.prefComm).toLocaleString()} €</td>
                  <td style={{ padding: "12px", textAlign: "right", color: "var(--success)" }}>{s.bonusComm > 0 ? `+${s.bonusComm.toLocaleString()}` : "0"} €</td>
                  <td style={{ padding: "12px", textAlign: "right", color: "var(--danger)" }}>{s.penalComm > 0 ? `-${s.penalComm.toLocaleString()}` : "0"} €</td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>{s.totalComm.toLocaleString()} €</td>
                </tr>
              ))}
              {sellerStats.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    No hay registros de ventas para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Listado Detallado de Operaciones (Ocultar en PDF si es muy largo, o imprimir en tablas limpias) */}
      <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>📋 Listado Detallado de Ventas</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-light)", textAlign: "left" }}>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Expediente</th>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Vendedor</th>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Cliente</th>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Vehículo</th>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>VN/VO</th>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Método Pago</th>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Matriculación</th>
                <th style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Comisión (€)</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpedientes.map(exp => {
                const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
                const vnvo = (stateName === "nuevo" || stateName === "demo") ? "VN" : "VO";
                const comm = calculatedCommissions[exp.id_expediente]?.total || 0;
                const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
                const brandName = marcas.find(m => m.id_marca === brandId)?.nombre || "";

                return (
                  <tr key={exp.id_expediente} style={{ borderBottom: "1px solid var(--border-light)", fontSize: "0.85rem" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>#{exp.id_expediente}</td>
                    <td style={{ padding: "10px" }}>{exp.usuario?.nombre || ""}</td>
                    <td style={{ padding: "10px" }}>{exp.cliente?.nombre || ""}</td>
                    <td style={{ padding: "10px" }}>{brandName} {exp.modelo?.nombre_modelo || ""}</td>
                    <td style={{ padding: "10px" }}>
                      <span className={`badge ${vnvo === "VN" ? "badge-tienda" : "badge-vendedor"}`} style={{ fontSize: "0.7rem", padding: "3px 6px" }}>
                        {vnvo}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>{exp.tipoDeVenta?.nombre_tipo_venta || ""}</td>
                    <td style={{ padding: "10px" }}>{getEffectiveMatDate(exp) || ""}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>{comm.toLocaleString()} €</td>
                  </tr>
                );
              })}
              {filteredExpedientes.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    Ningún expediente coincide con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estilos específicos para impresión */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
            font-size: 10pt !important;
          }
          .no-print {
            display: none !important;
          }
          .only-print {
            display: block !important;
          }
          .glass-panel {
            background: none !important;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .print-container {
            gap: 20px !important;
          }
        }
        .only-print {
          display: none;
        }
      `}</style>
    </div>
  );
}
