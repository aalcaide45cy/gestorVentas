"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/date-utils";

interface DropdownItem {
  id: number;
  nombre: string;
  sistema_comisiones?: boolean;
}

interface ModeloItem {
  id: number;
  nombre: string;
  marca_id: number;
}

interface ComisionesManagerProps {
  initialPlanes: any[];
  marcas: DropdownItem[];
  modelos: ModeloItem[];
  isAdmin?: boolean;
}

export default function ComisionesManager({ initialPlanes, marcas, modelos, isAdmin = false }: ComisionesManagerProps) {
  const router = useRouter();
  const [planes, setPlanes] = useState(initialPlanes);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "resumen" | "objetivo" | "modelos" | "usados" | "preference" | "reglas" | "bonus" | "liquidacion"
  >("resumen");

  // Estados para creación/clonación de planes
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanStart, setNewPlanStart] = useState("");
  const [newPlanEnd, setNewPlanEnd] = useState("");
  const [newPlanBase, setNewPlanBase] = useState("12");
  const [newPlanArrastre, setNewPlanArrastre] = useState("0");
  const [newPlanMinMat, setNewPlanMinMat] = useState("6");
  const [cloneFromId, setCloneFromId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados locales del editor del plan
  const [planName, setPlanName] = useState("");
  const [planStart, setPlanStart] = useState("");
  const [planEnd, setPlanEnd] = useState("");
  const [planEstado, setPlanEstado] = useState("");
  const [objetivoBase, setObjetivoBase] = useState(0);
  const [arrastre, setArrastre] = useState(0);
  const [minMatriculaciones, setMinMatriculaciones] = useState(6);
  const [minCochesMultiplicador, setMinCochesMultiplicador] = useState(0);

  // Modelos y tarifas
  const [rates, setRates] = useState<any[]>([]);

  // Reglas generales
  const [rules, setRules] = useState<any[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState("pedido");
  const [newRuleMarca, setNewRuleMarca] = useState<string>("");
  const [newRuleModelo, setNewRuleModelo] = useState<string>("");
  const [newRuleAfectaObj, setNewRuleAfectaObj] = useState(false);
  const [newRuleValObj, setNewRuleValObj] = useState("1");
  const [newRuleAfectaCom, setNewRuleAfectaCom] = useState(true);
  const [newRuleImporte, setNewRuleImporte] = useState("100");
  const [newRuleTasaIntervencion, setNewRuleTasaIntervencion] = useState<string>("");

  // Bonus
  const [bonusRules, setBonusRules] = useState<any[]>([]);
  const [newBonusName, setNewBonusName] = useState("");
  const [newBonusDesc, setNewBonusDesc] = useState("");
  const [newBonusType, setNewBonusType] = useState("pedido");
  const [newBonusMarca, setNewBonusMarca] = useState<string>("");
  const [newBonusModelo, setNewBonusModelo] = useState<string>("");
  const [newBonusImporte, setNewBonusImporte] = useState("150");
  const [newBonusAfectaObj, setNewBonusAfectaObj] = useState(false);
  const [newBonusValObj, setNewBonusValObj] = useState("0");
  const [newBonusStart, setNewBonusStart] = useState("");
  const [newBonusEnd, setNewBonusEnd] = useState("");

  // Financiación
  const [financeNormal, setFinanceNormal] = useState(0);
  const [financePref, setFinancePref] = useState(0);

  // Usados / VO
  const [usedRates, setUsedRates] = useState<any[]>([]);
  const [voPatterns, setVoPatterns] = useState<any[]>([]);
  const [prefLocked, setPrefLocked] = useState(true);

  // Financiación por marca
  const [financeRates, setFinanceRates] = useState<any[]>([]);
  const [brandInterventionRates, setBrandInterventionRates] = useState<any[]>([]);

  // Clipboard para copiar/pegar valores de tarifas
  const [rateClipboard, setRateClipboard] = useState<{
    rate_x_minus_4: number;
    rate_x_minus_3: number;
    rate_x_minus_2: number;
    rate_x_minus_1: number;
    rate_x: number;
    rate_x_plus_1: number;
    rate_x_plus_2: number;
    rate_x_plus_3: number;
    activo: boolean;
  } | null>(null);

  // Clipboard para copiar/pegar tarifas completas de un modelo (superior e inferior a la vez)
  const [modelClipboard, setModelClipboard] = useState<{
    rate_x_minus_4_less: number;
    rate_x_minus_3_less: number;
    rate_x_minus_2_less: number;
    rate_x_minus_1_less: number;
    rate_x_less: number;
    rate_x_plus_1_less: number;
    rate_x_plus_2_less: number;
    rate_x_plus_3_less: number;
    
    rate_x_minus_4_more: number;
    rate_x_minus_3_more: number;
    rate_x_minus_2_more: number;
    rate_x_minus_1_more: number;
    rate_x_more: number;
    rate_x_plus_1_more: number;
    rate_x_plus_2_more: number;
    rate_x_plus_3_more: number;
  } | null>(null);

  // Orden manual de modelos por marca (map brandId -> array de modelIds)
  const [modelOrder, setModelOrder] = useState<Record<number, number[]>>({});

  // Estados para actualización masiva de cupo
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkYear, setBulkYear] = useState(2026);
  const [bulkMonth, setBulkMonth] = useState(6);
  const [bulkDateType, setBulkDateType] = useState("fecha_expediente");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Preference / BOX3
  const [preferenceRules, setPreferenceRules] = useState<any[]>([]);
  const [newPrefName, setNewPrefName] = useState("");
  const [newPrefMarca, setNewPrefMarca] = useState("");
  const [newPrefModelo, setNewPrefModelo] = useState("");
  const [newPrefFinType, setNewPrefFinType] = useState("");
  const [newPrefImporte, setNewPrefImporte] = useState("100");

  // Filtro tipo vehiculo para Bonus
  const [newBonusTypeVehiculo, setNewBonusTypeVehiculo] = useState("cualquiera");

  // Estados para editar Bonus
  const [editingBonusIdx, setEditingBonusIdx] = useState<number | null>(null);
  const [editingBonusName, setEditingBonusName] = useState("");
  const [editingBonusDesc, setEditingBonusDesc] = useState("");
  const [editingBonusType, setEditingBonusType] = useState("pedido");
  const [editingBonusMarca, setEditingBonusMarca] = useState("");
  const [editingBonusModelo, setEditingBonusModelo] = useState("");
  const [editingBonusTypeVehiculo, setEditingBonusTypeVehiculo] = useState("cualquiera");
  const [editingBonusImporte, setEditingBonusImporte] = useState("150");
  const [editingBonusAfectaObj, setEditingBonusAfectaObj] = useState(false);
  const [editingBonusValObj, setEditingBonusValObj] = useState("0");
  const [editingBonusStart, setEditingBonusStart] = useState("");
  const [editingBonusEnd, setEditingBonusEnd] = useState("");

  // Liquidación
  const [calculating, setCalculating] = useState(false);
  const [selectedLineDetails, setSelectedLineDetails] = useState<any | null>(null);

  // Cargar lista de planes
  const refreshPlanes = async () => {
    try {
      const res = await fetch("/api/comisiones/planes");
      const result = await res.json();
      if (result.success) {
        setPlanes(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Cargar detalles de un plan
  const loadPlanDetails = async (id: number, keepTab = false) => {
    setLoadingPlan(true);
    try {
      const res = await fetch(`/api/comisiones/planes?id=${id}`);
      const result = await res.json();
      if (result.success) {
        const plan = result.data;
        setPlanData(plan);
        setSelectedPlanId(id);
        
        // Cargar variables de estado
        setPlanName(plan.nombre);
        setPlanStart(plan.fecha_inicio);
        setPlanEnd(plan.fecha_fin);
        setPlanEstado(plan.estado);
        setObjetivoBase(plan.objetivo_base);
        setArrastre(plan.arrastre);
        setMinMatriculaciones(plan.min_matriculaciones);
        setMinCochesMultiplicador(plan.min_coches_multiplicador || 0);

        const planDate = plan.fecha_inicio ? new Date(plan.fecha_inicio) : new Date();
        setBulkYear(planDate.getFullYear());
        setBulkMonth(planDate.getMonth() + 1);

        // Proactive Healing: Asegurar que cada modelo de marca activa tenga exactamente 2 filas (tasa cumplida y no cumplida)
        const initialRates = plan.rates || [];
        const activeBrands = marcas.filter(m => !!m.sistema_comisiones);
        const activeBrandIds = activeBrands.map(b => b.id);
        const systemModels = modelos.filter(m => activeBrandIds.includes(m.marca_id));
        
        const normalizedRates = [...initialRates];
        systemModels.forEach(m => {
          // Buscar el "ultimo modelo subido" (el modelo de esta marca con ID más alto en initialRates)
          const brandModelsInRates = initialRates.filter((r: any) => {
            const modelObj = modelos.find(mod => mod.id === r.id_modelo);
            return modelObj?.marca_id === m.marca_id;
          });

          let lastBrandRateInferior: any = null;
          let lastBrandRateSuperior: any = null;
          if (brandModelsInRates.length > 0) {
            const maxModelId = Math.max(...brandModelsInRates.map((r: any) => r.id_modelo).filter(Boolean) as number[]);
            lastBrandRateInferior = brandModelsInRates.find((r: any) => r.id_modelo === maxModelId && !r.tasa_intervencion_cumplida);
            lastBrandRateSuperior = brandModelsInRates.find((r: any) => r.id_modelo === maxModelId && r.tasa_intervencion_cumplida);
          }

          const hasInferior = initialRates.some((r: any) => r.id_modelo === m.id && r.tasa_intervencion_cumplida === false);
          if (!hasInferior) {
            normalizedRates.push({
              id_plan: id,
              id_modelo: m.id,
              tasa_intervencion_cumplida: false,
              rate_x_minus_4: lastBrandRateInferior?.rate_x_minus_4 ?? 70,
              rate_x_minus_3: lastBrandRateInferior?.rate_x_minus_3 ?? 80,
              rate_x_minus_2: lastBrandRateInferior?.rate_x_minus_2 ?? 90,
              rate_x_minus_1: lastBrandRateInferior?.rate_x_minus_1 ?? 100,
              rate_x: lastBrandRateInferior?.rate_x ?? 120,
              rate_x_plus_1: lastBrandRateInferior?.rate_x_plus_1 ?? 140,
              rate_x_plus_2: lastBrandRateInferior?.rate_x_plus_2 ?? 160,
              rate_x_plus_3: lastBrandRateInferior?.rate_x_plus_3 ?? 180,
              valor_objetivo: 1,
              activo: true,
            });
          }
          
          const hasSuperior = initialRates.some((r: any) => r.id_modelo === m.id && r.tasa_intervencion_cumplida === true);
          if (!hasSuperior) {
            normalizedRates.push({
              id_plan: id,
              id_modelo: m.id,
              tasa_intervencion_cumplida: true,
              rate_x_minus_4: lastBrandRateSuperior?.rate_x_minus_4 ?? 90,
              rate_x_minus_3: lastBrandRateSuperior?.rate_x_minus_3 ?? 100,
              rate_x_minus_2: lastBrandRateSuperior?.rate_x_minus_2 ?? 110,
              rate_x_minus_1: lastBrandRateSuperior?.rate_x_minus_1 ?? 120,
              rate_x: lastBrandRateSuperior?.rate_x ?? 140,
              rate_x_plus_1: lastBrandRateSuperior?.rate_x_plus_1 ?? 160,
              rate_x_plus_2: lastBrandRateSuperior?.rate_x_plus_2 ?? 180,
              rate_x_plus_3: lastBrandRateSuperior?.rate_x_plus_3 ?? 200,
              valor_objetivo: 1,
              activo: true,
            });
          }
        });

        setRates(normalizedRates);
        setRules(plan.rules || []);
        setBonusRules(plan.bonusRules || []);
        setUsedRates(plan.usedRates || []);
        setFinanceRates(plan.financeRates || []);
        setPreferenceRules(plan.preferenceRules || []);
        setVoPatterns(plan.voPatterns || []);
        setBrandInterventionRates(plan.brandInterventionRates || []);
        
        if (plan.financeRules) {
          setFinanceNormal(plan.financeRules.importe_normal);
          setFinancePref(plan.financeRules.importe_preference);
        } else {
          setFinanceNormal(80);
          setFinancePref(120);
        }

        if (!keepTab) {
          setActiveTab("resumen");
        }
      } else {
        showNotification(result.message || "Error al cargar detalles del plan", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al cargar plan", "error");
    } finally {
      setLoadingPlan(false);
    }
  };

  // Guardar Plan
  const handleSavePlan = async () => {
    if (!selectedPlanId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/comisiones/planes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_plan: selectedPlanId,
          nombre: planName,
          fecha_inicio: planStart,
          fecha_fin: planEnd,
          estado: planEstado,
          objetivo_base: objetivoBase,
          arrastre: arrastre,
          min_matriculaciones: minMatriculaciones,
          min_coches_multiplicador: minCochesMultiplicador,
          rates,
          financeRules: {
            importe_normal: financeNormal,
            importe_preference: financePref
          },
          rules,
          bonusRules,
          usedRates,
          financeRates,
          preferenceRules,
          voPatterns,
          brandInterventionRates
        })
      });

      const result = await res.json();
      if (result.success) {
        showNotification("Plan guardado con éxito", "success");
        loadPlanDetails(selectedPlanId, true);
        refreshPlanes();
      } else {
        showNotification(result.message || "Error al guardar el plan", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actualización masiva de cupo
  const handleExecuteBulkUpdate = async () => {
    if (minCochesMultiplicador === undefined || minCochesMultiplicador === null) {
      showNotification("Por favor define primero un valor para el cupo", "error");
      return;
    }
    setBulkSaving(true);
    try {
      const res = await fetch("/api/expedientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBulk: true,
          mes: bulkMonth,
          año: bulkYear,
          tipoFecha: bulkDateType,
          min_coches_multiplicador: minCochesMultiplicador
        })
      });
      const result = await res.json();
      if (result.success) {
        showNotification("Cupo aplicado a los expedientes en lote correctamente", "success");
        setBulkModalOpen(false);
      } else {
        showNotification(result.message || "Error al aplicar el cupo en lote", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al aplicar el cupo en lote", "error");
    } finally {
      setBulkSaving(false);
    }
  };

  // Crear o Clonar Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName || !newPlanStart || !newPlanEnd) {
      showNotification("Por favor, rellene el nombre y las fechas.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/comisiones/planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newPlanName,
          fecha_inicio: newPlanStart,
          fecha_fin: newPlanEnd,
          objetivo_base: Number(newPlanBase),
          arrastre: Number(newPlanArrastre),
          min_matriculaciones: Number(newPlanMinMat),
          cloneFromId: cloneFromId || null
        })
      });

      const result = await res.json();
      if (result.success) {
        showNotification(cloneFromId ? "Plan clonado correctamente" : "Plan creado correctamente", "success");
        setShowCreateModal(false);
        // Limpiar formulario
        setNewPlanName("");
        setNewPlanStart("");
        setNewPlanEnd("");
        setNewPlanBase("12");
        setNewPlanArrastre("0");
        setNewPlanMinMat("6");
        setCloneFromId("");

        refreshPlanes();
        if (result.data?.id_plan) {
          loadPlanDetails(result.data.id_plan);
        }
      } else {
        showNotification(result.message || "Error al procesar el plan", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al crear plan", "error");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Plan
  const handleDeletePlan = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar permanentemente este plan de comisionamiento?")) return;
    try {
      const res = await fetch(`/api/comisiones/planes?id=${id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (result.success) {
        showNotification("Plan eliminado correctamente", "success");
        refreshPlanes();
        if (selectedPlanId === id) {
          setSelectedPlanId(null);
          setPlanData(null);
        }
      } else {
        showNotification(result.message || "Error al eliminar plan", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al eliminar", "error");
    }
  };

  // Calcular Liquidación
  const handleCalculateLiquidation = async () => {
    if (!selectedPlanId) return;
    setCalculating(true);
    try {
      const res = await fetch("/api/comisiones/liquidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_plan: selectedPlanId })
      });
      const result = await res.json();
      if (result.success) {
        showNotification("Liquidación calculada y guardada correctamente", "success");
        loadPlanDetails(selectedPlanId, true);
      } else {
        showNotification(result.message || "Error al calcular la liquidación", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al calcular liquidación", "error");
    } finally {
      setCalculating(false);
    }
  };

  // Cerrar Plan / Liquidación
  const handleCloseLiquidation = async () => {
    if (!selectedPlanId || !planData?.liquidations?.[0]) return;
    if (!confirm("¿Estás seguro de cerrar definitivamente este plan y su liquidación? No se podrán recalcular ni modificar los valores una vez cerrado.")) return;

    setSaving(true);
    try {
      const res = await fetch("/api/comisiones/liquidar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_plan: selectedPlanId,
          estado_plan: "cerrado",
          id_liquidation: planData.liquidations[0].id_liquidation,
          estado_liquidation: "cerrada"
        })
      });

      const result = await res.json();
      if (result.success) {
        showNotification("Liquidación cerrada de forma inmutable", "success");
        loadPlanDetails(selectedPlanId, true);
        refreshPlanes();
      } else {
        showNotification(result.message || "Error al cerrar liquidación", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al cerrar", "error");
    } finally {
      setSaving(false);
    }
  };

  // --- CRUD local de reglas ---
  const handleAddRule = () => {
    if (!newRuleName.trim()) {
      showNotification("Por favor, introduce un nombre para la regla", "error");
      return;
    }
    const newRule = {
      nombre: newRuleName,
      tipo_evento: newRuleType,
      id_marca: newRuleMarca ? Number(newRuleMarca) : null,
      id_modelo: newRuleModelo ? Number(newRuleModelo) : null,
      afecta_objetivo: newRuleAfectaObj,
      valor_objetivo: Number(newRuleValObj || 0),
      afecta_comision: newRuleAfectaCom,
      importe: Number(newRuleImporte || 0),
      activa: true,
      tasa_intervencion_cumplida: newRuleTasaIntervencion === "" ? null : (newRuleTasaIntervencion === "true")
    };
    setRules([...rules, newRule]);
    // Resetear formulario
    setNewRuleName("");
    setNewRuleType("pedido");
    setNewRuleMarca("");
    setNewRuleModelo("");
    setNewRuleAfectaObj(false);
    setNewRuleValObj("1");
    setNewRuleAfectaCom(true);
    setNewRuleImporte("100");
    setNewRuleTasaIntervencion("");
  };

  const handleDeleteRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  // --- CRUD local de bonus ---
  const handleAddBonus = () => {
    if (!newBonusName.trim()) {
      showNotification("Por favor, introduce un nombre para el Bonus", "error");
      return;
    }
    const newBonus = {
      nombre: newBonusName,
      descripcion: newBonusDesc || null,
      tipo_evento: newBonusType,
      id_marca: newBonusMarca ? Number(newBonusMarca) : null,
      id_modelo: newBonusModelo ? Number(newBonusModelo) : null,
      importe: Number(newBonusImporte || 0),
      afecta_objetivo: newBonusAfectaObj,
      valor_objetivo: Number(newBonusValObj || 0),
      fecha_inicio: newBonusStart || null,
      fecha_fin: newBonusEnd || null,
      activo: true,
      tipo_vehiculo: newBonusTypeVehiculo
    };
    setBonusRules([...bonusRules, newBonus]);
    // Resetear
    setNewBonusName("");
    setNewBonusDesc("");
    setNewBonusType("pedido");
    setNewBonusMarca("");
    setNewBonusModelo("");
    setNewBonusImporte("150");
    setNewBonusAfectaObj(false);
    setNewBonusValObj("0");
    setNewBonusStart("");
    setNewBonusEnd("");
  };

  const handleDeleteBonus = (idx: number) => {
    setBonusRules(bonusRules.filter((_, i) => i !== idx));
  };

  const handleStartEditBonus = (idx: number, b: any) => {
    setEditingBonusIdx(idx);
    setEditingBonusName(b.nombre || "");
    setEditingBonusDesc(b.descripcion || "");
    setEditingBonusType(b.tipo_evento || "pedido");
    setEditingBonusMarca(b.id_marca ? String(b.id_marca) : "");
    setEditingBonusModelo(b.id_modelo ? String(b.id_modelo) : "");
    setEditingBonusTypeVehiculo(b.tipo_vehiculo || "cualquiera");
    setEditingBonusImporte(String(b.importe || 0));
    setEditingBonusAfectaObj(!!b.afecta_objetivo);
    setEditingBonusValObj(String(b.valor_objetivo || 0));
    setEditingBonusStart(b.fecha_inicio || "");
    setEditingBonusEnd(b.fecha_fin || "");
  };

  const handleSaveBonusEdit = (idx: number) => {
    if (!editingBonusName.trim()) {
      showNotification("Por favor, introduce un nombre para el Bonus", "error");
      return;
    }
    const updated = [...bonusRules];
    updated[idx] = {
      ...updated[idx],
      nombre: editingBonusName,
      descripcion: editingBonusDesc || null,
      tipo_evento: editingBonusType,
      id_marca: editingBonusMarca ? Number(editingBonusMarca) : null,
      id_modelo: editingBonusModelo ? Number(editingBonusModelo) : null,
      tipo_vehiculo: editingBonusTypeVehiculo,
      importe: Number(editingBonusImporte || 0),
      afecta_objetivo: editingBonusAfectaObj,
      valor_objetivo: Number(editingBonusValObj || 0),
      fecha_inicio: editingBonusStart || null,
      fecha_fin: editingBonusEnd || null,
    };
    setBonusRules(updated);
    setEditingBonusIdx(null);
  };

  // --- CRUD local de preference rules ---
  const handleAddPrefRule = () => {
    if (!newPrefName.trim()) {
      showNotification("Por favor, introduce un nombre para la regla Preference", "error");
      return;
    }
    const newRule = {
      nombre: newPrefName,
      id_marca: newPrefMarca ? Number(newPrefMarca) : null,
      id_modelo: newPrefModelo ? Number(newPrefModelo) : null,
      tipo_financiacion: newPrefFinType || null,
      importe: Number(newPrefImporte || 0),
      activa: true
    };
    setPreferenceRules([...preferenceRules, newRule]);
    setNewPrefName("");
    setNewPrefMarca("");
    setNewPrefModelo("");
    setNewPrefFinType("");
    setNewPrefImporte("100");
  };

  const handleDeletePrefRule = (idx: number) => {
    setPreferenceRules(preferenceRules.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ position: "relative" }}>
      {/* NOTIFICACIONES FLOTANTES */}
      {successMsg && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", color: "#ffffff", borderLeft: "4px solid var(--success)",
          background: "rgba(16, 185, 129, 0.95)", backdropFilter: "blur(8px)",
          minWidth: "300px", textAlign: "center", zIndex: 1000, borderRadius: "4px",
          boxShadow: "var(--shadow-md)"
        }}>
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", color: "#ffffff", borderLeft: "4px solid var(--danger)",
          background: "rgba(239, 68, 68, 0.95)", backdropFilter: "blur(8px)",
          minWidth: "300px", textAlign: "center", zIndex: 1000, borderRadius: "4px",
          boxShadow: "var(--shadow-md)"
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* VISTA 1: LISTADO DE PLANES */}
      {!selectedPlanId && (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "1.85rem", marginBottom: "8px" }}>Planes de Comisionamiento</h1>
              <p style={{ color: "var(--text-secondary)" }}>
                Configura periodos mensuales, tamos de objetivos y calcula las liquidaciones de los vendedores.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setCloneFromId("");
                  
                  const meses = [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                  ];
                  const hoy = new Date();
                  const mesNombre = meses[hoy.getMonth()];
                  const anio = hoy.getFullYear();
                  
                  const primerDia = `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
                  const ultimoDiaDate = new Date(anio, hoy.getMonth() + 1, 0);
                  const ultimoDia = `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(ultimoDiaDate.getDate()).padStart(2, '0')}`;
                  
                  setNewPlanName(`${mesNombre} ${anio}`);
                  setNewPlanStart(primerDia);
                  setNewPlanEnd(ultimoDia);
                  setShowCreateModal(true);
                }}
                className="btn btn-primary"
              >
                ➕ Crear Nuevo Plan
              </button>
            )}
          </div>

          <div className="glass-panel" style={{ padding: "8px" }}>
            <div className="table-container">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Nombre del Plan</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th style={{ textAlign: "center" }}>Objetivo (X)</th>
                    <th style={{ textAlign: "center" }}>Mínimo Mat.</th>
                    <th style={{ textAlign: "center" }}>Liquidación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {planes.map((p) => {
                    const liq = p.liquidations?.[0];
                    return (
                      <tr key={p.id_plan}>
                        <td style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{p.nombre}</td>
                        <td>{formatDate(p.fecha_inicio)}</td>
                        <td>{formatDate(p.fecha_fin)}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{p.objetivo_base + p.arrastre} (base: {p.objetivo_base})</td>
                        <td style={{ textAlign: "center" }}>{p.min_matriculaciones} uds</td>
                        <td style={{ textAlign: "center" }}>
                          {liq ? (
                            <span className="badge badge-tienda" style={{ fontSize: "0.75rem", backgroundColor: liq.estado === "cerrada" ? "var(--success)" : undefined }}>
                              {liq.estado === "cerrada" ? "🔒 Cerrada" : "✓ Calculada"} ({liq.total_comision_economica.toLocaleString()} €)
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No calculada</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => loadPlanDetails(p.id_plan)}
                              className="btn btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            >
                              📂 Abrir
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setCloneFromId(String(p.id_plan));
                                  setNewPlanName(`Copia de ${p.nombre}`);
                                  
                                  const meses = [
                                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                                  ];
                                  const hoy = new Date();
                                  const mesNombre = meses[hoy.getMonth()];
                                  const anio = hoy.getFullYear();
                                  const primerDia = `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
                                  const ultimoDiaDate = new Date(anio, hoy.getMonth() + 1, 0);
                                  const ultimoDia = `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(ultimoDiaDate.getDate()).padStart(2, '0')}`;
                                  
                                  setNewPlanStart(primerDia);
                                  setNewPlanEnd(ultimoDia);
                                  setShowCreateModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                              >
                                📋 Clonar
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeletePlan(p.id_plan)}
                                className="btn"
                                style={{
                                  padding: "6px 12px", fontSize: "0.8rem", color: "var(--danger)",
                                  background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)",
                                  borderRadius: "var(--radius-sm)", cursor: "pointer"
                                }}
                              >
                                🗑️ Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {planes.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                        No hay planes de comisionamiento configurados. Haz clic en &quot;Crear Nuevo Plan&quot; para iniciar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: EDICIÓN Y DETALLE DEL PLAN SELECCIONADO */}
      {selectedPlanId && planData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* HEADER DEL PLAN */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <button
                onClick={() => {
                  setSelectedPlanId(null);
                  setPlanData(null);
                  refreshPlanes();
                }}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.8rem", marginBottom: "12px" }}
              >
                ← Volver a Planes
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h1 style={{ fontSize: "1.85rem" }}>{planName}</h1>
              </div>
              <p style={{ color: "var(--text-secondary)", marginTop: "4px", fontSize: "0.9rem" }}>
                Periodo: <strong>{formatDate(planStart)}</strong> al <strong>{formatDate(planEnd)}</strong>
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: "12px 24px" }}
              >
                💾 {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            )}
          </div>

          {/* TABS DE CONFIGURACIÓN */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-light)", paddingBottom: "1px", flexWrap: "wrap" }}>
            {[
              { id: "resumen", label: "📋 Resumen" },
              { id: "objetivo", label: "🎯 Objetivo" },
              { id: "modelos", label: "🚗 VN" },
              { id: "usados", label: "🚙 Usados / VO" },
              { id: "reglas", label: "⚙️ Financ/Reglas" },
              { id: "bonus", label: "🎁 Bonus" },
              { id: "liquidacion", label: "💰 Liquidación" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: activeTab === tab.id ? "rgba(255, 255, 255, 0.05)" : "transparent",
                  color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                  padding: "12px 18px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* CONTENIDOS DE LAS PESTAÑAS */}
          <div className="glass-panel" style={{ padding: "28px" }}>
            
            {/* TAB: RESUMEN */}
            {activeTab === "resumen" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Resumen del Plan</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                  <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>OBJETIVO BASE</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "4px" }}>{objetivoBase}</div>
                  </div>
                  <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ARRASRE</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "4px" }}>{arrastre}</div>
                  </div>
                  <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>OBJETIVO AJUSTADO (X)</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginTop: "4px" }}>{objetivoBase + arrastre}</div>
                  </div>
                  <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>MÍNIMO MATRICULACIONES</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "4px" }}>{minMatriculaciones}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", fontSize: "0.95rem" }}>
                  <div>• Modelos VN configurados en el plan: <strong>{rates.filter(r => r.activo).length}</strong> de {rates.length} totales.</div>
                  <div>• Tarifas de usados configuradas: <strong>{usedRates.filter(u => u.activo).length}</strong></div>
                  <div>• Financiación por marca parametrizada: <strong>{financeRates.length} tarifas</strong></div>
                  <div>• Reglas de Preference/BOX3 configuradas: <strong>{preferenceRules.filter(p => p.activa).length}</strong></div>
                  <div>• Reglas especiales creadas: <strong>{rules.length}</strong></div>
                  <div>• Bonus de campaña configurados: <strong>{bonusRules.length}</strong></div>
                  <div>• Financiamiento parametrizado: Normal: <strong>{financeNormal} €</strong> / Preference: <strong>{financePref} €</strong></div>
                  <div>• Liquidación activa: {planData.liquidations?.[0] ? (
                    <strong style={{ color: "var(--success)" }}>✓ Calculada el {formatDate(planData.liquidations[0].fecha_calculo)}</strong>
                  ) : (
                    <strong style={{ color: "var(--danger)" }}>⏳ Pendiente calcular</strong>
                  )}</div>
                </div>
              </div>
            )}

            {/* TAB: OBJETIVO */}
            {activeTab === "objetivo" && (
              <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", alignItems: "flex-start" }}>
                {/* Bloque Izquierdo: Cálculo de Objetivo */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, minWidth: "300px", maxWidth: "450px" }}>
                  <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Cálculo del Objetivo X</h3>
                  
                  <div className="form-group">
                    <label className="form-label">Objetivo Base del Periodo</label>
                    <input
                      type="number"
                      className="form-input"
                      value={objetivoBase}
                      onChange={(e) => setObjetivoBase(Number(e.target.value))}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Arrastre (Unidades adicionales)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={arrastre}
                      onChange={(e) => setArrastre(Number(e.target.value))}
                      disabled={!isAdmin}
                    />
                  </div>

                    <div className="form-group">
                    <label className="form-label">Mínimo de Matriculaciones Reales (Derecho a cobro)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={minMatriculaciones}
                      onChange={(e) => setMinMatriculaciones(Number(e.target.value))}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div style={{
                    padding: "16px 20px",
                    background: "rgba(124, 58, 237, 0.05)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-focus)",
                    marginTop: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ fontWeight: 600 }}>Objetivo Resultante (X = Base + Arrastre)</span>
                    <strong style={{ fontSize: "1.6rem", color: "var(--primary)" }}>{objetivoBase + arrastre}</strong>
                  </div>
                </div>

                {/* Bloque Derecho: Tasa de Intervención por Marca */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, minWidth: "300px", maxWidth: "450px", padding: "24px", background: "rgba(255, 255, 255, 0.01)" }}>
                  <h4 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: 0 }}>Tasa de Intervención Objetiva por Marca</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0 }}>
                    Establece el porcentaje objetivo de financiamientos sobre las matriculaciones de cada marca en el mes.
                  </p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
                    {marcas.filter(m => !!m.sistema_comisiones).map((brand) => {
                      const rateObj = brandInterventionRates.find(r => r.id_marca === brand.id) || {
                        id_marca: brand.id,
                        tasa_intervencion: 70
                      };

                      const handleInterventionChange = (newVal: number) => {
                        const existingIdx = brandInterventionRates.findIndex(r => r.id_marca === brand.id);
                        if (existingIdx !== -1) {
                          const updated = [...brandInterventionRates];
                          updated[existingIdx] = { ...updated[existingIdx], tasa_intervencion: newVal };
                          setBrandInterventionRates(updated);
                        } else {
                          setBrandInterventionRates([...brandInterventionRates, { id_marca: brand.id, tasa_intervencion: newVal }]);
                        }
                      };

                      return (
                        <div key={brand.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{brand.nombre}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="number"
                              className="form-input"
                              value={rateObj.tasa_intervencion}
                              onChange={(e) => handleInterventionChange(Number(e.target.value))}
                              disabled={!isAdmin}
                              style={{ width: "80px", textAlign: "right", padding: "6px" }}
                              min={0}
                              max={100}
                            />
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bloque Derecho (Extremo): Valor Objetivo por Defecto */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, minWidth: "300px", maxWidth: "450px", padding: "24px", background: "rgba(255, 255, 255, 0.01)" }}>
                  <h4 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: 0 }}>Valor Objetivo por Defecto por Marca</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0 }}>
                    Establece el valor objetivo / multiplicador por defecto que se asignará a cada expediente nuevo según su marca.
                  </p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
                    {marcas.filter(m => !!m.sistema_comisiones).map((brand) => {
                      const rateObj = brandInterventionRates.find(r => r.id_marca === brand.id) || {
                        id_marca: brand.id,
                        valor_objetivo_defecto: 1.0
                      };

                      const handleDefaultObjectiveChange = (newVal: number) => {
                        const existingIdx = brandInterventionRates.findIndex(r => r.id_marca === brand.id);
                        if (existingIdx !== -1) {
                          const updated = [...brandInterventionRates];
                          updated[existingIdx] = { ...updated[existingIdx], valor_objetivo_defecto: newVal };
                          setBrandInterventionRates(updated);
                        } else {
                          setBrandInterventionRates([...brandInterventionRates, { id_marca: brand.id, valor_objetivo_defecto: newVal }]);
                        }
                      };

                      return (
                        <div key={brand.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{brand.nombre}</span>
                          <select
                            className="form-select"
                            value={rateObj.valor_objetivo_defecto !== undefined ? rateObj.valor_objetivo_defecto : 1.0}
                            onChange={(e) => handleDefaultObjectiveChange(Number(e.target.value))}
                            disabled={!isAdmin}
                            style={{ width: "90px", padding: "4px 8px" }}
                          >
                            <option value={0}>0</option>
                            <option value={0.5}>0.5</option>
                            <option value={1}>1</option>
                            <option value={1.5}>1.5</option>
                            <option value={2}>2</option>
                            <option value={2.5}>2.5</option>
                            <option value={3}>3</option>
                            <option value={3.5}>3.5</option>
                            <option value={4}>4</option>
                          </select>
                        </div>
                      );
                    })}

                    <div style={{ borderBottom: "1px solid var(--border-light)", margin: "12px 0 8px 0" }} />

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                        Cupo Ventas Multiplicadas Requerido (Mes)
                      </label>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", margin: "2px 0 8px 0", lineHeight: "1.25" }}>
                        Número mínimo de ventas con multiplicador &gt; 1 en el mes necesarias para mantener los multiplicadores en las liquidaciones.
                      </p>
                      <input
                        type="number"
                        className="form-input"
                        value={minCochesMultiplicador}
                        onChange={(e) => setMinCochesMultiplicador(Number(e.target.value))}
                        disabled={!isAdmin}
                        min={0}
                        style={{ width: "100%" }}
                      />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setBulkModalOpen(true)}
                          className="btn btn-secondary"
                          style={{
                            marginTop: "12px",
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "0.8rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px"
                          }}
                        >
                          🔄 Aplicar este cupo a expedientes en lote
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: VN MODEL RATES */}
            {activeTab === "modelos" && (() => {
              const activeBrands = marcas.filter(m => !!m.sistema_comisiones);

              if (activeBrands.length === 0) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Tarifas de Modelos VN por Tramo</h3>
                    <div className="glass-panel" style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                      ⚠️ No hay ninguna marca configurada en el sistema de comisionamiento. 
                      Ve a <strong>Configuración &gt; Marcas</strong> para activar al menos una marca.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Tarifas de Modelos VN por Tramo</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                      Define las tarifas de comisiones de coches nuevos agrupados por marcas. Cada modelo tiene 2 líneas: una para cuando la tasa de intervención real del mes sea inferior a la establecida y otra para cuando sea superior o igual.
                    </p>
                  </div>

                  {activeBrands.map(brand => {
                    const brandRates = rates.filter(r => {
                      const mId = r.id_modelo ? modelos.find(m => m.id === r.id_modelo)?.marca_id : null;
                      return mId === brand.id;
                    });

                    // Clipboard: copiar valores de una línea
                    const handleCopyRate = (r: any) => {
                      setRateClipboard({
                        rate_x_minus_4: r.rate_x_minus_4 || 0,
                        rate_x_minus_3: r.rate_x_minus_3 || 0,
                        rate_x_minus_2: r.rate_x_minus_2 || 0,
                        rate_x_minus_1: r.rate_x_minus_1 || 0,
                        rate_x: r.rate_x || 0,
                        rate_x_plus_1: r.rate_x_plus_1 || 0,
                        rate_x_plus_2: r.rate_x_plus_2 || 0,
                        rate_x_plus_3: r.rate_x_plus_3 || 0,
                        activo: r.activo !== false,
                      });
                      showNotification("Valores copiados al portapapeles. Usa 📋 Pegar en otra línea.", "success");
                    };

                    const handlePasteRate = (targetRate: any) => {
                      if (!rateClipboard) {
                        showNotification("No hay valores en el portapapeles. Copia primero con 📄 Copiar.", "error");
                        return;
                      }
                      const updated = rates.map(item => {
                        if (item === targetRate) {
                          return { ...item, ...rateClipboard };
                        }
                        return item;
                      });
                      setRates(updated);
                      showNotification("Valores pegados correctamente.", "success");
                    };

                    const handleCopyModel = (less: any, more: any) => {
                      setModelClipboard({
                        rate_x_minus_4_less: less.rate_x_minus_4 || 0,
                        rate_x_minus_3_less: less.rate_x_minus_3 || 0,
                        rate_x_minus_2_less: less.rate_x_minus_2 || 0,
                        rate_x_minus_1_less: less.rate_x_minus_1 || 0,
                        rate_x_less: less.rate_x || 0,
                        rate_x_plus_1_less: less.rate_x_plus_1 || 0,
                        rate_x_plus_2_less: less.rate_x_plus_2 || 0,
                        rate_x_plus_3_less: less.rate_x_plus_3 || 0,
                        
                        rate_x_minus_4_more: more.rate_x_minus_4 || 0,
                        rate_x_minus_3_more: more.rate_x_minus_3 || 0,
                        rate_x_minus_2_more: more.rate_x_minus_2 || 0,
                        rate_x_minus_1_more: more.rate_x_minus_1 || 0,
                        rate_x_more: more.rate_x || 0,
                        rate_x_plus_1_more: more.rate_x_plus_1 || 0,
                        rate_x_plus_2_more: more.rate_x_plus_2 || 0,
                        rate_x_plus_3_more: more.rate_x_plus_3 || 0,
                      });
                      showNotification("Valores de tasas (ambas filas) del modelo copiados al portapapeles.", "success");
                    };

                    const handlePasteModel = (targetModelId: number) => {
                      if (!modelClipboard) {
                        showNotification("No hay valores de modelo en el portapapeles. Copia primero con 📦 Copiar Modelo.", "error");
                        return;
                      }
                      const updated = rates.map(item => {
                        if (item.id_modelo === targetModelId) {
                          if (!item.tasa_intervencion_cumplida) {
                            return {
                              ...item,
                              rate_x_minus_4: modelClipboard.rate_x_minus_4_less,
                              rate_x_minus_3: modelClipboard.rate_x_minus_3_less,
                              rate_x_minus_2: modelClipboard.rate_x_minus_2_less,
                              rate_x_minus_1: modelClipboard.rate_x_minus_1_less,
                              rate_x: modelClipboard.rate_x_less,
                              rate_x_plus_1: modelClipboard.rate_x_plus_1_less,
                              rate_x_plus_2: modelClipboard.rate_x_plus_2_less,
                              rate_x_plus_3: modelClipboard.rate_x_plus_3_less,
                            };
                          } else {
                            return {
                              ...item,
                              rate_x_minus_4: modelClipboard.rate_x_minus_4_more,
                              rate_x_minus_3: modelClipboard.rate_x_minus_3_more,
                              rate_x_minus_2: modelClipboard.rate_x_minus_2_more,
                              rate_x_minus_1: modelClipboard.rate_x_minus_1_more,
                              rate_x: modelClipboard.rate_x_more,
                              rate_x_plus_1: modelClipboard.rate_x_plus_1_more,
                              rate_x_plus_2: modelClipboard.rate_x_plus_2_more,
                              rate_x_plus_3: modelClipboard.rate_x_plus_3_more,
                            };
                          }
                        }
                        return item;
                      });
                      setRates(updated);
                      showNotification("Comisiones del modelo pegadas correctamente.", "success");
                    };

                    const handleApplyRatesToAllBelow = (firstModelId: number) => {
                      const firstModelRates = brandRates.filter(r => r.id_modelo === firstModelId);
                      const lessSrc = firstModelRates.find(r => !r.tasa_intervencion_cumplida);
                      const moreSrc = firstModelRates.find(r => !!r.tasa_intervencion_cumplida);

                      if (!lessSrc || !moreSrc) {
                        showNotification("El primer modelo no tiene sus tarifas configuradas", "error");
                        return;
                      }

                      const firstModelName = modelos.find(m => m.id === firstModelId)?.nombre || "";
                      if (!confirm(`¿Estás seguro de aplicar las tarifas del modelo "${firstModelName}" a todos los demás modelos de la marca ${brand.nombre}?`)) return;

                      const updated = rates.map(item => {
                        const itemModelObj = modelos.find(m => m.id === item.id_modelo);
                        if (itemModelObj && itemModelObj.marca_id === brand.id && item.id_modelo !== firstModelId) {
                          if (!item.tasa_intervencion_cumplida) {
                            return {
                              ...item,
                              rate_x_minus_4: lessSrc.rate_x_minus_4 || 0,
                              rate_x_minus_3: lessSrc.rate_x_minus_3 || 0,
                              rate_x_minus_2: lessSrc.rate_x_minus_2 || 0,
                              rate_x_minus_1: lessSrc.rate_x_minus_1 || 0,
                              rate_x: lessSrc.rate_x || 0,
                              rate_x_plus_1: lessSrc.rate_x_plus_1 || 0,
                              rate_x_plus_2: lessSrc.rate_x_plus_2 || 0,
                              rate_x_plus_3: lessSrc.rate_x_plus_3 || 0,
                            };
                          } else {
                            return {
                              ...item,
                              rate_x_minus_4: moreSrc.rate_x_minus_4 || 0,
                              rate_x_minus_3: moreSrc.rate_x_minus_3 || 0,
                              rate_x_minus_2: moreSrc.rate_x_minus_2 || 0,
                              rate_x_minus_1: moreSrc.rate_x_minus_1 || 0,
                              rate_x: moreSrc.rate_x || 0,
                              rate_x_plus_1: moreSrc.rate_x_plus_1 || 0,
                              rate_x_plus_2: moreSrc.rate_x_plus_2 || 0,
                              rate_x_plus_3: moreSrc.rate_x_plus_3 || 0,
                            };
                          }
                        }
                        return item;
                      });

                      setRates(updated);
                      showNotification("Tarifas aplicadas a todos los modelos de la marca correctamente.", "success");
                    };

                    // Reordering helpers
                    const handleMoveModel = (currentModelIds: number[], modelId: number, direction: "up" | "down") => {
                      const idx = currentModelIds.indexOf(modelId);
                      if (idx === -1) return;
                      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
                      if (swapIdx < 0 || swapIdx >= currentModelIds.length) return;
                      const newOrder = [...currentModelIds];
                      [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
                      setModelOrder(prev => ({ ...prev, [brand.id]: newOrder }));
                    };

                    // Model change handler
                    const handleChangeModel = (oldModelId: number, newModelId: number) => {
                      const updated = rates.map(item => {
                        if (item.id_modelo === oldModelId) {
                          return { ...item, id_modelo: newModelId };
                        }
                        return item;
                      });
                      setRates(updated);
                      // Update model order if exists
                      if (modelOrder[brand.id]) {
                        setModelOrder(prev => ({
                          ...prev,
                          [brand.id]: prev[brand.id].map(id => id === oldModelId ? newModelId : id)
                        }));
                      }
                      const newModelName = modelos.find(m => m.id === newModelId)?.nombre || "modelo";
                      showNotification(`Modelo cambiado a ${newModelName} correctamente.`, "success");
                    };

                    return (
                      <div key={brand.id} className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(255, 255, 255, 0.01)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            📦 Modelos de {brand.nombre}
                          </h4>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            {rateClipboard && (
                              <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>📋 Línea copiada</span>
                            )}
                            {modelClipboard && (
                              <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>📦 Modelo copiado</span>
                            )}
                          </div>
                        </div>

                        <div className="table-container">
                          <table className="table-premium" style={{ fontSize: "0.9rem" }}>
                            <thead>
                              <tr>
                                {isAdmin && <th style={{ width: "50px", textAlign: "center" }}>Orden</th>}
                                <th style={{ minWidth: "140px" }}>Modelo</th>
                                <th>Tasa Intervención</th>
                                <th style={{ width: "80px" }}>X - 4</th>
                                <th style={{ width: "80px" }}>X - 3</th>
                                <th style={{ width: "80px" }}>X - 2</th>
                                <th style={{ width: "80px" }}>X - 1</th>
                                <th style={{ width: "80px" }}>X</th>
                                <th style={{ width: "80px" }}>X + 1</th>
                                <th style={{ width: "80px" }}>X + 2</th>
                                <th style={{ width: "80px" }}>X + 3</th>
                                <th style={{ width: "70px", textAlign: "center" }}>Activo</th>
                                {isAdmin && <th style={{ width: "150px" }}>Acciones</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Get all unique model IDs for this brand in the rates
                                let sortedModelIds = Array.from(new Set(brandRates.map(r => r.id_modelo).filter(Boolean)));
                                
                                // Use custom order if set, otherwise alphabetical
                                if (modelOrder[brand.id] && modelOrder[brand.id].length > 0) {
                                  const customOrder = modelOrder[brand.id];
                                  // Keep models that exist in rates, in custom order, then any new ones appended
                                  const ordered = customOrder.filter(id => sortedModelIds.includes(id));
                                  const remaining = sortedModelIds.filter(id => !ordered.includes(id));
                                  remaining.sort((a, b) => {
                                    const na = modelos.find(m => m.id === a)?.nombre || "";
                                    const nb = modelos.find(m => m.id === b)?.nombre || "";
                                    return na.localeCompare(nb);
                                  });
                                  sortedModelIds = [...ordered, ...remaining];
                                } else {
                                  sortedModelIds.sort((idA, idB) => {
                                    const nameA = modelos.find(m => m.id === idA)?.nombre || "";
                                    const nameB = modelos.find(m => m.id === idB)?.nombre || "";
                                    return nameA.localeCompare(nameB);
                                  });
                                }

                                if (sortedModelIds.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={15} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                                        No hay modelos de {brand.nombre} configurados en este plan.
                                      </td>
                                    </tr>
                                  );
                                }

                                const rateObj = brandInterventionRates.find(ir => ir.id_marca === brand.id) || { tasa_intervencion: 70 };
                                const targetIntervention = rateObj.tasa_intervencion;

                                // Models already used in this brand's rates (for dropdown filtering)
                                const usedModelIds = new Set(sortedModelIds);
                                const availableModelsForSwap = modelos.filter(m => m.marca_id === brand.id);

                                return sortedModelIds.map((modelId, modelIdx) => {
                                  const modelRates = brandRates.filter(r => r.id_modelo === modelId);
                                  
                                  let rateLess = modelRates.find(r => !r.tasa_intervencion_cumplida);
                                  let rateMore = modelRates.find(r => !!r.tasa_intervencion_cumplida);

                                  const modelName = modelos.find(m => m.id === modelId)?.nombre || "Sin Nombre";

                                  if (!rateLess) {
                                    rateLess = {
                                      id_modelo: modelId,
                                      tasa_intervencion_cumplida: false,
                                      rate_x_minus_4: 70, rate_x_minus_3: 80, rate_x_minus_2: 90, rate_x_minus_1: 100,
                                      rate_x: 120, rate_x_plus_1: 140, rate_x_plus_2: 160, rate_x_plus_3: 180,
                                      valor_objetivo: 1, activo: true,
                                    };
                                  }
                                  if (!rateMore) {
                                    rateMore = {
                                      id_modelo: modelId,
                                      tasa_intervencion_cumplida: true,
                                      rate_x_minus_4: 90, rate_x_minus_3: 100, rate_x_minus_2: 110, rate_x_minus_1: 120,
                                      rate_x: 140, rate_x_plus_1: 160, rate_x_plus_2: 180, rate_x_plus_3: 200,
                                      valor_objetivo: rateLess.valor_objetivo || 1,
                                      activo: rateLess.activo !== undefined ? rateLess.activo : true,
                                    };
                                  }

                                  const handleSpecificChange = (targetRate: any, field: string, val: any) => {
                                    const updated = rates.map(item => {
                                      if (item === targetRate || (item.id_modelo === modelId && item.tasa_intervencion_cumplida === targetRate.tasa_intervencion_cumplida && item.id_rate === targetRate.id_rate)) {
                                        return { ...item, [field]: val };
                                      }
                                      return item;
                                    });
                                    setRates(updated);
                                  };

                                  const handleDeleteModel = () => {
                                    setRates(rates.filter(item => item.id_modelo !== modelId));
                                    showNotification(`Modelo ${modelName} y sus tarifas eliminados con éxito`, "success");
                                  };

                                  // Dropdown options: current model + any unused models of this brand
                                  const dropdownOptions = availableModelsForSwap.filter(m => m.id === modelId || !usedModelIds.has(m.id));

                                  const isFirst = modelIdx === 0;
                                  const isLast = modelIdx === sortedModelIds.length - 1;

                                  return (
                                    <Fragment key={modelId}>
                                      {/* Fila 1: Tasa >= Target */}
                                      <tr style={{ borderBottom: "none" }}>
                                        {isAdmin && (
                                          <td rowSpan={2} style={{ textAlign: "center", verticalAlign: "middle", borderBottom: "1px solid var(--border-light)", padding: "4px" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                                              <button
                                                type="button"
                                                onClick={() => handleMoveModel(sortedModelIds, modelId, "up")}
                                                disabled={isFirst}
                                                style={{
                                                  border: "none", background: isFirst ? "transparent" : "rgba(255,255,255,0.05)",
                                                  cursor: isFirst ? "default" : "pointer", padding: "2px 6px", borderRadius: "4px",
                                                  fontSize: "0.9rem", color: isFirst ? "var(--text-muted)" : "var(--text-primary)",
                                                  opacity: isFirst ? 0.3 : 1, transition: "all 0.15s"
                                                }}
                                                title="Subir"
                                              >▲</button>
                                              <button
                                                type="button"
                                                onClick={() => handleMoveModel(sortedModelIds, modelId, "down")}
                                                disabled={isLast}
                                                style={{
                                                  border: "none", background: isLast ? "transparent" : "rgba(255,255,255,0.05)",
                                                  cursor: isLast ? "default" : "pointer", padding: "2px 6px", borderRadius: "4px",
                                                  fontSize: "0.9rem", color: isLast ? "var(--text-muted)" : "var(--text-primary)",
                                                  opacity: isLast ? 0.3 : 1, transition: "all 0.15s"
                                                }}
                                                title="Bajar"
                                              >▼</button>
                                            </div>
                                          </td>
                                        )}
                                        <td rowSpan={2} style={{ fontWeight: 600, color: "var(--text-primary)", verticalAlign: "middle", borderBottom: "1px solid var(--border-light)" }}>
                                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            {isAdmin && dropdownOptions.length > 1 ? (
                                              <select
                                                className="form-select"
                                                value={modelId}
                                                onChange={(e) => handleChangeModel(modelId, Number(e.target.value))}
                                                style={{ fontWeight: 600, fontSize: "0.85rem", padding: "4px 8px", width: "100%" }}
                                              >
                                                {dropdownOptions.map(m => (
                                                  <option key={m.id} value={m.id}>{m.nombre}</option>
                                                ))}
                                              </select>
                                            ) : (
                                              <span>{modelName}</span>
                                            )}

                                            {isAdmin && (
                                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <button
                                                  type="button"
                                                  onClick={() => handleCopyModel(rateLess, rateMore)}
                                                  style={{
                                                    border: "none", background: "rgba(124, 58, 237, 0.08)",
                                                    cursor: "pointer", padding: "4px 8px", borderRadius: "4px",
                                                    fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600,
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"
                                                  }}
                                                  title="Copiar comisiones de este modelo (ambas tasas)"
                                                >
                                                  📦 Copiar Modelo
                                                </button>
                                                {modelClipboard && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handlePasteModel(modelId)}
                                                    style={{
                                                      border: "none", background: "rgba(16, 185, 129, 0.1)",
                                                      cursor: "pointer", padding: "4px 8px", borderRadius: "4px",
                                                      fontSize: "0.7rem", color: "var(--success)", fontWeight: 600,
                                                      display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"
                                                    }}
                                                    title="Pegar comisiones del modelo copiado"
                                                  >
                                                    📋 Pegar Modelo
                                                  </button>
                                                )}
                                                {isFirst && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleApplyRatesToAllBelow(modelId)}
                                                    style={{
                                                      border: "none", background: "rgba(59, 130, 246, 0.08)",
                                                      cursor: "pointer", padding: "4px 8px", borderRadius: "4px",
                                                      fontSize: "0.7rem", color: "#2563eb", fontWeight: 600,
                                                      display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                                                      marginTop: "2px"
                                                    }}
                                                    title="Aplicar tarifas de este modelo a todos los inferiores de esta marca"
                                                  >
                                                    👇 Aplicar a los de abajo
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ color: "var(--success)", fontWeight: 600, verticalAlign: "middle" }}>
                                          Tasa ≥ {targetIntervention}%
                                        </td>
                                        {["rate_x_minus_4", "rate_x_minus_3", "rate_x_minus_2", "rate_x_minus_1", "rate_x", "rate_x_plus_1", "rate_x_plus_2", "rate_x_plus_3"].map((col) => (
                                          <td key={col} style={{ borderBottom: "none" }}>
                                            <input
                                              type="number"
                                              className="form-input"
                                              value={rateMore[col] || 0}
                                              onChange={(e) => handleSpecificChange(rateMore, col, Number(e.target.value))}
                                              disabled={!isAdmin}
                                              style={{ padding: "4px 8px", fontSize: "0.85rem", width: "75px" }}
                                            />
                                          </td>
                                        ))}
                                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                          <input
                                            type="checkbox"
                                            checked={rateMore.activo !== false}
                                            onChange={(e) => handleSpecificChange(rateMore, "activo", e.target.checked)}
                                            disabled={!isAdmin}
                                          />
                                        </td>
                                        {isAdmin && (
                                          <td style={{ verticalAlign: "middle" }}>
                                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                              <button type="button" onClick={() => handleCopyRate(rateMore)}
                                                style={{ border: "none", background: "rgba(124,58,237,0.06)", cursor: "pointer", padding: "3px 7px", borderRadius: "4px", fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600 }}
                                                title="Copiar valores de esta línea">📄 Copiar</button>
                                              {rateClipboard && (
                                                <button type="button" onClick={() => handlePasteRate(rateMore)}
                                                  style={{ border: "none", background: "rgba(16,185,129,0.08)", cursor: "pointer", padding: "3px 7px", borderRadius: "4px", fontSize: "0.7rem", color: "var(--success)", fontWeight: 600 }}
                                                  title="Pegar valores del portapapeles">📋 Pegar</button>
                                              )}
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                      {/* Fila 2: Tasa < Target */}
                                      <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                                        <td style={{ color: "var(--danger)", fontWeight: 600, verticalAlign: "middle", borderBottom: "1px solid var(--border-light)" }}>
                                          Tasa {"<"} {targetIntervention}%
                                        </td>
                                        {["rate_x_minus_4", "rate_x_minus_3", "rate_x_minus_2", "rate_x_minus_1", "rate_x", "rate_x_plus_1", "rate_x_plus_2", "rate_x_plus_3"].map((col) => (
                                          <td key={col} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                            <input
                                              type="number"
                                              className="form-input"
                                              value={rateLess[col] || 0}
                                              onChange={(e) => handleSpecificChange(rateLess, col, Number(e.target.value))}
                                              disabled={!isAdmin}
                                              style={{ padding: "4px 8px", fontSize: "0.85rem", width: "75px" }}
                                            />
                                          </td>
                                        ))}
                                        <td style={{ textAlign: "center", verticalAlign: "middle", borderBottom: "1px solid var(--border-light)" }}>
                                          <input
                                            type="checkbox"
                                            checked={rateLess.activo !== false}
                                            onChange={(e) => handleSpecificChange(rateLess, "activo", e.target.checked)}
                                            disabled={!isAdmin}
                                          />
                                        </td>
                                        {isAdmin && (
                                          <td style={{ verticalAlign: "middle", borderBottom: "1px solid var(--border-light)" }}>
                                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                              <button type="button" onClick={() => handleCopyRate(rateLess)}
                                                style={{ border: "none", background: "rgba(124,58,237,0.06)", cursor: "pointer", padding: "3px 7px", borderRadius: "4px", fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600 }}
                                                title="Copiar valores de esta línea">📄 Copiar</button>
                                              {rateClipboard && (
                                                <button type="button" onClick={() => handlePasteRate(rateLess)}
                                                  style={{ border: "none", background: "rgba(16,185,129,0.08)", cursor: "pointer", padding: "3px 7px", borderRadius: "4px", fontSize: "0.7rem", color: "var(--success)", fontWeight: 600 }}
                                                  title="Pegar valores del portapapeles">📋 Pegar</button>
                                              )}
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    </Fragment>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* TAB: USADOS / VO */}
            {activeTab === "usados" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Tarifas de Vehículos Usados (BB / KM0 / etc.)</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                    Parámetros generales de cobro para vehículos usados no progresivos (Buyback, KM0, etc.). Las comisiones se pagan de forma diferencial: primera unidad vs unidades siguientes (resto), si se cumple con el mínimo de unidades a aplicar en el mes.
                  </p>

                  <div className="table-container">
                    <table className="table-premium" style={{ fontSize: "0.9rem" }}>
                      <thead>
                        <tr>
                          <th>Tipo de Usado</th>
                          <th style={{ width: "120px", textAlign: "center" }}>Valor Objetivo</th>
                          <th style={{ width: "150px" }}>1ª Unidad (€)</th>
                          <th style={{ width: "150px" }}>Siguientes (€)</th>
                          <th style={{ width: "120px", textAlign: "center" }}>Mín. Aplicar</th>
                          <th style={{ width: "100px", textAlign: "center" }}>Activo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usedRates.map((u, idx) => {
                          const handleChange = (field: string, val: any) => {
                            const updated = [...usedRates];
                            updated[idx] = { ...updated[idx], [field]: val };
                            setUsedRates(updated);
                          };

                          return (
                            <tr key={u.id_used_rate || idx}>
                              <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{u.tipo_usado}</td>
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={u.valor_objetivo}
                                  onChange={(e) => handleChange("valor_objetivo", Number(e.target.value))}
                                  disabled={!isAdmin}
                                  style={{ padding: "4px 8px", width: "80px", margin: "0 auto" }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={u.importe_primera}
                                  onChange={(e) => handleChange("importe_primera", Number(e.target.value))}
                                  disabled={!isAdmin}
                                  style={{ padding: "4px 8px", width: "120px" }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={u.importe_resto}
                                  onChange={(e) => handleChange("importe_resto", Number(e.target.value))}
                                  disabled={!isAdmin}
                                  style={{ padding: "4px 8px", width: "120px" }}
                                />
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={u.min_aplicar}
                                  onChange={(e) => handleChange("min_aplicar", Number(e.target.value))}
                                  disabled={!isAdmin}
                                  style={{ padding: "4px 8px", width: "80px", margin: "0 auto" }}
                                />
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={u.activo}
                                  onChange={(e) => handleChange("activo", e.target.checked)}
                                  disabled={!isAdmin}
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {usedRates.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                              No hay tarifas de vehículos usados configuradas en el plan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ marginTop: "32px", borderTop: "1px solid var(--border-light)", paddingTop: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Patrones de Comisionamiento Progresivos VO</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                        Define esquemas progresivos para vendedores de VO. Cada patrón indica cuánto se comisiona y cuántos puntos aporta cada unidad vendida en orden secuencial (unidad 1, unidad 2, etc.).
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          const newPattern = {
                            nombre: `Patrón VO ${voPatterns.length + 1}`,
                            activo: true,
                            tiers: [
                              { unidad: 1, importe: 150, valor_objetivo: 1 },
                              { unidad: 2, importe: 180, valor_objetivo: 1 },
                              { unidad: 3, importe: 200, valor_objetivo: 1 }
                            ]
                          };
                          setVoPatterns([...voPatterns, newPattern]);
                        }}
                      >
                        ➕ Añadir Nuevo Patrón VO
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {voPatterns.map((pat, pIdx) => {
                      let tiersList: any[] = [];
                      try {
                        tiersList = typeof pat.tiers === "string" ? JSON.parse(pat.tiers) : (pat.tiers || []);
                      } catch (e) {
                        tiersList = [];
                      }

                      const updatePatternName = (newName: string) => {
                        const updated = [...voPatterns];
                        updated[pIdx] = { ...updated[pIdx], nombre: newName };
                        setVoPatterns(updated);
                      };

                      const updateTiers = (newTiers: any[]) => {
                        const updated = [...voPatterns];
                        updated[pIdx] = { ...updated[pIdx], tiers: newTiers };
                        setVoPatterns(updated);
                      };

                      const handleAddTier = () => {
                        const nextUnit = tiersList.length + 1;
                        const lastTier = tiersList[tiersList.length - 1] || { importe: 150, valor_objetivo: 1 };
                        const newTiers = [...tiersList, { unidad: nextUnit, importe: lastTier.importe, valor_objetivo: lastTier.valor_objetivo }];
                        updateTiers(newTiers);
                      };

                      const handleRemoveTier = (tIdx: number) => {
                        const newTiers = tiersList.filter((_, i) => i !== tIdx).map((t, idx) => ({
                          ...t,
                          unidad: idx + 1
                        }));
                        updateTiers(newTiers);
                      };

                      const handleTierChange = (tIdx: number, field: string, val: any) => {
                        const newTiers = [...tiersList];
                        newTiers[tIdx] = { ...newTiers[tIdx], [field]: val };
                        updateTiers(newTiers);
                      };

                      const handleRemovePattern = () => {
                        if (!confirm(`¿Estás seguro de eliminar el patrón "${pat.nombre}"?`)) return;
                        setVoPatterns(voPatterns.filter((_, i) => i !== pIdx));
                      };

                      return (
                        <div key={pIdx} className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(255, 255, 255, 0.02)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "200px" }}>
                              <span style={{ fontSize: "1.1rem" }}>📋</span>
                              <input
                                type="text"
                                className="form-input"
                                value={pat.nombre}
                                onChange={(e) => updatePatternName(e.target.value)}
                                disabled={!isAdmin}
                                style={{ fontWeight: 600, fontSize: "1rem", border: "none", background: "transparent", borderBottom: "1px dashed var(--border-light)", padding: "2px 6px", width: "250px" }}
                              />
                            </div>
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn"
                                onClick={handleRemovePattern}
                                style={{
                                  padding: "4px 8px", fontSize: "0.75rem", color: "var(--danger)",
                                  background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)",
                                  borderRadius: "var(--radius-sm)", cursor: "pointer"
                                }}
                              >
                                🗑️ Eliminar Patrón
                              </button>
                            )}
                          </div>

                          <div className="table-container">
                            <table className="table-premium" style={{ fontSize: "0.85rem" }}>
                              <thead>
                                <tr>
                                  <th style={{ width: "80px", textAlign: "center" }}>Secuencia</th>
                                  <th>Unidad Vendida</th>
                                  <th style={{ width: "150px" }}>Comisión (€)</th>
                                  <th style={{ width: "150px", textAlign: "center" }}>Valor Objetivo (Puntos)</th>
                                  {isAdmin && <th style={{ width: "80px" }}>Acción</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {tiersList.map((t, tIdx) => (
                                  <tr key={tIdx}>
                                    <td style={{ textAlign: "center", fontWeight: 600, color: "var(--text-secondary)" }}>#{tIdx + 1}</td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                                      {t.unidad === 1 ? "1ª Unidad de VO" : `${t.unidad}ª Unidad de VO`}
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className="form-input"
                                        value={t.importe}
                                        onChange={(e) => handleTierChange(tIdx, "importe", Number(e.target.value))}
                                        disabled={!isAdmin}
                                        style={{ padding: "4px 8px", width: "100px" }}
                                      />
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <input
                                        type="number"
                                        className="form-input"
                                        value={t.valor_objetivo}
                                        onChange={(e) => handleTierChange(tIdx, "valor_objetivo", Number(e.target.value))}
                                        disabled={!isAdmin}
                                        style={{ padding: "4px 8px", width: "80px", margin: "0 auto" }}
                                      />
                                    </td>
                                    {isAdmin && (
                                      <td>
                                        <button
                                          type="button"
                                          className="btn"
                                          onClick={() => handleRemoveTier(tIdx)}
                                          style={{
                                            padding: "2px 6px", fontSize: "0.7rem", color: "var(--danger)",
                                            background: "transparent", border: "1px solid rgba(239, 68, 68, 0.15)",
                                            borderRadius: "var(--radius-sm)"
                                          }}
                                        >
                                          Quitar
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                                {tiersList.length === 0 && (
                                  <tr>
                                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px" }}>
                                      No hay tramos configurados para este patrón. Añade el primer tramo.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {isAdmin && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleAddTier}
                                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                              >
                                ➕ Añadir Tramo (Unidad {tiersList.length + 1})
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {voPatterns.length === 0 && (
                      <div className="glass-panel" style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                        No hay patrones de comisionamiento de VO configurados. Haz clic en &quot;Añadir Nuevo Patrón VO&quot; para empezar.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* TAB: REGLAS */}
            {activeTab === "reglas" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Financiación / Reglas del Plan</h3>
                
                {isAdmin && (
                  <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(255, 255, 255, 0.02)" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem" }}>Añadir Nueva Regla</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                      <div className="form-group">
                        <label className="form-label">Nombre de la Regla</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newRuleName}
                          onChange={(e) => setNewRuleName(e.target.value)}
                          placeholder="Ej. Comisión Afectación Dacia"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Tipo de Evento / Trigger</label>
                        <select
                          className="form-select"
                          value={newRuleType}
                          onChange={(e) => setNewRuleType(e.target.value)}
                        >
                          <option value="pedido">Pedido (Fecha de Pedido)</option>
                          <option value="afectacion">Afectación (Fecha de Afectación)</option>
                          <option value="matriculacion">Matriculación (Fecha de Matriculación)</option>
                          <option value="financiacion">Financiación (Cualquier Financiación)</option>
                          <option value="preference">Preference (Financiación Preference)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Filtrar por Marca (Opcional)</label>
                        <select
                          className="form-select"
                          value={newRuleMarca}
                          onChange={(e) => {
                            setNewRuleMarca(e.target.value);
                            setNewRuleModelo("");
                          }}
                        >
                          <option value="">Todas las marcas</option>
                          {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Filtrar por Modelo (Opcional)</label>
                        <select
                          className="form-select"
                          value={newRuleModelo}
                          onChange={(e) => setNewRuleModelo(e.target.value)}
                          disabled={!newRuleMarca}
                        >
                          <option value="">Todos los modelos</option>
                          {modelos.filter(m => m.marca_id === Number(newRuleMarca)).map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Tasa Intervención Financiera</label>
                        <select
                          className="form-select"
                          value={newRuleTasaIntervencion}
                          onChange={(e) => setNewRuleTasaIntervencion(e.target.value)}
                        >
                          <option value="">Cualquiera / Siempre</option>
                          <option value="true">Tasa ≥ Objetivo (Tasa OK)</option>
                          <option value="false">Tasa &lt; Objetivo (Tasa Baja)</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "8px", paddingTop: "28px" }}>
                        <input
                          type="checkbox"
                          id="ruleAfectaObj"
                          checked={newRuleAfectaObj}
                          onChange={(e) => setNewRuleAfectaObj(e.target.checked)}
                        />
                        <label htmlFor="ruleAfectaObj" style={{ cursor: "pointer", fontSize: "0.85rem" }}>Afecta al objetivo</label>
                      </div>

                      {newRuleAfectaObj && (
                        <div className="form-group">
                          <label className="form-label">Valor para objetivo</label>
                          <input
                            type="number"
                            className="form-input"
                            value={newRuleValObj}
                            onChange={(e) => setNewRuleValObj(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "8px", paddingTop: "28px" }}>
                        <input
                          type="checkbox"
                          id="ruleAfectaCom"
                          checked={newRuleAfectaCom}
                          onChange={(e) => setNewRuleAfectaCom(e.target.checked)}
                        />
                        <label htmlFor="ruleAfectaCom" style={{ cursor: "pointer", fontSize: "0.85rem" }}>Afecta comisión económica</label>
                      </div>

                      {newRuleAfectaCom && (
                        <div className="form-group">
                          <label className="form-label">Importe (€)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={newRuleImporte}
                            onChange={(e) => setNewRuleImporte(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleAddRule}
                      className="btn btn-secondary"
                      style={{ alignSelf: "flex-end", padding: "10px 20px" }}
                    >
                      ➕ Añadir Regla al Plan
                    </button>
                  </div>
                )}

                <div className="table-container">
                  <table className="table-premium" style={{ fontSize: "0.9rem" }}>
                    <thead>
                      <tr>
                        <th>Nombre de la Regla</th>
                        <th>Trigger</th>
                        <th>Filtro Marca</th>
                        <th>Filtro Modelo</th>
                        <th>Tasa Financ.</th>
                        <th style={{ textAlign: "center" }}>Afecta Objetivo</th>
                        <th style={{ textAlign: "center" }}>Afecta Comisión</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((r, idx) => {
                        const mName = r.id_marca ? marcas.find(m => m.id === r.id_marca)?.nombre : "Todas";
                        const modName = r.id_modelo ? modelos.find(m => m.id === r.id_modelo)?.nombre : "Todos";
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.nombre}</td>
                            <td><span className="badge badge-vendedor" style={{ fontSize: "0.7rem" }}>{r.tipo_evento}</span></td>
                            <td>{mName}</td>
                            <td>{modName}</td>
                            <td>
                              {r.tasa_intervencion_cumplida === true ? (
                                <span className="badge badge-tienda" style={{ fontSize: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>Tasa ≥ Obj.</span>
                              ) : r.tasa_intervencion_cumplida === false ? (
                                <span className="badge badge-admin" style={{ fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>Tasa &lt; Obj.</span>
                              ) : (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Cualquiera</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {r.afecta_objetivo ? `✅ (+${r.valor_objetivo})` : "❌ No"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {r.afecta_comision ? `✅ (${r.importe} €)` : "❌ No"}
                            </td>
                            <td>
                              <button
                                onClick={() => handleDeleteRule(idx)}
                                disabled={!isAdmin}
                                className="btn"
                                style={{
                                  padding: "4px 8px", fontSize: "0.75rem", color: "var(--danger)",
                                  background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)",
                                  borderRadius: "var(--radius-sm)", cursor: "pointer"
                                }}
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {rules.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                            No hay reglas especiales configuradas en el plan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: BONUS */}
            {activeTab === "bonus" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Bonus de Campaña Dinámicos</h3>
                
                {isAdmin && (
                  <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(255, 255, 255, 0.02)" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem" }}>Añadir Bonus Personalizado</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                      <div className="form-group">
                        <label className="form-label">Nombre del Bonus</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newBonusName}
                          onChange={(e) => setNewBonusName(e.target.value)}
                          placeholder="Ej. Campaña Eléctricos verano"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newBonusDesc}
                          onChange={(e) => setNewBonusDesc(e.target.value)}
                          placeholder="Breve explicación"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Trigger</label>
                        <select
                          className="form-select"
                          value={newBonusType}
                          onChange={(e) => setNewBonusType(e.target.value)}
                        >
                          <option value="pedido">Pedido</option>
                          <option value="afectacion">Afectación</option>
                          <option value="matriculacion">Matriculación</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Filtrar Marca (Opcional)</label>
                        <select
                          className="form-select"
                          value={newBonusMarca}
                          onChange={(e) => {
                            setNewBonusMarca(e.target.value);
                            setNewBonusModelo("");
                          }}
                        >
                          <option value="">Todas las marcas</option>
                          {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Filtrar Modelo (Opcional)</label>
                        <select
                          className="form-select"
                          value={newBonusModelo}
                          onChange={(e) => setNewBonusModelo(e.target.value)}
                          disabled={!newBonusMarca}
                        >
                          <option value="">Todos los modelos</option>
                          {modelos.filter(m => m.marca_id === Number(newBonusMarca)).map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Tipo de Vehículo</label>
                        <select
                          className="form-select"
                          value={newBonusTypeVehiculo}
                          onChange={(e) => setNewBonusTypeVehiculo(e.target.value)}
                        >
                          <option value="cualquiera">Cualquiera</option>
                          <option value="nuevo">Nuevo</option>
                          <option value="usado">Usado / VO</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Importe Comisión (€)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={newBonusImporte}
                          onChange={(e) => setNewBonusImporte(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "8px", paddingTop: "28px" }}>
                        <input
                          type="checkbox"
                          id="bonusAfectaObj"
                          checked={newBonusAfectaObj}
                          onChange={(e) => setNewBonusAfectaObj(e.target.checked)}
                        />
                        <label htmlFor="bonusAfectaObj" style={{ cursor: "pointer", fontSize: "0.85rem" }}>Suma al objetivo del mes</label>
                      </div>

                      {newBonusAfectaObj && (
                        <div className="form-group">
                          <label className="form-label">Valor Objetivo</label>
                          <input
                            type="number"
                            className="form-input"
                            value={newBonusValObj}
                            onChange={(e) => setNewBonusValObj(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Fecha Inicio Venta (Opcional)</label>
                        <input
                          type="date"
                          className="form-input"
                          value={newBonusStart}
                          onChange={(e) => setNewBonusStart(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Fecha Fin Venta (Opcional)</label>
                        <input
                          type="date"
                          className="form-input"
                          value={newBonusEnd}
                          onChange={(e) => setNewBonusEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddBonus}
                      className="btn btn-secondary"
                      style={{ alignSelf: "flex-end", padding: "10px 20px" }}
                    >
                      ➕ Añadir Bonus al Plan
                    </button>
                  </div>
                )}

                <div className="table-container">
                  <table className="table-premium" style={{ fontSize: "0.9rem" }}>
                    <thead>
                      <tr>
                        <th>Nombre / Descripción</th>
                        <th>Trigger</th>
                        <th>Marca/Modelo</th>
                        <th style={{ textAlign: "right" }}>Importe (€)</th>
                        <th style={{ textAlign: "center" }}>Afecta Objetivo</th>
                        <th style={{ textAlign: "center" }}>Fechas Validez</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bonusRules.map((b, idx) => {
                        const mName = b.id_marca ? marcas.find(m => m.id === b.id_marca)?.nombre : "Todas";
                        const modName = b.id_modelo ? modelos.find(m => m.id === b.id_modelo)?.nombre : "Todos";
                        const isEditing = editingBonusIdx === idx;

                        if (isEditing) {
                          return (
                            <tr key={idx} style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  value={editingBonusName} 
                                  onChange={e => setEditingBonusName(e.target.value)} 
                                  style={{ padding: "4px 8px", fontSize: "0.85rem", width: "100%", marginBottom: "4px" }} 
                                  placeholder="Nombre del bonus" 
                                />
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  value={editingBonusDesc} 
                                  onChange={e => setEditingBonusDesc(e.target.value)} 
                                  style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%" }} 
                                  placeholder="Descripción" 
                                />
                              </td>
                              <td>
                                <select 
                                  className="form-select" 
                                  value={editingBonusType} 
                                  onChange={e => setEditingBonusType(e.target.value)} 
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%", marginBottom: "4px" }}
                                >
                                  <option value="pedido">Pedido</option>
                                  <option value="afectacion">Afectación</option>
                                  <option value="matriculacion">Matriculación</option>
                                </select>
                                <select 
                                  className="form-select" 
                                  value={editingBonusTypeVehiculo} 
                                  onChange={e => setEditingBonusTypeVehiculo(e.target.value)} 
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                                >
                                  <option value="cualquiera">Cualquiera</option>
                                  <option value="nuevo">Nuevo</option>
                                  <option value="usado">Usado</option>
                                </select>
                              </td>
                              <td>
                                <select 
                                  className="form-select" 
                                  value={editingBonusMarca} 
                                  onChange={e => {
                                    setEditingBonusMarca(e.target.value);
                                    setEditingBonusModelo("");
                                  }} 
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%", marginBottom: "4px" }}
                                >
                                  <option value="">Todas</option>
                                  {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                                <select 
                                  className="form-select" 
                                  value={editingBonusModelo} 
                                  onChange={e => setEditingBonusModelo(e.target.value)} 
                                  disabled={!editingBonusMarca} 
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                                >
                                  <option value="">Todos</option>
                                  {modelos.filter(m => m.marca_id === Number(editingBonusMarca)).map(m => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <input 
                                  type="number" 
                                  className="form-input" 
                                  value={editingBonusImporte} 
                                  onChange={e => setEditingBonusImporte(e.target.value)} 
                                  style={{ padding: "4px 8px", fontSize: "0.85rem", width: "80px", textAlign: "right", display: "inline-block" }} 
                                />
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                  <label style={{ display: "flex", gap: "4px", fontSize: "0.8rem", cursor: "pointer", alignItems: "center" }}>
                                    <input 
                                      type="checkbox" 
                                      checked={editingBonusAfectaObj} 
                                      onChange={e => setEditingBonusAfectaObj(e.target.checked)} 
                                    />
                                    Sí
                                  </label>
                                  {editingBonusAfectaObj && (
                                    <input 
                                      type="number" 
                                      className="form-input" 
                                      value={editingBonusValObj} 
                                      onChange={e => setEditingBonusValObj(e.target.value)} 
                                      style={{ padding: "2px 6px", fontSize: "0.8rem", width: "60px", textAlign: "center" }} 
                                    />
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <input 
                                    type="date" 
                                    className="form-input" 
                                    value={editingBonusStart} 
                                    onChange={e => setEditingBonusStart(e.target.value)} 
                                    style={{ padding: "2px 4px", fontSize: "0.75rem", width: "110px" }} 
                                  />
                                  <input 
                                    type="date" 
                                    className="form-input" 
                                    value={editingBonusEnd} 
                                    onChange={e => setEditingBonusEnd(e.target.value)} 
                                    style={{ padding: "2px 4px", fontSize: "0.75rem", width: "110px" }} 
                                  />
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "4px", flexDirection: "column" }}>
                                  <button 
                                    onClick={() => handleSaveBonusEdit(idx)} 
                                    className="btn" 
                                    style={{ padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "var(--success)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                  >
                                    Guardar
                                  </button>
                                  <button 
                                    onClick={() => setEditingBonusIdx(null)} 
                                    className="btn btn-secondary" 
                                    style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer" }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{b.nombre}</div>
                              {b.descripcion && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{b.descripcion}</div>}
                            </td>
                            <td>
                              <span className="badge badge-tienda" style={{ fontSize: "0.7rem", marginRight: "4px" }}>{b.tipo_evento}</span>
                              <span className={`badge ${b.tipo_vehiculo === 'nuevo' ? 'badge-admin' : b.tipo_vehiculo === 'usado' ? 'badge-vendedor' : 'badge-tienda'}`} style={{ fontSize: "0.7rem" }}>
                                {b.tipo_vehiculo === 'nuevo' ? "VN" : b.tipo_vehiculo === 'usado' ? "VO" : "Cualquiera"}
                              </span>
                            </td>
                            <td>{mName} / {modName}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>{b.importe} €</td>
                            <td style={{ textAlign: "center" }}>
                              {b.afecta_objetivo ? `✅ (+${b.valor_objetivo})` : "❌ No"}
                            </td>
                            <td style={{ textAlign: "center", fontSize: "0.8rem" }}>
                              {b.fecha_inicio || b.fecha_fin ? (
                                <>
                                  {b.fecha_inicio ? formatDate(b.fecha_inicio) : " - "}
                                  {" al "}
                                  {b.fecha_fin ? formatDate(b.fecha_fin) : " - "}
                                </>
                              ) : "Siempre"}
                            </td>
                            <td>
                              {isAdmin && (
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button
                                    onClick={() => handleStartEditBonus(idx, b)}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer"
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBonus(idx)}
                                    className="btn"
                                    style={{
                                      padding: "4px 8px", fontSize: "0.75rem", color: "var(--danger)",
                                      background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)",
                                      borderRadius: "var(--radius-sm)", cursor: "pointer"
                                    }}
                                  >
                                    Quitar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {bonusRules.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                            No hay bonus de campaña dinámicos configurados en el plan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}



            {/* TAB: LIQUIDACIÓN */}
            {activeTab === "liquidacion" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>Liquidación Consolidada</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                      Analiza y consolida la liquidación económica cruzando los expedientes del mes.
                    </p>
                  </div>
                  
                  {isAdmin && (
                    <button
                      onClick={handleCalculateLiquidation}
                      disabled={calculating}
                      className="btn btn-primary"
                      style={{ padding: "12px 24px" }}
                    >
                      🔄 {calculating ? "Calculando..." : "Calcular / Recalcular Liquidación"}
                    </button>
                  )}
                </div>

                {/* SI YA TIENE LIQUIDACIÓN CALCULADA */}
                {planData.liquidations?.[0] ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* METRICAS DE LA LIQUIDACIÓN */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                      <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>UNIDADES COMPUTABLES</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--primary)", marginTop: "4px" }}>
                          {planData.liquidations[0].total_computables_snapshot} uds
                        </div>
                      </div>
                      <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>TRAMO PREDOMINANTE</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--secondary)", marginTop: "4px" }}>
                          Tramo {planData.liquidations[0].tramo_alcanzado_snapshot}
                        </div>
                      </div>
                      <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>MATRICULACIONES REALES</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "4px" }}>
                          {planData.liquidations[0].matriculaciones_reales_snapshot} uds
                        </div>
                      </div>
                      <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>MÍNIMO MATRICULACIONES</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: planData.liquidations[0].cumple_minimo_snapshot ? "var(--success)" : "var(--danger)", marginTop: "4px" }}>
                          {planData.liquidations[0].cumple_minimo_snapshot ? "✅ Cumple" : "❌ No Cumple"}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      padding: "20px 24px",
                      background: planData.liquidations[0].cumple_minimo_snapshot ? "rgba(16, 185, 129, 0.06)" : "rgba(239, 68, 68, 0.06)",
                      border: planData.liquidations[0].cumple_minimo_snapshot ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px"
                    }}>
                      <div>
                        <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                          {planData.liquidations[0].cumple_minimo_snapshot
                            ? "Comisión liquidable a pagar en el mes siguiente:"
                            : "⚠️ Penalización: Comisión económica reducida a 0 € por no alcanzar el mínimo de matriculaciones reales del periodo."}
                        </span>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          Calculada el {formatDate(planData.liquidations[0].fecha_calculo)}
                        </div>
                      </div>
                      <strong style={{ fontSize: "2rem", color: "var(--text-primary)" }}>
                        {planData.liquidations[0].total_comision_economica.toLocaleString()} €
                      </strong>
                    </div>

                    {/* DETALLE INDIVIDUAL DE LINEAS */}
                    <div>
                      <h4 style={{ fontSize: "1.05rem", color: "var(--text-primary)", marginBottom: "16px" }}>Desglose por Expediente</h4>
                      <div className="table-container">
                        <table className="table-premium" style={{ fontSize: "0.85rem" }}>
                          <thead>
                            <tr>
                              <th>Expediente</th>
                              <th>Vendedor</th>
                              <th>Cliente</th>
                              <th>Coche</th>
                              <th style={{ textAlign: "center" }}>Ingresa Por</th>
                              <th style={{ textAlign: "center" }}>Obj</th>
                              <th style={{ textAlign: "right" }}>VN Base</th>
                              <th style={{ textAlign: "right" }}>Usado</th>
                              <th style={{ textAlign: "right" }}>Finan</th>
                              <th style={{ textAlign: "right" }}>Pref/BOX3</th>
                              <th style={{ textAlign: "right" }}>Bonus</th>
                              <th style={{ textAlign: "right" }}>Total</th>
                              <th style={{ textAlign: "center" }}>Detalles</th>
                            </tr>
                          </thead>
                          <tbody>
                            {planData.liquidations[0].lines?.map((line: any) => (
                              <tr key={line.id_line}>
                                <td style={{ fontWeight: 600, color: "var(--primary)" }}>
                                  #EXP-{String(line.id_expediente).padStart(4, "0")}
                                </td>
                                <td style={{ color: "var(--text-primary)" }}>{line.vendedor_nombre}</td>
                                <td>{line.cliente_nombre}</td>
                                <td>
                                  <div style={{ fontWeight: 500 }}>{line.modelo_nombre}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{line.marca_nombre}</div>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  {line.entra_por_pedido && <span className="badge badge-vendedor" style={{ fontSize: "0.65rem", marginRight: "2px" }}>Pedido</span>}
                                  {line.entra_por_afectacion && <span className="badge badge-tienda" style={{ fontSize: "0.65rem", marginRight: "2px" }}>Afect.</span>}
                                  {line.entra_por_matriculacion && <span className="badge badge-admin" style={{ fontSize: "0.65rem" }}>Matric.</span>}
                                </td>
                                <td style={{ textAlign: "center", fontWeight: 700 }}>+{line.valor_para_objetivo}</td>
                                <td style={{ textAlign: "right" }}>{(line.comision_base_vn || 0).toLocaleString()} €</td>
                                <td style={{ textAlign: "right" }}>{(line.comision_usado || 0).toLocaleString()} €</td>
                                <td style={{ textAlign: "right" }}>{(line.comision_financiacion || 0).toLocaleString()} €</td>
                                <td style={{ textAlign: "right" }}>{(line.comision_preference || 0).toLocaleString()} €</td>
                                <td style={{ textAlign: "right" }}>{(line.bonus_acumulado || 0).toLocaleString()} €</td>
                                <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>{(line.total_generado || 0).toLocaleString()} €</td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    onClick={() => setSelectedLineDetails(line)}
                                    className="btn btn-secondary"
                                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                  >
                                    🔍 Conceptos
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>


                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                    La liquidación de este periodo aún no ha sido calculada. Haz clic en el botón de calcular arriba.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: DETALLE DE CONCEPTOS DE LÍNEA */}
      {selectedLineDetails && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              Desglose de Conceptos: Expediente #EXP-{String(selectedLineDetails.id_expediente).padStart(4, "0")}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
              {/* Cargar los items de la línea en un useEffect o directamente si están embebidos */}
              <LineDetailsItems lineId={selectedLineDetails.id_line} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-light)", paddingTop: "12px", fontSize: "0.95rem" }}>
              <span style={{ fontWeight: 600 }}>Total Final Generado:</span>
              <strong style={{ color: "var(--primary)" }}>{selectedLineDetails.total_generado} €</strong>
            </div>

            <button
              onClick={() => setSelectedLineDetails(null)}
              className="btn btn-secondary"
              style={{ padding: "10px 20px", alignSelf: "flex-end" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: CREACIÓN / CLONACIÓN DE PLAN */}
      {showCreateModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)"
        }}>
          <form onSubmit={handleCreatePlan} className="glass-panel" style={{ width: "100%", maxWidth: "450px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              {cloneFromId ? "Clonar Plan de Comisión" : "Crear Plan de Comisión"}
            </h3>

            <div className="form-group">
              <label className="form-label">Nombre del Plan</label>
              <input
                type="text"
                className="form-input"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="Ej. Plan Comisión Junio 2026"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fecha de Inicio</label>
              <input
                type="date"
                className="form-input"
                value={newPlanStart}
                onChange={(e) => setNewPlanStart(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fecha de Fin</label>
              <input
                type="date"
                className="form-input"
                value={newPlanEnd}
                onChange={(e) => setNewPlanEnd(e.target.value)}
                required
              />
            </div>

            {!cloneFromId && (
              <>
                <div className="form-group">
                  <label className="form-label">Objetivo Base (unidades)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPlanBase}
                    onChange={(e) => setNewPlanBase(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Arrastre (unidades)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPlanArrastre}
                    onChange={(e) => setNewPlanArrastre(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mínimo de Matriculaciones</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPlanMinMat}
                    onChange={(e) => setNewPlanMinMat(e.target.value)}
                  />
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Procesando..." : cloneFromId ? "Clonar Plan" : "Crear Plan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ACTUALIZACIÓN MASIVA DE CUPO DE MULTIPLICADOR */}
      {bulkModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              Aplicar Cupo a Expedientes en Lote
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
              Esta acción actualizará el campo de cupo requerido de todos los expedientes que coincidan con el mes, año y tipo de fecha seleccionados al valor actual ({minCochesMultiplicador}).
            </p>

            <div className="form-group">
              <label className="form-label">Año</label>
              <input
                type="number"
                className="form-input"
                value={bulkYear}
                onChange={(e) => setBulkYear(Number(e.target.value))}
                min={2000}
                max={2100}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mes</label>
              <select
                className="form-select"
                value={bulkMonth}
                onChange={(e) => setBulkMonth(Number(e.target.value))}
                required
              >
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Filtrar por Tipo de Fecha</label>
              <select
                className="form-select"
                value={bulkDateType}
                onChange={(e) => setBulkDateType(e.target.value)}
                required
              >
                <option value="fecha_expediente">Fecha de Creación (Expediente)</option>
                <option value="fecha_afectacion">Fecha de Afectación</option>
                <option value="fecha_matriculacion">Fecha de Matriculación</option>
                <option value="fecha_entrega">Fecha de Entrega</option>
                <option value="fecha_rci">Fecha RCI</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBulkModalOpen(false)}
                disabled={bulkSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteBulkUpdate}
                disabled={bulkSaving}
              >
                {bulkSaving ? "Aplicando..." : "Aplicar en Lote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente interno para recuperar via API los items de una línea
function LineDetailsItems({ lineId }: { lineId: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch(`/api/comisiones/liquidar?lineId=${lineId}`);
        const result = await res.json();
        if (result.success) {
          setItems(result.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [lineId]);

  if (loading) return <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Cargando desglose...</div>;

  return (
    <>
      {items.map((item, idx) => (
        <div
          key={item.id_line_item || idx}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 12px", background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "4px", border: "1px solid var(--border-light)"
          }}
        >
          <div>
            <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.85rem" }}>{item.concepto}</div>
            {item.afecta_objetivo && (
              <div style={{ fontSize: "0.75rem", color: "var(--success)" }}>Suma al Objetivo: +{item.valor_objetivo} uds</div>
            )}
          </div>
          <span style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem" }}>{item.importe} €</span>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>No hay conceptos aplicados.</div>
      )}
    </>
  );
}


