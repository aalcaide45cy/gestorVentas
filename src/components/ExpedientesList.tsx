"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/date-utils";

interface Cliente {
  id: number;
  dni: string | null;
  nombre: string | null;
  fecha_de_nacimiento?: string | null;
  emails?: { email: string; tipo_email: string | null }[] | null;
  telefonos?: { telefono: string; tipo_telefono: string | null }[] | null;
}

interface Marca {
  id_marca: number;
  nombre: string;
  activo?: boolean | null;
  acceso_rapido?: boolean | null;
  sistema_comisiones?: boolean | null;
}

interface Modelo {
  id_modelo: number;
  nombre_modelo: string;
  marca?: Marca | null;
  acceso_rapido?: boolean | null;
  orden_acceso_rapido?: number | null;
}

interface TipoDeVenta {
  id_tipo_de_venta: number;
  nombre_tipo_venta: string;
  color: string | null;
}

interface EstadoVehiculo {
  id_estado_vehiculo: number;
  nombre_estado_vehiculo: string;
  predeterminado?: boolean | null;
}

interface Usuario {
  id_usuario: number;
  nombre: string | null;
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
  matricula: string | null;
  id_tipo_de_venta: number | null;
  id_estado_vehiculo: number | null;
  vin: string | null;
  
  cliente?: Cliente | null;
  modelo?: Modelo | null;
  tipoDeVenta?: TipoDeVenta | null;
  estadoVehiculo?: EstadoVehiculo | null;
  usuario?: Usuario | null;
}

interface ExpedientesListProps {
  expedientesIniciales: Expediente[];
  userRole: string;
}

export default function ExpedientesList({ expedientesIniciales, userRole }: ExpedientesListProps) {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<Expediente[]>(expedientesIniciales);
  const [confirmDeleteExpediente, setConfirmDeleteExpediente] = useState<Expediente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para selección masiva e Importación/Exportación
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkSelectionUnlocked, setBulkSelectionUnlocked] = useState(false);

  // Estados para buscadores y filtros
  const [globalSearch, setGlobalSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterMarca, setFilterMarca] = useState("");
  const [filterModelo, setFilterModelo] = useState("");
  const [filterTipoVenta, setFilterTipoVenta] = useState("");
  const [filterEstadoVehiculo, setFilterEstadoVehiculo] = useState("");
  const [filterVendedor, setFilterVendedor] = useState("");
  const [filterFExp, setFilterFExp] = useState("");
  const [filterFAfect, setFilterFAfect] = useState("");
  const [filterFRci, setFilterFRci] = useState("");
  const [filterFMat, setFilterFMat] = useState("");
  const [filterFEntrega, setFilterFEntrega] = useState("");

  // Estados para estadísticas mensuales del final
  const todayDate = new Date();
  const [statsYear, setStatsYear] = useState<number>(todayDate.getFullYear());
  const [statsMonth, setStatsMonth] = useState<number>(todayDate.getMonth() + 1);

  // Estados de paginación (lee preferencia guardada en configuración)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("exp-default-page-size");
      if (stored) return Number(stored);
    }
    return 20;
  });
  
  // Modales y estados para fechas inline
  const [editDateModal, setEditDateModal] = useState<{
    expediente: Expediente;
    fieldName: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega" | "fecha_rci";
    displayName: string;
  } | null>(null);

  const [deleteDateModal, setDeleteDateModal] = useState<{
    expediente: Expediente;
    fieldName: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega" | "fecha_rci";
    displayName: string;
  } | null>(null);

  const [inputDate, setInputDate] = useState("");
  const [inputMatricula, setInputMatricula] = useState("");

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(text);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  // Manejo de Selección Masiva
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(expedientes.map(e => e.id_expediente));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Borrado Masivo
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/expedientes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al eliminar los expedientes seleccionados");
      }

      setExpedientes(prev => prev.filter(e => !selectedIds.includes(e.id_expediente)));
      showNotification(`${selectedIds.length} expedientes eliminados con éxito.`, "success");
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message || "Ocurrió un error inesperado al eliminar los expedientes.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Exportar a CSV
  const handleExportCSV = (onlySelected = false) => {
    const listToExport = onlySelected 
      ? expedientes.filter(e => selectedIds.includes(e.id_expediente))
      : expedientes;

    if (listToExport.length === 0) {
      showNotification("No hay expedientes para exportar.", "error");
      return;
    }

    // Cabeceras de las columnas del CSV
    const headers = [
      "ID Expediente", "Cliente Nombre", "Cliente DNI", "Cliente Fecha Nacimiento", "Cliente Emails", "Cliente Telefonos",
      "Marca", "Marca Activo", "Marca Acceso Rapido", "Marca Sistema Comisiones",
      "Modelo", "Modelo Acceso Rapido", "Modelo Orden Acceso Rapido",
      "Tipo Venta", "Tipo Venta Color", "Estado Vehiculo", "Estado Vehiculo Predeterminado",
      "Vendedor", "F. Expediente", 
      "F. Afectacion", "F. RCI", "F. Matriculacion", "F. Entrega", "Matricula", "VIN"
    ];

    const rows = listToExport.map(e => [
      e.id_expediente,
      e.cliente?.nombre || "",
      e.cliente?.dni || "",
      e.cliente?.fecha_de_nacimiento || "",
      e.cliente?.emails && e.cliente.emails.length > 0 ? e.cliente.emails.map(em => `${em.email}:${em.tipo_email || "Principal"}`).join("|") : "",
      e.cliente?.telefonos && e.cliente.telefonos.length > 0 ? e.cliente.telefonos.map(tel => `${tel.telefono}:${tel.tipo_telefono || "Principal"}`).join("|") : "",
      e.modelo?.marca?.nombre || "",
      e.modelo?.marca?.activo !== undefined && e.modelo?.marca?.activo !== null ? String(e.modelo.marca.activo) : "true",
      e.modelo?.marca?.acceso_rapido !== undefined && e.modelo?.marca?.acceso_rapido !== null ? String(e.modelo.marca.acceso_rapido) : "false",
      e.modelo?.marca?.sistema_comisiones !== undefined && e.modelo?.marca?.sistema_comisiones !== null ? String(e.modelo.marca.sistema_comisiones) : "false",
      e.modelo?.nombre_modelo || "",
      e.modelo?.acceso_rapido !== undefined && e.modelo?.acceso_rapido !== null ? String(e.modelo.acceso_rapido) : "false",
      e.modelo?.orden_acceso_rapido !== undefined && e.modelo?.orden_acceso_rapido !== null ? String(e.modelo.orden_acceso_rapido) : "0",
      e.tipoDeVenta?.nombre_tipo_venta || "",
      e.tipoDeVenta?.color || "",
      e.estadoVehiculo?.nombre_estado_vehiculo || "",
      e.estadoVehiculo?.predeterminado !== undefined && e.estadoVehiculo?.predeterminado !== null ? String(e.estadoVehiculo.predeterminado) : "false",
      e.usuario?.nombre || "",
      e.fecha_expediente || "",
      e.fecha_afectacion || "",
      e.fecha_rci || "",
      e.fecha_matriculacion || "",
      e.fecha_entrega || "",
      e.matricula || "",
      e.vin || ""
    ]);

    // Añadir el BOM y directiva sep=; para asegurar compatibilidad de caracteres especiales y detección de separador en Excel
    const csvContent = "\uFEFF" + [
      "sep=;",
      headers.join(";"),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expedientes_${onlySelected ? 'seleccionados_' : ''}export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Exportación CSV realizada con éxito.", "success");
  };

  // Importar desde CSV con prevención de duplicados
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error("Archivo vacío");

        // Parsear líneas del CSV
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          throw new Error("El archivo CSV no contiene suficientes líneas (cabecera + datos).");
        }

        // Detectar si la primera línea es la directiva de separador (ej: sep=;)
        let headerIndex = 0;
        if (lines[0].toLowerCase().startsWith("sep=")) {
          headerIndex = 1;
        }

        if (lines.length <= headerIndex + 1) {
          throw new Error("El archivo CSV no contiene suficientes líneas de datos.");
        }

        // Detectar delimitador (punto y coma o coma)
        const headerLine = lines[headerIndex];
        const delimiter = headerLine.includes(";") ? ";" : ",";
        const rawHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

        const getColIndex = (names: string[]) => {
          return rawHeaders.findIndex(h => names.some(name => h.includes(name)));
        };

        const idxClienteNombre = getColIndex(["cliente nombre", "nombre cliente", "cliente", "name"]);
        const idxClienteDni = getColIndex(["cliente dni", "dni cliente", "dni", "nif"]);
        const idxClienteFechaNac = getColIndex(["cliente fecha nacimiento", "cliente_fecha_nacimiento", "fecha_nacimiento_cliente"]);
        const idxClienteEmails = getColIndex(["cliente emails", "cliente_emails", "emails_cliente"]);
        const idxClienteTels = getColIndex(["cliente telefonos", "cliente_telefonos", "telefonos_cliente", "tels_cliente"]);
        const idxMarca = getColIndex(["marca", "brand"]);
        const idxMarcaActivo = getColIndex(["marca activo", "marca_activo"]);
        const idxMarcaAccesoRapido = getColIndex(["marca acceso rapido", "marca_acceso_rapido"]);
        const idxMarcaSistemaComisiones = getColIndex(["marca sistema comisiones", "marca_sistema_comisiones"]);
        const idxModelo = getColIndex(["modelo", "model"]);
        const idxModeloAccesoRapido = getColIndex(["modelo acceso rapido", "modelo_acceso_rapido"]);
        const idxModeloOrdenAccesoRapido = getColIndex(["modelo orden acceso rapido", "modelo_orden_acceso_rapido"]);
        const idxTipoVenta = getColIndex(["tipo venta", "tipo de venta", "tipo_venta"]);
        const idxTipoVentaColor = getColIndex(["tipo venta color", "tipo_venta_color"]);
        const idxEstadoVehiculo = getColIndex(["estado vehiculo", "estado de vehiculo", "estado_vehiculo", "estado"]);
        const idxEstadoVehiculoPredeterminado = getColIndex(["estado vehiculo predeterminado", "estado_vehiculo_predeterminado"]);
        const idxFechaExp = getColIndex(["f. expediente", "fecha expediente", "fecha_expediente", "fecha"]);
        const idxFechaAfect = getColIndex(["f. afectacion", "fecha afectacion", "fecha_afectacion", "afectacion"]);
        const idxFechaRci = getColIndex(["f. rci", "fecha rci", "fecha_rci", "rci"]);
        const idxFechaMat = getColIndex(["f. matriculacion", "fecha matriculacion", "fecha_matriculacion", "matriculacion"]);
        const idxFechaEntrega = getColIndex(["f. entrega", "fecha entrega", "fecha_entrega", "entrega"]);
        const idxMatricula = getColIndex(["matricula", "license plate"]);
        const idxVin = getColIndex(["vin", "bastidor"]);

        const itemsToImport = [];

        for (let i = headerIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          // Regex robusto para separar valores respetando comillas
          let parts = [];
          let current = "";
          let inQuotes = false;
          for (let c = 0; c < line.length; c++) {
            const char = line[c];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              parts.push(current.trim().replace(/^["']|["']$/g, ""));
              current = "";
            } else {
              current += char;
            }
          }
          parts.push(current.trim().replace(/^["']|["']$/g, ""));

          if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) continue;

          const getValue = (idx: number) => idx !== -1 && idx < parts.length ? parts[idx] : null;

          itemsToImport.push({
            cliente_nombre: getValue(idxClienteNombre),
            cliente_dni: getValue(idxClienteDni),
            cliente_fecha_nacimiento: getValue(idxClienteFechaNac),
            cliente_emails: getValue(idxClienteEmails),
            cliente_telefonos: getValue(idxClienteTels),
            marca_nombre: getValue(idxMarca),
            marca_activo: getValue(idxMarcaActivo),
            marca_acceso_rapido: getValue(idxMarcaAccesoRapido),
            marca_sistema_comisiones: getValue(idxMarcaSistemaComisiones),
            modelo_nombre: getValue(idxModelo),
            modelo_acceso_rapido: getValue(idxModeloAccesoRapido),
            modelo_orden_acceso_rapido: getValue(idxModeloOrdenAccesoRapido),
            tipo_venta_nombre: getValue(idxTipoVenta),
            tipo_venta_color: getValue(idxTipoVentaColor),
            estado_vehiculo_nombre: getValue(idxEstadoVehiculo),
            estado_vehiculo_predeterminado: getValue(idxEstadoVehiculoPredeterminado),
            fecha_expediente: getValue(idxFechaExp),
            fecha_afectacion: getValue(idxFechaAfect),
            fecha_rci: getValue(idxFechaRci),
            fecha_matriculacion: getValue(idxFechaMat),
            fecha_entrega: getValue(idxFechaEntrega),
            matricula: getValue(idxMatricula),
            vin: getValue(idxVin)
          });
        }

        if (itemsToImport.length === 0) {
          throw new Error("No se encontraron registros válidos de datos en el CSV.");
        }

        const response = await fetch("/api/expedientes/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToImport })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Error al procesar la importación en el servidor.");
        }

        showNotification(result.message, "success");
        router.refresh();
      } catch (err: any) {
        showNotification(err.message || "Error al importar el archivo CSV.", "error");
      } finally {
        setLoading(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      showNotification("Error de lectura del archivo.", "error");
      setLoading(false);
      event.target.value = "";
    };

    reader.readAsText(file);
  };

  // Exportar base de datos a JSON (Copia de seguridad)
  const handleExportBackupJSON = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/backup", { method: "GET" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Error al generar la copia de seguridad.");
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(result, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `backup_completo_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      showNotification("Copia de seguridad JSON exportada correctamente.", "success");
    } catch (err: any) {
      showNotification(err.message || "Error al exportar copia de seguridad.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Importar base de datos desde JSON (Restauración completa)
  const handleImportBackupJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "¡ATENCIÓN! Estás a punto de restaurar una copia de seguridad COMPLETA de la base de datos.\n\n" +
      "Esto ELIMINARÁ permanentemente todos los datos existentes (tiendas, usuarios, clientes, comisiones, expedientes, etc.) e importará los registros del archivo.\n\n" +
      "¿Estás completamente seguro de que deseas proceder?"
    );

    if (!confirmRestore) {
      event.target.value = "";
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error("Archivo vacío");

        const parsedBackup = JSON.parse(text);

        const response = await fetch("/api/admin/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedBackup),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Error al restaurar la copia de seguridad.");
        }

        showNotification(result.message, "success");
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        showNotification(err.message || "Error al procesar el archivo de copia de seguridad JSON.", "error");
      } finally {
        setLoading(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      showNotification("Error al leer el archivo de backup.", "error");
      setLoading(false);
      event.target.value = "";
    };

    reader.readAsText(file);
  };


  const handleOpenEditDate = (
    exp: Expediente,
    field: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega" | "fecha_rci",
    displayName: string
  ) => {
    const today = new Date().toISOString().split("T")[0];
    setInputDate(exp[field] || today);
    setInputMatricula(exp.matricula || "");
    setEditDateModal({ expediente: exp, fieldName: field, displayName });
  };

  const handleSaveDate = async () => {
    if (!editDateModal) return;
    setLoading(true);
    setError(null);

    const { expediente, fieldName, displayName } = editDateModal;

    const updatePayload: any = {
      [fieldName]: inputDate || null,
    };

    if (fieldName === "fecha_matriculacion") {
      updatePayload.matricula = inputMatricula || null;
      if (!expediente.fecha_rci) {
        updatePayload.fecha_rci = inputDate || null;
      }
    }

    try {
      const response = await fetch("/api/expedientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_expediente: expediente.id_expediente,
          expediente: updatePayload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al actualizar la fecha");
      }

      setExpedientes(prev => prev.map(e => e.id_expediente === expediente.id_expediente ? {
        ...e,
        ...updatePayload,
      } : e));

      showNotification(`Fecha de ${displayName} actualizada correctamente.`, "success");
      setEditDateModal(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message || "Ocurrió un error al guardar la fecha.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteDate = (
    exp: Expediente,
    field: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega" | "fecha_rci",
    displayName: string
  ) => {
    setDeleteDateModal({ expediente: exp, fieldName: field, displayName });
  };

  const handleDeleteDate = async () => {
    if (!deleteDateModal) return;
    setLoading(true);
    setError(null);

    const { expediente, fieldName, displayName } = deleteDateModal;

    try {
      const response = await fetch("/api/expedientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_expediente: expediente.id_expediente,
          expediente: {
            [fieldName]: null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al eliminar la fecha");
      }

      setExpedientes(prev => prev.map(e => e.id_expediente === expediente.id_expediente ? {
        ...e,
        [fieldName]: null,
      } : e));

      showNotification(`Fecha de ${displayName} eliminada correctamente.`, "success");
      setDeleteDateModal(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message || "Ocurrió un error al eliminar la fecha.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpediente = async () => {
    if (!confirmDeleteExpediente) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/expedientes?id=${confirmDeleteExpediente.id_expediente}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al eliminar el expediente");
      }

      setExpedientes(prev => prev.filter(e => e.id_expediente !== confirmDeleteExpediente.id_expediente));
      showNotification(`Expediente eliminado con éxito.`, "success");
      setConfirmDeleteExpediente(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message || "Ocurrió un error inesperado al eliminar el expediente.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Renderizador inline de fecha con botones
  const renderDateField = (
    exp: Expediente,
    field: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega" | "fecha_rci",
    displayName: string,
    backgroundColor?: string
  ) => {
    const val = exp[field];
    return (
      <td style={{ textAlign: "center", backgroundColor }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: val ? "var(--text-primary)" : "var(--text-muted)", fontWeight: val ? 500 : 400 }}>
              {formatDate(val)}
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => handleOpenEditDate(exp, field, displayName)}
                style={{
                  border: "none",
                  background: "rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                title={`Modificar fecha de ${displayName}`}
                className="glass-panel-interactive"
              >
                ✏️
              </button>
              {val && (
                <button
                  onClick={() => handleOpenDeleteDate(exp, field, displayName)}
                  style={{
                    border: "none",
                    background: "rgba(239, 68, 68, 0.05)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s"
                  }}
                  title={`Eliminar fecha de ${displayName}`}
                  className="glass-panel-interactive"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          {field === "fecha_matriculacion" && exp.matricula && (
            <div style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid var(--border-light)",
              marginTop: "2px",
              display: "inline-block"
            }}>
              🚗 {exp.matricula}
            </div>
          )}
        </div>
      </td>
    );
  };

  const months = [
    { value: 1, name: "Enero" },
    { value: 2, name: "Febrero" },
    { value: 3, name: "Marzo" },
    { value: 4, name: "Abril" },
    { value: 5, name: "Mayo" },
    { value: 6, name: "Junio" },
    { value: 7, name: "Julio" },
    { value: 8, name: "Agosto" },
    { value: 9, name: "Septiembre" },
    { value: 10, name: "Octubre" },
    { value: 11, name: "Noviembre" },
    { value: 12, name: "Diciembre" }
  ];

  const currentYearNum = new Date().getFullYear();
  const years = [currentYearNum, currentYearNum - 1, currentYearNum - 2];

  const getMonthStats = () => {
    let matriculados = 0;
    let matriculadosContado = 0;
    let matriculadosCredito = 0;
    let matriculadosPreference = 0;

    let entregados = 0;
    let afectados = 0;

    let pedidos = 0;
    let pedidosContado = 0;
    let pedidosCredito = 0;
    let pedidosPreference = 0;

    expedientes.forEach(exp => {
      const tipoVentaNombre = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
      const isContado = tipoVentaNombre.includes("contado");
      const isCredito = tipoVentaNombre.includes("credito") || tipoVentaNombre.includes("crédito");
      const isPreference = tipoVentaNombre.includes("preference") || tipoVentaNombre.includes("box");

      // Matriculados
      if (exp.fecha_matriculacion) {
        const parts = exp.fecha_matriculacion.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) {
          matriculados++;
          if (isContado) matriculadosContado++;
          else if (isCredito) matriculadosCredito++;
          else if (isPreference) matriculadosPreference++;
        }
      }
      // Entregados
      if (exp.fecha_entrega) {
        const parts = exp.fecha_entrega.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) entregados++;
      }
      // Afectados
      if (exp.fecha_afectacion) {
        const parts = exp.fecha_afectacion.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) afectados++;
      }
      // Pedidos
      if (exp.fecha_expediente) {
        const parts = exp.fecha_expediente.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) {
          pedidos++;
          if (isContado) pedidosContado++;
          else if (isCredito) pedidosCredito++;
          else if (isPreference) pedidosPreference++;
        }
      }
    });

    return {
      matriculados,
      matriculadosContado,
      matriculadosCredito,
      matriculadosPreference,
      entregados,
      afectados,
      pedidos,
      pedidosContado,
      pedidosCredito,
      pedidosPreference
    };
  };

  const stats = getMonthStats();

  const handleSetCurrentMonth = () => {
    const d = new Date();
    setStatsYear(d.getFullYear());
    setStatsMonth(d.getMonth() + 1);
  };

  const handleSetPreviousMonth = () => {
    if (statsMonth === 1) {
      setStatsMonth(12);
      setStatsYear(prev => prev - 1);
    } else {
      setStatsMonth(prev => prev - 1);
    }
  };

  const uniqueBrands = Array.from(
    new Set(
      expedientes
        .map(e => e.modelo?.marca?.nombre)
        .filter((brandName): brandName is string => !!brandName)
    )
  ).sort();

  const filteredExpedientes = expedientes.filter(exp => {
    // 1. Buscador global
    if (globalSearch) {
      const gs = globalSearch.toLowerCase();
      const matchCliente = exp.cliente?.nombre?.toLowerCase().includes(gs) || exp.cliente?.dni?.toLowerCase().includes(gs);
      const matchModelo = exp.modelo?.nombre_modelo?.toLowerCase().includes(gs) || exp.modelo?.marca?.nombre?.toLowerCase().includes(gs);
      const matchTipo = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase().includes(gs);
      const matchEstado = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase().includes(gs);
      const matchVendedor = exp.usuario?.nombre?.toLowerCase().includes(gs);
      const matchVin = exp.vin?.toLowerCase().includes(gs);
      const matchMatricula = exp.matricula?.toLowerCase().includes(gs);
      if (!matchCliente && !matchModelo && !matchTipo && !matchEstado && !matchVendedor && !matchVin && !matchMatricula) {
        return false;
      }
    }

    // 2. Filtros por columna
    if (filterCliente && !exp.cliente?.nombre?.toLowerCase().includes(filterCliente.toLowerCase()) && !exp.cliente?.dni?.toLowerCase().includes(filterCliente.toLowerCase())) return false;
    if (filterMarca) {
      if (filterMarca === "VO_NO_BRAND") {
        if (exp.modelo?.marca?.nombre) return false;
      } else {
        if (exp.modelo?.marca?.nombre !== filterMarca) return false;
      }
    }
    if (filterModelo) {
      const fMod = filterModelo.toLowerCase();
      const modelMatch = exp.modelo?.nombre_modelo?.toLowerCase().includes(fMod) || exp.vin?.toLowerCase().includes(fMod);
      if (!modelMatch) return false;
    }
    if (filterTipoVenta && !exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase().includes(filterTipoVenta.toLowerCase())) return false;
    if (filterEstadoVehiculo && !exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase().includes(filterEstadoVehiculo.toLowerCase())) return false;
    if (filterVendedor && !exp.usuario?.nombre?.toLowerCase().includes(filterVendedor.toLowerCase())) return false;
    if (filterFExp && !formatDate(exp.fecha_expediente).toLowerCase().includes(filterFExp.toLowerCase())) return false;
    if (filterFAfect && !formatDate(exp.fecha_afectacion).toLowerCase().includes(filterFAfect.toLowerCase())) return false;
    if (filterFRci && !formatDate(exp.fecha_rci).toLowerCase().includes(filterFRci.toLowerCase())) return false;
    if (filterFMat && !formatDate(exp.fecha_matriculacion).toLowerCase().includes(filterFMat.toLowerCase()) && !(exp.matricula && exp.matricula.toLowerCase().includes(filterFMat.toLowerCase()))) return false;
    if (filterFEntrega && !formatDate(exp.fecha_entrega).toLowerCase().includes(filterFEntrega.toLowerCase())) return false;

    return true;
  });

  // Calcular paginación
  const totalFiltered = filteredExpedientes.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpedientes = filteredExpedientes.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Componente de barra de paginación (reutilizable arriba y abajo)
  const PaginationBar = () => (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "10px",
      padding: "10px 16px",
      background: "rgba(255, 255, 255, 0.02)",
      borderTop: "1px solid var(--border-light)",
      borderBottom: "1px solid var(--border-light)",
      fontSize: "0.85rem",
      color: "var(--text-secondary)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>Mostrar:</span>
        {[10, 20, 50, 100, 200].map(size => (
          <button
            key={size}
            type="button"
            onClick={() => handlePageSizeChange(size)}
            style={{
              padding: "3px 10px",
              fontSize: "0.8rem",
              border: `1px solid ${pageSize === size ? "var(--primary)" : "var(--border-light)"}`,
              borderRadius: "4px",
              background: pageSize === size ? "rgba(var(--primary-rgb), 0.12)" : "transparent",
              color: pageSize === size ? "var(--primary)" : "var(--text-secondary)",
              cursor: "pointer",
              fontWeight: pageSize === size ? 700 : 400
            }}
          >{size}</button>
        ))}
        <span style={{ marginLeft: "8px" }}>
          {totalFiltered} resultado(s)
          {totalFiltered !== expedientes.length ? ` (de ${expedientes.length} totales)` : ""}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}
          style={{ padding: "4px 8px", border: "1px solid var(--border-light)", borderRadius: "4px", background: "transparent", color: safePage === 1 ? "var(--text-muted)" : "var(--text-primary)", cursor: safePage === 1 ? "default" : "pointer", fontSize: "0.8rem" }}
          title="Primera página"
        >«</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}
          style={{ padding: "4px 8px", border: "1px solid var(--border-light)", borderRadius: "4px", background: "transparent", color: safePage === 1 ? "var(--text-muted)" : "var(--text-primary)", cursor: safePage === 1 ? "default" : "pointer", fontSize: "0.8rem" }}
          title="Página anterior"
        >‹</button>
        <span style={{ padding: "4px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
          Pág. {safePage} / {totalPages}
        </span>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}
          style={{ padding: "4px 8px", border: "1px solid var(--border-light)", borderRadius: "4px", background: "transparent", color: safePage === totalPages ? "var(--text-muted)" : "var(--text-primary)", cursor: safePage === totalPages ? "default" : "pointer", fontSize: "0.8rem" }}
          title="Página siguiente"
        >›</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}
          style={{ padding: "4px 8px", border: "1px solid var(--border-light)", borderRadius: "4px", background: "transparent", color: safePage === totalPages ? "var(--text-muted)" : "var(--text-primary)", cursor: safePage === totalPages ? "default" : "pointer", fontSize: "0.8rem" }}
          title="Última página"
        >»</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* NOTIFICACIONES FLOTANTES */}
      {error && (
        <div className="glass-panel" style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          boxShadow: "var(--shadow-lg)",
          padding: "12px 24px",
          color: "var(--danger)",
          borderLeft: "4px solid var(--danger)",
          background: "rgba(239, 68, 68, 0.95)",
          backdropFilter: "blur(8px)",
          minWidth: "300px",
          textAlign: "center",
          animation: "fadeIn 0.3s ease"
        }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="glass-panel" style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          boxShadow: "var(--shadow-lg)",
          padding: "12px 24px",
          color: "var(--success)",
          borderLeft: "4px solid var(--success)",
          background: "rgba(16, 185, 129, 0.95)",
          backdropFilter: "blur(8px)",
          minWidth: "300px",
          textAlign: "center",
          animation: "fadeIn 0.3s ease"
        }}>
          ✓ {success}
        </div>
      )}

      {/* BUSCADOR GENERAL */}
      <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>🔎 Buscador Global:</span>
        <input
          type="text"
          className="form-input"
          placeholder="Busca por cliente, matrícula, DNI, vendedor, VIN..."
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 14px" }}
        />
        {globalSearch && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setGlobalSearch("")}
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* PANEL DE ACCIONES MASIVAS E IMPORT/EXPORT */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "rgba(255, 255, 255, 0.03)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setBulkSelectionUnlocked(!bulkSelectionUnlocked);
              if (bulkSelectionUnlocked) setSelectedIds([]);
            }}
            style={{
              padding: "8px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: bulkSelectionUnlocked ? "var(--warning)" : "rgba(255,255,255,0.05)",
              color: bulkSelectionUnlocked ? "black" : "var(--text-primary)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600
            }}
            title={bulkSelectionUnlocked ? "Bloquear Selección Masiva" : "Desbloquear Selección Masiva"}
          >
            {bulkSelectionUnlocked ? "🔓 Selección Activa" : "🔒 Selección Inactiva"}
          </button>

          {bulkSelectionUnlocked && selectedIds.length > 0 && (
            <>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--primary)" }}>
                ({selectedIds.length} seleccionados):
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmBulkDelete(true)}
                style={{ padding: "6px 12px", fontSize: "0.8rem", backgroundColor: "var(--danger)", color: "white", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", fontWeight: "600" }}
              >
                🗑️ Eliminar Seleccionados
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleExportCSV(true)}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >
                📤 Exportar Seleccionados (CSV)
              </button>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleExportCSV(false)}
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
          >
            📤 Exportar Todo (CSV)
          </button>
          
          <label className="btn btn-primary" style={{ padding: "8px 14px", fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            📥 Importar CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              style={{ display: "none" }}
              disabled={loading}
            />
          </label>

          {userRole === "administrador" && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportBackupJSON}
                style={{ 
                  padding: "8px 14px", 
                  fontSize: "0.85rem", 
                  backgroundColor: "rgba(124, 58, 237, 0.08)", 
                  border: "1px solid rgba(124, 58, 237, 0.2)", 
                  color: "var(--primary)",
                  fontWeight: 500
                }}
                disabled={loading}
              >
                💾 Exportar Backup (JSON)
              </button>
              
              <label 
                className="btn" 
                style={{ 
                  padding: "8px 14px", 
                  fontSize: "0.85rem", 
                  cursor: "pointer", 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "6px",
                  backgroundColor: "rgba(16, 185, 129, 0.08)", 
                  border: "1px solid rgba(16, 185, 129, 0.2)", 
                  color: "var(--success)",
                  fontWeight: 500
                }}
              >
                🔄 Restaurar Backup (JSON)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupJSON}
                  style={{ display: "none" }}
                  disabled={loading}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* TABLA DE EXPEDIENTES */}
      <div className="glass-panel" style={{ padding: "8px" }}>
        {/* PAGINACIÓN SUPERIOR */}
        <PaginationBar />

        <div className="table-container">
          <table className="table-premium">
            <thead>
              <tr>
                {bulkSelectionUnlocked && (
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={filteredExpedientes.length > 0 && selectedIds.length === filteredExpedientes.length}
                      onChange={e => handleSelectAll(e.target.checked)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                  </th>
                )}
                <th>Cliente</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>T. Venta</th>
                <th>Estado</th>
                <th>Vendedor</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)" }}>F. Exp.</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.09)" }}>F. Afect</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)" }}>F. RCI</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.09)" }}>F. Mat</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)" }}>F. Entrega</th>
                <th>Acciones</th>
              </tr>
              {/* FILTROS POR COLUMNA */}
              <tr style={{ background: "rgba(255, 255, 255, 0.01)" }}>
                {bulkSelectionUnlocked && <td></td>}
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterCliente}
                    onChange={e => setFilterCliente(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    value={filterMarca}
                    onChange={e => setFilterMarca(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "100px" }}
                  >
                    <option value="">Todas</option>
                    {uniqueBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="VO_NO_BRAND">VO (Sin marca)</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterModelo}
                    onChange={e => setFilterModelo(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterTipoVenta}
                    onChange={e => setFilterTipoVenta(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterEstadoVehiculo}
                    onChange={e => setFilterEstadoVehiculo(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterVendedor}
                    onChange={e => setFilterVendedor(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                  />
                </td>
                <td style={{ backgroundColor: "rgba(128, 128, 128, 0.03)" }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterFExp}
                    onChange={e => setFilterFExp(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "60px", textAlign: "center" }}
                  />
                </td>
                <td style={{ backgroundColor: "rgba(128, 128, 128, 0.09)" }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterFAfect}
                    onChange={e => setFilterFAfect(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "60px", textAlign: "center" }}
                  />
                </td>
                <td style={{ backgroundColor: "rgba(128, 128, 128, 0.03)" }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterFRci}
                    onChange={e => setFilterFRci(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "60px", textAlign: "center" }}
                  />
                </td>
                <td style={{ backgroundColor: "rgba(128, 128, 128, 0.09)" }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterFMat}
                    onChange={e => setFilterFMat(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "60px", textAlign: "center" }}
                  />
                </td>
                <td style={{ backgroundColor: "rgba(128, 128, 128, 0.03)" }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    className="form-input"
                    value={filterFEntrega}
                    onChange={e => setFilterFEntrega(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "60px", textAlign: "center" }}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  {(filterCliente || filterMarca || filterModelo || filterTipoVenta || filterEstadoVehiculo || filterVendedor || filterFExp || filterFAfect || filterFRci || filterFMat || filterFEntrega) && (
                    <button 
                      onClick={() => {
                        setFilterCliente("");
                        setFilterMarca("");
                        setFilterModelo("");
                        setFilterTipoVenta("");
                        setFilterEstadoVehiculo("");
                        setFilterVendedor("");
                        setFilterFExp("");
                        setFilterFAfect("");
                        setFilterFRci("");
                        setFilterFMat("");
                        setFilterFEntrega("");
                      }}
                      style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", color: "var(--danger)" }}
                      title="Limpiar filtros"
                    >
                      ✖
                    </button>
                  )}
                </td>
              </tr>
            </thead>
            <tbody>
              {paginatedExpedientes.map((exp) => (
                <tr key={exp.id_expediente} style={{ background: selectedIds.includes(exp.id_expediente) ? "rgba(var(--primary-rgb), 0.04)" : undefined }}>
                  {bulkSelectionUnlocked && (
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(exp.id_expediente)}
                        onChange={e => handleSelectOne(exp.id_expediente, e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                    </td>
                  )}
                  <td style={{ fontWeight: "bold", color: "var(--text-primary)" }}>
                    {exp.cliente?.nombre || "Sin Cliente"}
                  </td>
                  <td>
                    {exp.modelo?.marca?.nombre || (
                      <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>VO (Sin marca)</span>
                    )}
                  </td>
                  <td>
                    {exp.modelo ? (
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {exp.modelo.nombre_modelo}
                      </div>
                    ) : (
                      <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>VO (Sin modelo)</span>
                    )}
                    {exp.vin && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "1px" }}>VIN: {exp.vin}</div>}
                  </td>
                  <td>
                    {exp.tipoDeVenta ? (
                      <span className="badge" style={{
                        fontSize: "0.7rem",
                        padding: "3px 8px",
                        backgroundColor: exp.tipoDeVenta.color || "#3b82f6",
                        color: "#fff"
                      }}>
                        {exp.tipoDeVenta.nombre_tipo_venta}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>N/D</span>
                    )}
                  </td>
                  <td>
                    {exp.estadoVehiculo ? (
                      <span className={`badge badge-${exp.estadoVehiculo.nombre_estado_vehiculo?.toLowerCase() === 'nuevo' ? 'tienda' : 'vendedor'}`} style={{ fontSize: "0.7rem", padding: "3px 8px" }}>
                        {exp.estadoVehiculo.nombre_estado_vehiculo}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>N/D</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{exp.usuario?.nombre || "N/D"}</div>
                  </td>
                   <td style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)" }}>
                    <span style={{ fontSize: "0.85rem" }}>{formatDate(exp.fecha_expediente)}</span>
                  </td>
                  {renderDateField(exp, "fecha_afectacion", "Afectación", "rgba(128, 128, 128, 0.09)")}
                  {renderDateField(exp, "fecha_rci", "RCI", "rgba(128, 128, 128, 0.03)")}
                  {renderDateField(exp, "fecha_matriculacion", "Matriculación", "rgba(128, 128, 128, 0.09)")}
                  {renderDateField(exp, "fecha_entrega", "Entrega", "rgba(128, 128, 128, 0.03)")}
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Link href={`/dashboard/expedientes/editar/${exp.id_expediente}`} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                        ✏️ Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteExpediente(exp)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          color: "var(--danger)",
                          background: "rgba(239, 68, 68, 0.05)",
                          border: "1px solid rgba(239, 68, 68, 0.15)",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          marginLeft: "8px",
                          fontWeight: 600,
                          transition: "all 0.2s ease"
                        }}
                        className="glass-panel-interactive"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedExpedientes.length === 0 && (
                <tr>
                  <td colSpan={bulkSelectionUnlocked ? 12 : 11} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                    {expedientes.length === 0
                      ? "No hay expedientes registrados en el sistema."
                      : "No se encontraron expedientes con los filtros aplicados."
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN INFERIOR */}
        <PaginationBar />

      </div>

      {/* SECCIÓN DE RESUMEN MENSUAL Y ESTADÍSTICAS */}
      <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", marginTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>📊 Detalle y Resumen Estadístico</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>Estadísticas de ventas para el período seleccionado.</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "nowrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSetPreviousMonth}
              style={{ padding: "6px 12px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            >
              ⬅ Mes Anterior
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSetCurrentMonth}
              style={{ padding: "6px 12px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            >
              Mes Actual
            </button>
            <select
              className="form-select"
              value={statsMonth}
              onChange={e => setStatsMonth(Number(e.target.value))}
              style={{ padding: "6px 12px", fontSize: "0.85rem", minWidth: "120px" }}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={statsYear}
              onChange={e => setStatsYear(Number(e.target.value))}
              style={{ padding: "6px 12px", fontSize: "0.85rem", minWidth: "90px" }}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px" }}>
          <div className="glass-panel-interactive" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>AFECTADOS EN EL MES</span>
            <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--primary)", fontWeight: "bold" }}>{stats.afectados}</h3>
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "8px", marginTop: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", justifyContent: "center" }}>
              <span>Total de afectaciones</span>
            </div>
          </div>
          
          <div className="glass-panel-interactive" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>MATRICULADOS EN EL MES</span>
            <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--success)", fontWeight: "bold" }}>{stats.matriculados}</h3>
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "8px", marginTop: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Contado:</span> <strong>{stats.matriculadosContado}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Crédito:</span> <strong>{stats.matriculadosCredito}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Preference:</span> <strong>{stats.matriculadosPreference}</strong>
              </div>
            </div>
          </div>

          <div className="glass-panel-interactive" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>ENTREGADOS EN EL MES</span>
            <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--accent)", fontWeight: "bold" }}>{stats.entregados}</h3>
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "8px", marginTop: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", justifyContent: "center" }}>
              <span>Total de entregas</span>
            </div>
          </div>

          <div className="glass-panel-interactive" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>PEDIDOS EN EL MES</span>
            <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--warning)", fontWeight: "bold" }}>{stats.pedidos}</h3>
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "8px", marginTop: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Contado:</span> <strong>{stats.pedidosContado}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Crédito:</span> <strong>{stats.pedidosCredito}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Preference:</span> <strong>{stats.pedidosPreference}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PARA EDITAR FECHA */}
      {editDateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "400px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              Establecer fecha de {editDateModal.displayName}
            </h3>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Selecciona Fecha</label>
              <input
                type="date"
                className="form-input"
                value={inputDate}
                onChange={e => setInputDate(e.target.value)}
              />
            </div>

            {editDateModal.fieldName === "fecha_matriculacion" && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Matrícula (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={inputMatricula}
                  onChange={e => setInputMatricula(e.target.value)}
                  placeholder="Ej. 1234ABC"
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditDateModal(null)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveDate}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ELIMINAR FECHA */}
      {deleteDateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "400px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            borderLeft: "4px solid var(--danger)"
          }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              Eliminar fecha de {deleteDateModal.displayName}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.5", margin: 0 }}>
              ¿Estás seguro de que deseas eliminar la fecha de <strong>{deleteDateModal.displayName}</strong> de este expediente?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteDateModal(null)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleDeleteDate}
                disabled={loading}
                style={{
                  backgroundColor: "var(--danger)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {loading ? "Eliminando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN DE EXPEDIENTE */}
      {confirmDeleteExpediente && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "450px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            borderLeft: "4px solid var(--danger)"
          }}>
            <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", margin: 0 }}>
              Confirmar Eliminación
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
              ¿Estás seguro de que deseas eliminar permanentemente este expediente? Esta acción no se podrá deshacer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteExpediente(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleDeleteExpediente}
                disabled={deleting}
                style={{
                  backgroundColor: "var(--danger)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {deleting ? "Eliminando..." : "Eliminar Expediente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO MASIVO */}
      {confirmBulkDelete && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "450px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            borderLeft: "4px solid var(--danger)"
          }}>
            <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", margin: 0 }}>
              Confirmar Borrado Masivo
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
              ¿Estás seguro de que deseas eliminar permanentemente los <strong>{selectedIds.length}</strong> expedientes seleccionados? Esta acción no se podrá deshacer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmBulkDelete(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleBulkDelete}
                disabled={deleting}
                style={{
                  backgroundColor: "var(--danger)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {deleting ? "Eliminando..." : "Eliminar Expedientes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
