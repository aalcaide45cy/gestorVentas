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
  marca_id?: number | null;
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
  valor_objetivo?: number | null;
  min_coches_multiplicador?: number | null;
  
  cliente?: Cliente | null;
  modelo?: Modelo | null;
  tipoDeVenta?: TipoDeVenta | null;
  estadoVehiculo?: EstadoVehiculo | null;
  usuario?: Usuario | null;
}

interface Tienda {
  id_tienda: number;
  nombre: string;
  ciudad: string | null;
}

interface ExpedientesListProps {
  expedientesIniciales: Expediente[];
  userRole: string;
  tiendas?: Tienda[];
}

export default function ExpedientesList({ expedientesIniciales, userRole, tiendas = [] }: ExpedientesListProps) {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<Expediente[]>(expedientesIniciales);
  const [confirmDeleteExpediente, setConfirmDeleteExpediente] = useState<Expediente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para ordenación de cabeceras
  const [sortField, setSortField] = useState<string>("fecha_expediente");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Estados para selección masiva e Importación/Exportación
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkSelectionUnlocked, setBulkSelectionUnlocked] = useState(false);
  const [deleteUnlocked, setDeleteUnlocked] = useState(false);

  // Estados para buscadores y filtros
  const [globalSearch, setGlobalSearch] = useState("");
  const [ocultarEntregados, setOcultarEntregados] = useState(false);
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

  const [planes, setPlanes] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any | null>(null);

  useEffect(() => {
    const fetchPlanes = async () => {
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
    fetchPlanes();
  }, []);

  useEffect(() => {
    if (planes.length === 0) {
      setActivePlan(null);
      return;
    }
    const targetDateStr = `${statsYear}-${String(statsMonth).padStart(2, "0")}-01`;
    const matched = planes.find(p => p.fecha_inicio <= targetDateStr && p.fecha_fin >= targetDateStr);
    if (matched) {
      const fetchPlanDetails = async () => {
        try {
          const res = await fetch(`/api/comisiones/planes?id=${matched.id_plan}`);
          const result = await res.json();
          if (result.success) {
            setActivePlan(result.data);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchPlanDetails();
    } else {
      setActivePlan(null);
    }
  }, [planes, statsYear, statsMonth]);

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

  const [assigningClientExpId, setAssigningClientExpId] = useState<number | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [searchingClient, setSearchingClient] = useState(false);

  // Estados de creación rápida de cliente
  const [assignClientModalTab, setAssignClientModalTab] = useState<"buscar" | "crear">("buscar");
  const [newClientNombre, setNewClientNombre] = useState("");
  const [newClientDni, setNewClientDni] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientTelefono, setNewClientTelefono] = useState("");
  const [newClientTiendaId, setNewClientTiendaId] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [createClientError, setCreateClientError] = useState<string | null>(null);

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(text);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleSearchClientsForAssign = async (val: string) => {
    setClientSearchQuery(val);
    if (val.trim().length < 2) {
      setClientSearchResults([]);
      return;
    }
    setSearchingClient(true);
    try {
      const res = await fetch(`/api/clientes/buscar?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setClientSearchResults(data.data || []);
      }
    } catch (e) {
      console.error("Error al buscar clientes:", e);
    } finally {
      setSearchingClient(false);
    }
  };

  const handleAssignClient = async (selectedClient: any) => {
    if (!assigningClientExpId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/expedientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_expediente: assigningClientExpId,
          expediente: {},
          id_cliente: selectedClient.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Error al asignar el cliente.");
      }

      setExpedientes(prev => prev.map(exp => {
        if (exp.id_expediente === assigningClientExpId) {
          return {
            ...exp,
            id_cliente: selectedClient.id,
            cliente: {
              id: selectedClient.id,
              dni: selectedClient.dni,
              nombre: selectedClient.nombre,
              fecha_de_nacimiento: selectedClient.fecha_de_nacimiento,
              tienda_id: selectedClient.tienda_id,
              emails: selectedClient.emails || [],
              telefonos: selectedClient.telefonos || []
            }
          };
        }
        return exp;
      }));

      showNotification("Cliente asignado correctamente.", "success");
      setAssigningClientExpId(null);
      setClientSearchQuery("");
      setClientSearchResults([]);
    } catch (e: any) {
      showNotification(e.message || "Error al asignar el cliente.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAssignClient = async () => {
    if (!newClientNombre.trim()) {
      setCreateClientError("El nombre es obligatorio.");
      return;
    }
    setCreatingClient(true);
    setCreateClientError(null);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newClientNombre,
          dni: newClientDni || null,
          tienda_id: newClientTiendaId ? Number(newClientTiendaId) : null,
          emails: newClientEmail ? [{ email: newClientEmail, tipo: "Principal" }] : [],
          telefonos: newClientTelefono ? [{ telefono: newClientTelefono, tipo: "Principal" }] : []
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al crear el cliente.");
      }

      const createdClient = data.data;
      // Asignar el cliente creado al expediente
      await handleAssignClient(createdClient);

      // Limpiar formulario de creación de cliente
      setNewClientNombre("");
      setNewClientDni("");
      setNewClientEmail("");
      setNewClientTelefono("");
      setNewClientTiendaId("");
      setAssignClientModalTab("buscar");
    } catch (err: any) {
      setCreateClientError(err.message || "Error interno al crear el cliente.");
    } finally {
      setCreatingClient(false);
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

      // Inyectar preferencias del navegador en el backup
      const backupWithPrefs = {
        ...result,
        preferences: {
          expDefaultPageSize: Number(localStorage.getItem("exp-default-page-size") || "20"),
          sidebarCollapsed: localStorage.getItem("sidebar-collapsed") === "true",
        }
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupWithPrefs, null, 2)
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

        // Restaurar preferencias del navegador si el backup las contiene
        if (parsedBackup.preferences) {
          const prefs = parsedBackup.preferences;
          if (typeof prefs.expDefaultPageSize === "number") {
            localStorage.setItem("exp-default-page-size", String(prefs.expDefaultPageSize));
          }
          if (typeof prefs.sidebarCollapsed === "boolean") {
            localStorage.setItem("sidebar-collapsed", String(prefs.sidebarCollapsed));
          }
        }

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
  const years = [currentYearNum, currentYearNum - 1, currentYearNum - 2];  const getMonthStats = () => {
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

    let matriculadosVN = 0;
    let matriculadosVNFinanciados = 0;

    let objetivoComputado = 0;
    const matriculadosList: any[] = [];
    const pendientesList: any[] = [];

    // Pre-calcular cupos en el cliente
    const cupoCounts: Record<number, number> = {};
    const getActivityDate = (e: any) => {
      if (e.fecha_expediente && e.fecha_afectacion) {
        return e.fecha_expediente < e.fecha_afectacion ? e.fecha_expediente : e.fecha_afectacion;
      }
      return e.fecha_expediente || e.fecha_afectacion || e.fecha_matriculacion || "";
    };

    expedientes.forEach((e) => {
      const actDate = getActivityDate(e);
      if (actDate) {
        const parts = actDate.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) {
          const targetCupo = e.min_coches_multiplicador !== null && e.min_coches_multiplicador !== undefined
            ? Number(e.min_coches_multiplicador)
            : 0;
          if (targetCupo > 0) {
            cupoCounts[targetCupo] = (cupoCounts[targetCupo] || 0) + 1;
          }
        }
      }
    });

    // Listas detalladas con cálculos de comisiones
    let totalBaseVN = 0;
    let totalUsado = 0;
    let totalFinanciacion = 0;
    let totalPreference = 0;
    let totalReglasBonus = 0;
    let totalComisionGlobal = 0;

    const computedDetailsList: any[] = [];

    // Calcular Tasas Intervención por Marca para este período (basado en VN matriculados y fecha_rci, simulando para pipeline)
    const totalMatriculadosPorMarca: Record<number, number> = {};
    const financiadosPorMarca: Record<number, number> = {};

    expedientes.forEach((e) => {
      const brandId = e.modelo?.marca_id || e.modelo?.marca?.id_marca;
      if (brandId) {
        const stateName = e.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
        const isVN = stateName === "nuevo" || stateName === "demo";
        if (isVN) {
          const partsMat = e.fecha_matriculacion ? e.fecha_matriculacion.split("-") : [];
          const entraMat = (partsMat.length > 1 && parseInt(partsMat[0], 10) === statsYear && parseInt(partsMat[1], 10) === statsMonth);

          let isRelatedThisMonth = false;
          if (e.fecha_expediente) {
            const parts = e.fecha_expediente.split("-");
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (y === statsYear && m === statsMonth) isRelatedThisMonth = true;
          }
          if (e.fecha_afectacion) {
            const parts = e.fecha_afectacion.split("-");
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (y === statsYear && m === statsMonth) isRelatedThisMonth = true;
          }

          const belongs = entraMat || isRelatedThisMonth;

          if (belongs) {
            totalMatriculadosPorMarca[brandId] = (totalMatriculadosPorMarca[brandId] || 0) + 1;
            
            const salesTypeName = e.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
            const isFinancedType = salesTypeName.includes("preference") || 
                                   salesTypeName.includes("crédito") || 
                                   salesTypeName.includes("credito") || 
                                   salesTypeName.includes("renting");
            
            const entraRci = e.fecha_rci && (() => {
              const parts = e.fecha_rci.split("-");
              return parseInt(parts[0], 10) === statsYear && parseInt(parts[1], 10) === statsMonth;
            })();
            
            if (entraRci || isFinancedType) {
              financiadosPorMarca[brandId] = (financiadosPorMarca[brandId] || 0) + 1;
            }
          }
        }
      }
    });

    const checkTasaCumplida = (brandId: number) => {
      const total = totalMatriculadosPorMarca[brandId] || 0;
      if (total === 0) return true;
      const financiados = financiadosPorMarca[brandId] || 0;
      if (!activePlan) return true;
      const brandInt = activePlan.brandInterventionRates?.find((i: any) => i.id_marca === brandId);
      const targetRate = brandInt?.tasa_intervencion ?? 70;
      const tipoTasa = brandInt?.tipo_tasa ?? "porcentaje";
      if (tipoTasa === "unidades") {
        return financiados >= targetRate;
      } else {
        const actualRate = (financiados / total) * 100;
        return actualRate >= targetRate;
      }
    };

    // Usados count para aplicar tarifa primera / resto (incluyendo estimación)
    const matriculatedUsedCounts: Record<string, number> = { VO: 0, KM0: 0, BB: 0, Usado: 0 };
    expedientes.forEach((e) => {
      const parts = e.fecha_matriculacion ? e.fecha_matriculacion.split("-") : [];
      const y = parts.length > 0 ? parseInt(parts[0], 10) : 0;
      const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      const entraMat = (y === statsYear && m === statsMonth);

      let isRelatedThisMonth = false;
      if (e.fecha_expediente) {
        const parts = e.fecha_expediente.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) isRelatedThisMonth = true;
      }
      if (e.fecha_afectacion) {
        const parts = e.fecha_afectacion.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) isRelatedThisMonth = true;
      }

      const belongs = entraMat || isRelatedThisMonth;
      const stateName = e.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const isVN = stateName === "nuevo" || stateName === "demo";

      if (belongs && !isVN) {
        let tipoUsado = "Usado";
        if (stateName === "km0") tipoUsado = "KM0";
        else if (stateName === "buyback" || stateName === "bb") tipoUsado = "BB";
        else if (stateName === "seminuevo" || stateName === "vo") tipoUsado = "VO";
        matriculatedUsedCounts[tipoUsado] = (matriculatedUsedCounts[tipoUsado] || 0) + 1;
      }
    });

    const currentUsedProcessedIndex: Record<string, number> = { VO: 0, KM0: 0, BB: 0, Usado: 0 };

    // Calcular primero el tramo de comisión que se alcanzará
    // Para ello necesitamos el total de puntos computados en el mes
    let totalComputablesTemp = 0;
    expedientes.forEach(exp => {
      const actDate = getActivityDate(exp);
      let isActivityThisMonth = false;
      if (actDate) {
        const parts = actDate.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        isActivityThisMonth = (y === statsYear && m === statsMonth);
      }
      let isMatriculadoThisMonth = false;
      if (exp.fecha_matriculacion) {
        const parts = exp.fecha_matriculacion.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        isMatriculadoThisMonth = (y === statsYear && m === statsMonth);
      }

      let originalVal = 1.0;
      if (exp.valor_objetivo !== null && exp.valor_objetivo !== undefined) {
        originalVal = Number(exp.valor_objetivo);
      } else if (activePlan) {
        const brandId = exp.modelo?.marca?.id_marca || exp.modelo?.marca_id;
        if (brandId) {
          const brandIntervention = activePlan.brandInterventionRates?.find((r: any) => r.id_marca === brandId);
          if (brandIntervention && brandIntervention.valor_objetivo_defecto !== undefined && brandIntervention.valor_objetivo_defecto !== null) {
            originalVal = Number(brandIntervention.valor_objetivo_defecto);
          }
        }
      }

      let val = 0.0;
      let afectoObjetivo = false;
      if (originalVal === 0) {
        if (isMatriculadoThisMonth) {
          val = 1.0;
          afectoObjetivo = true;
        }
      } else {
        if (isActivityThisMonth) {
          afectoObjetivo = true;
          const targetCupo = exp.min_coches_multiplicador !== null && exp.min_coches_multiplicador !== undefined
            ? Number(exp.min_coches_multiplicador)
            : 0;
          if (targetCupo > 0 && originalVal > 1) {
            const countOfSameCupo = cupoCounts[targetCupo] || 0;
            if (countOfSameCupo >= targetCupo) {
              val = originalVal;
            } else {
              val = 1.0;
            }
          } else {
            val = originalVal;
          }
        }
      }
      if (afectoObjetivo) {
        totalComputablesTemp += val;
      }
    });

    // Determinar tramo
    let tramoAlcanzado: "X-4" | "X-3" | "X-2" | "X-1" | "X" | "X+1" | "X+2" | "X+3" = "X-4";
    if (activePlan) {
      const X = activePlan.objetivo_base + activePlan.arrastre;
      const diff = totalComputablesTemp - X;
      if (diff >= 3) tramoAlcanzado = "X+3";
      else if (diff === 2) tramoAlcanzado = "X+2";
      else if (diff === 1) tramoAlcanzado = "X+1";
      else if (diff === 0) tramoAlcanzado = "X";
      else if (diff === -1) tramoAlcanzado = "X-1";
      else if (diff === -2) tramoAlcanzado = "X-2";
      else if (diff === -3) tramoAlcanzado = "X-3";
      else tramoAlcanzado = "X-4";
    }

    // Segunda pasada: Calcular comisiones por cada expediente
    expedientes.forEach(exp => {
      const tipoVentaNombre = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
      const isContado = tipoVentaNombre.includes("contado");
      const isCredito = tipoVentaNombre.includes("credito") || tipoVentaNombre.includes("crédito");
      const isPreference = tipoVentaNombre.includes("preference") || tipoVentaNombre.includes("box");

      let isMatriculadoThisMonth = false;

      // Matriculados
      if (exp.fecha_matriculacion) {
        const parts = exp.fecha_matriculacion.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) {
          isMatriculadoThisMonth = true;
          matriculados++;
          if (isContado) matriculadosContado++;
          else if (isCredito) matriculadosCredito++;
          else if (isPreference) matriculadosPreference++;

          const stateName = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
          const isVN = stateName === "nuevo" || stateName === "demo";
          if (isVN) {
            matriculadosVN++;
          }
        }
      }

      const actDate = getActivityDate(exp);
      let isActivityThisMonth = false;
      if (actDate) {
        const parts = actDate.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        isActivityThisMonth = (y === statsYear && m === statsMonth);
      }

      // Calcular valor objetivo estimado original
      let originalVal = 1.0;
      if (exp.valor_objetivo !== null && exp.valor_objetivo !== undefined) {
        originalVal = Number(exp.valor_objetivo);
      } else if (activePlan) {
        const brandId = exp.modelo?.marca?.id_marca || exp.modelo?.marca_id;
        if (brandId) {
          const brandIntervention = activePlan.brandInterventionRates?.find((r: any) => r.id_marca === brandId);
          if (brandIntervention && brandIntervention.valor_objetivo_defecto !== undefined && brandIntervention.valor_objetivo_defecto !== null) {
            originalVal = Number(brandIntervention.valor_objetivo_defecto);
          }
        }
      }

      let val = 0.0;
      let afectoObjetivo = false;

      if (originalVal === 0) {
        if (isMatriculadoThisMonth) {
          val = 1.0;
          afectoObjetivo = true;
        }
      } else {
        if (isActivityThisMonth) {
          afectoObjetivo = true;
          const targetCupo = exp.min_coches_multiplicador !== null && exp.min_coches_multiplicador !== undefined
            ? Number(exp.min_coches_multiplicador)
            : 0;
          if (targetCupo > 0 && originalVal > 1) {
            const countOfSameCupo = cupoCounts[targetCupo] || 0;
            if (countOfSameCupo >= targetCupo) {
              val = originalVal;
            } else {
              val = 1.0;
            }
          } else {
            val = originalVal;
          }
        }
      }

      if (afectoObjetivo) {
        objetivoComputado += val;
      }

      // Pipeline/pendientes check
      let isRelatedThisMonth = false;
      if (exp.fecha_expediente) {
        const parts = exp.fecha_expediente.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) isRelatedThisMonth = true;
      }
      if (exp.fecha_afectacion) {
        const parts = exp.fecha_afectacion.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y === statsYear && m === statsMonth) isRelatedThisMonth = true;
      }

      // Clasificación estricta en las listas
      if (isMatriculadoThisMonth) {
        matriculadosList.push({
          ...exp,
          valorObjetivoEstimado: val
        });
      } else if (isRelatedThisMonth) {
        pendientesList.push({
          ...exp,
          valorObjetivoEstimado: val
        });
      }

      // VN Financiados (según fecha_rci en el mes)
      const stateNameVN = exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() || "";
      const isVNVeh = stateNameVN === "nuevo" || stateNameVN === "demo";
      const entraRci = exp.fecha_rci && (() => {
        const parts = exp.fecha_rci.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        return (y === statsYear && m === statsMonth);
      })();

      if (isVNVeh && (isCredito || isPreference) && entraRci) {
        matriculadosVNFinanciados++;
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

      // --- CÁLCULOS ECONÓMICOS INDIVIDUALES PARA EL DESGLOSE DE COMISIONES ---
      // Se estima la comisión para todos los que pertenezcan a este período (matriculados o pipeline/pedido)
      const belongsToPeriod = isMatriculadoThisMonth || isRelatedThisMonth;

      if (activePlan && belongsToPeriod) {
        let baseVN = 0;
        let baseUsado = 0;
        let baseFinanciacion = 0;
        let basePreference = 0;
        let reglasBonus = 0;

        const isVN = stateNameVN === "nuevo" || stateNameVN === "demo";
        let tipoUsado: "VO" | "KM0" | "BB" | "Usado" | null = null;
        if (!isVN) {
          const sName = stateNameVN;
          if (sName === "km0") tipoUsado = "KM0";
          else if (sName === "buyback" || sName === "bb") tipoUsado = "BB";
          else if (sName === "seminuevo" || sName === "vo") tipoUsado = "VO";
          else tipoUsado = "Usado";
        }

        const salesTypeNameLower = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
        const isCreditoVenta = (salesTypeNameLower.includes("crédito") || salesTypeNameLower.includes("credito") || salesTypeNameLower.includes("financiado") || salesTypeNameLower.includes("renting")) && !salesTypeNameLower.includes("preference");
        const isPreferenceVenta = salesTypeNameLower.includes("preference");
        const isFinancedType = isCreditoVenta || isPreferenceVenta;

        const entraPedido = exp.fecha_expediente && (() => {
          const parts = exp.fecha_expediente.split("-");
          return parseInt(parts[0], 10) === statsYear && parseInt(parts[1], 10) === statsMonth;
        })();
        const entraAfectacion = exp.fecha_afectacion && (() => {
          const parts = exp.fecha_afectacion.split("-");
          return parseInt(parts[0], 10) === statsYear && parseInt(parts[1], 10) === statsMonth;
        })();

        // 1. Comisión base VN/VO (Simulamos matriculación para estimar)
        if (isVN) {
          const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
          const tasaCumplida = brandId ? checkTasaCumplida(brandId) : false;
          const modelRate = activePlan.rates?.find((r: any) => r.id_modelo === exp.id_modelo && r.activo && r.tasa_intervencion_cumplida === tasaCumplida);
          if (modelRate) {
            let rateImporte = modelRate.rate_x_minus_4;
            if (tramoAlcanzado === "X-3") rateImporte = modelRate.rate_x_minus_3;
            else if (tramoAlcanzado === "X-2") rateImporte = modelRate.rate_x_minus_2;
            else if (tramoAlcanzado === "X-1") rateImporte = modelRate.rate_x_minus_1;
            else if (tramoAlcanzado === "X") rateImporte = modelRate.rate_x;
            else if (tramoAlcanzado === "X+1") rateImporte = modelRate.rate_x_plus_1;
            else if (tramoAlcanzado === "X+2") rateImporte = modelRate.rate_x_plus_2;
            else if (tramoAlcanzado === "X+3") rateImporte = modelRate.rate_x_plus_3;
            baseVN = rateImporte;
          }
        } else if (tipoUsado) {
          // Se trata como usado
          const usedRate = activePlan.usedRates?.find((r: any) => r.tipo_usado === tipoUsado && r.activo);
          if (usedRate) {
            const totalUnitsOfType = matriculatedUsedCounts[tipoUsado] || 0;
            const currentIdx = currentUsedProcessedIndex[tipoUsado]++;
            if (totalUnitsOfType >= usedRate.min_aplicar) {
              const isFirst = currentIdx === 0;
              baseUsado = isFirst ? usedRate.importe_primera : usedRate.importe_resto;
            }
          }
        }

        // 2. Comisión Financiación (se calcula si es de tipo financiado, simulando RCI)
        if (isFinancedType && exp.id_tipo_de_venta) {
          const salesTypeName = exp.tipoDeVenta?.nombre_tipo_venta?.toLowerCase() || "";
          let matchedFinanceType = "";
          if (salesTypeName.includes("preference")) {
            matchedFinanceType = "Preference";
          } else if (salesTypeName.includes("crédito") || salesTypeName.includes("credito") || salesTypeName.includes("financiado")) {
            matchedFinanceType = "Crédito";
          } else if (salesTypeName.includes("renting")) {
            matchedFinanceType = "Renting";
          } else if (salesTypeName.includes("contado")) {
            matchedFinanceType = "Contado";
          }

          const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
          if (matchedFinanceType && brandId) {
            const finRate = activePlan.financeRates?.find(
              (r: any) => r.id_marca === brandId && r.tipo_financiacion === matchedFinanceType
            );
            if (finRate) {
              baseFinanciacion = finRate.importe;
            }
          }
        }

        // 3. Reglas Preference / BOX3 (se calcula si es de tipo preference, simulando RCI)
        if (isPreferenceVenta) {
          activePlan.preferenceRules?.forEach((rule: any) => {
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
              basePreference += rule.importe;
            }
          });
        }

        // 4. Reglas generales de comisión
        activePlan.rules?.forEach((rule: any) => {
          if (!rule.activa || !rule.afecta_comision) return;
          const eventMatches = 
            (rule.tipo_evento === "pedido" && entraPedido) ||
            (rule.tipo_evento === "afectacion" && entraAfectacion) ||
            (rule.tipo_evento === "matriculacion" && belongsToPeriod) ||
            ((rule.tipo_evento === "credito" || rule.tipo_evento === "financiacion") && belongsToPeriod && isCreditoVenta) ||
            (rule.tipo_evento === "preference" && belongsToPeriod && isPreferenceVenta);

          if (!eventMatches) return;

          if (rule.tasa_intervencion_cumplida !== null && rule.tasa_intervencion_cumplida !== undefined) {
            const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
            if (!brandId) return;
            const tasaCumplida = checkTasaCumplida(brandId);
            if (tasaCumplida !== rule.tasa_intervencion_cumplida) return;
          }

          const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
          const filterMarcaMatches = !rule.id_marca || brandId === rule.id_marca;
          const filterModeloMatches = !rule.id_modelo || exp.id_modelo === rule.id_modelo;

          if (filterMarcaMatches && filterModeloMatches) {
            reglasBonus += rule.importe;
          }
        });

        // 5. Bonus personalizados
        activePlan.bonusRules?.forEach((bonus: any) => {
          if (!bonus.activo || bonus.importe <= 0) return;
          const eventMatches = 
            (bonus.tipo_evento === "pedido" && entraPedido) ||
            (bonus.tipo_evento === "afectacion" && entraAfectacion) ||
            (bonus.tipo_evento === "matriculacion" && belongsToPeriod) ||
            ((bonus.tipo_evento === "credito" || bonus.tipo_evento === "financiacion") && belongsToPeriod && isCreditoVenta) ||
            (bonus.tipo_evento === "preference" && belongsToPeriod && isPreferenceVenta);

          if (!eventMatches) return;

          if (bonus.tipo_vehiculo === "nuevo" && !isVN) return;
          if (bonus.tipo_vehiculo === "usado" && isVN) return;

          if (bonus.fecha_inicio && exp.fecha_expediente && exp.fecha_expediente < bonus.fecha_inicio) return;
          if (bonus.fecha_fin && exp.fecha_expediente && exp.fecha_expediente > bonus.fecha_fin) return;

          const brandId = exp.modelo?.marca_id || exp.modelo?.marca?.id_marca;
          const filterMarcaMatches = !bonus.id_marca || brandId === bonus.id_marca;
          const filterModeloMatches = !bonus.id_modelo || exp.id_modelo === bonus.id_modelo;

          if (filterMarcaMatches && filterModeloMatches) {
            reglasBonus += bonus.importe;
          }
        });

        const totalExp = baseVN + baseUsado + baseFinanciacion + basePreference + reglasBonus;

        totalBaseVN += baseVN;
        totalUsado += baseUsado;
        totalFinanciacion += baseFinanciacion;
        totalPreference += basePreference;
        totalReglasBonus += reglasBonus;
        totalComisionGlobal += totalExp;

        computedDetailsList.push({
          id_expediente: exp.id_expediente,
          cliente: exp.cliente?.nombre || "Sin cliente",
          modelo: exp.modelo?.nombre_modelo || "S/D",
          marca: exp.modelo?.marca?.nombre || "VO",
          baseVN,
          baseUsado,
          baseFinanciacion,
          basePreference,
          reglasBonus,
          total: totalExp,
          fechaRef: exp.fecha_matriculacion || exp.fecha_rci || exp.fecha_afectacion || exp.fecha_expediente
        });
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
      pedidosPreference,
      matriculadosVN,
      matriculadosVNFinanciados,
      objetivoComputado,
      matriculadosList,
      pendientesList,
      // Nuevos datos económicos agregados
      totalBaseVN,
      totalUsado,
      totalFinanciacion,
      totalPreference,
      totalReglasBonus,
      totalComisionGlobal,
      computedDetailsList: computedDetailsList.filter(d => d.total > 0).sort((a,b) => b.total - a.total)
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
    // Ocultar entregados
    if (ocultarEntregados && exp.fecha_entrega !== null && exp.fecha_entrega !== undefined && exp.fecha_entrega !== "") return false;

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return " ↕";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const sortedExpedientes = [...filteredExpedientes].sort((a, b) => {
    let valA: any = "";
    let valB: any = "";

    switch (sortField) {
      case "cliente":
        valA = a.cliente?.nombre || "";
        valB = b.cliente?.nombre || "";
        break;
      case "marca":
        valA = a.modelo?.marca?.nombre || "";
        valB = b.modelo?.marca?.nombre || "";
        break;
      case "modelo":
        valA = a.modelo?.nombre_modelo || "";
        valB = b.modelo?.nombre_modelo || "";
        break;
      case "tipo_venta":
        valA = a.tipoDeVenta?.nombre_tipo_venta || "";
        valB = b.tipoDeVenta?.nombre_tipo_venta || "";
        break;
      case "estado":
        valA = a.estadoVehiculo?.nombre_estado_vehiculo || "";
        valB = b.estadoVehiculo?.nombre_estado_vehiculo || "";
        break;
      case "vendedor":
        valA = a.usuario?.nombre || "";
        valB = b.usuario?.nombre || "";
        break;
      case "fecha_expediente":
        valA = a.fecha_expediente || "";
        valB = b.fecha_expediente || "";
        break;
      case "fecha_afectacion":
        valA = a.fecha_afectacion || "";
        valB = b.fecha_afectacion || "";
        break;
      case "fecha_rci":
        valA = a.fecha_rci || "";
        valB = b.fecha_rci || "";
        break;
      case "fecha_matriculacion":
        valA = a.fecha_matriculacion || "";
        valB = b.fecha_matriculacion || "";
        break;
      case "fecha_entrega":
        valA = a.fecha_entrega || "";
        valB = b.fecha_entrega || "";
        break;
      default:
        valA = a.fecha_expediente || "";
        valB = b.fecha_expediente || "";
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc"
        ? valA.localeCompare(valB, undefined, { sensitivity: "base" })
        : valB.localeCompare(valA, undefined, { sensitivity: "base" });
    } else {
      return sortOrder === "asc"
        ? (valA > valB ? 1 : -1)
        : (valB > valA ? 1 : -1);
    }
  });

  // Calcular paginación
  const totalFiltered = filteredExpedientes.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpedientes = sortedExpedientes.slice((safePage - 1) * pageSize, safePage * pageSize);

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
          color: "#ffffff",
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
          color: "#ffffff",
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "rgba(255, 255, 255, 0.03)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "8px", 
            fontSize: "0.85rem", 
            color: "var(--text-primary)", 
            cursor: "pointer", 
            background: "rgba(255, 255, 255, 0.05)", 
            border: "1px solid var(--border-light)", 
            padding: "8px 14px", 
            borderRadius: "var(--radius-sm)",
            fontWeight: 600,
            transition: "all 0.2s"
          }}>
            <input
              type="checkbox"
              checked={ocultarEntregados}
              onChange={e => setOcultarEntregados(e.target.checked)}
              style={{
                width: "15px",
                height: "15px",
                accentColor: "var(--primary)",
                cursor: "pointer"
              }}
            />
            <span>Ocultar Entregados</span>
          </label>

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

          <button
            type="button"
            className="btn"
            onClick={() => setDeleteUnlocked(!deleteUnlocked)}
            style={{
              padding: "8px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: deleteUnlocked ? "var(--danger)" : "rgba(255,255,255,0.05)",
              color: deleteUnlocked ? "white" : "var(--text-primary)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600
            }}
            title={deleteUnlocked ? "Bloquear Eliminación" : "Desbloquear Eliminación"}
          >
            {deleteUnlocked ? "🔓 Eliminación Activa" : "🔒 Eliminación Inactiva"}
          </button>

          {bulkSelectionUnlocked && selectedIds.length > 0 && (
            <>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--primary)" }}>
                ({selectedIds.length} seleccionados):
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (deleteUnlocked) setConfirmBulkDelete(true);
                }}
                disabled={!deleteUnlocked}
                style={{ 
                  padding: "6px 12px", 
                  fontSize: "0.8rem", 
                  backgroundColor: deleteUnlocked ? "var(--danger)" : "rgba(255,255,255,0.02)", 
                  color: deleteUnlocked ? "white" : "var(--text-muted)", 
                  border: deleteUnlocked ? "none" : "1px solid var(--border-light)", 
                  cursor: deleteUnlocked ? "pointer" : "not-allowed", 
                  borderRadius: "var(--radius-sm)", 
                  fontWeight: "600",
                  opacity: deleteUnlocked ? 1 : 0.5 
                }}
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
                <th onClick={() => handleSort("cliente")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Cliente{renderSortIndicator("cliente")}
                </th>
                <th onClick={() => handleSort("marca")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Marca{renderSortIndicator("marca")}
                </th>
                <th onClick={() => handleSort("modelo")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Modelo{renderSortIndicator("modelo")}
                </th>
                <th onClick={() => handleSort("tipo_venta")} style={{ cursor: "pointer", userSelect: "none" }}>
                  T. Venta{renderSortIndicator("tipo_venta")}
                </th>
                <th onClick={() => handleSort("estado")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Estado{renderSortIndicator("estado")}
                </th>
                <th onClick={() => handleSort("vendedor")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Vendedor{renderSortIndicator("vendedor")}
                </th>
                <th onClick={() => handleSort("fecha_expediente")} style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)", cursor: "pointer", userSelect: "none" }}>
                  F. Exp.{renderSortIndicator("fecha_expediente")}
                </th>
                <th onClick={() => handleSort("fecha_afectacion")} style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.09)", cursor: "pointer", userSelect: "none" }}>
                  F. Afect{renderSortIndicator("fecha_afectacion")}
                </th>
                <th onClick={() => handleSort("fecha_rci")} style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)", cursor: "pointer", userSelect: "none" }}>
                  F. RCI{renderSortIndicator("fecha_rci")}
                </th>
                <th onClick={() => handleSort("fecha_matriculacion")} style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.09)", cursor: "pointer", userSelect: "none" }}>
                  F. Mat{renderSortIndicator("fecha_matriculacion")}
                </th>
                <th onClick={() => handleSort("fecha_entrega")} style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)", cursor: "pointer", userSelect: "none" }}>
                  F. Entrega{renderSortIndicator("fecha_entrega")}
                </th>
                <th>Acciones</th>
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
                    {exp.cliente?.nombre ? (
                      exp.cliente.nombre
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin Cliente</span>
                        <button
                          type="button"
                          title="Asignar Cliente"
                          onClick={() => {
                            setAssigningClientExpId(exp.id_expediente);
                            setClientSearchQuery("");
                            setClientSearchResults([]);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 6px",
                            fontSize: "0.85rem",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--primary)",
                            borderRadius: "4px",
                            transition: "all 0.2s"
                          }}
                          className="glass-panel-interactive"
                        >
                          🔍
                        </button>
                      </div>
                    )}
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
                        onClick={() => {
                          if (deleteUnlocked) setConfirmDeleteExpediente(exp);
                        }}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          color: deleteUnlocked ? "var(--danger)" : "var(--text-muted)",
                          background: deleteUnlocked ? "rgba(239, 68, 68, 0.05)" : "rgba(255, 255, 255, 0.02)",
                          border: deleteUnlocked ? "1px solid rgba(239, 68, 68, 0.15)" : "1px solid var(--border-light)",
                          borderRadius: "var(--radius-sm)",
                          cursor: deleteUnlocked ? "pointer" : "not-allowed",
                          marginLeft: "8px",
                          fontWeight: 600,
                          transition: "all 0.2s ease",
                          opacity: deleteUnlocked ? 1 : 0.5
                        }}
                        disabled={!deleteUnlocked}
                        className={deleteUnlocked ? "glass-panel-interactive" : ""}
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

        {/* NUEVA MAQUETACIÓN: RESUMEN Y TRAMOS DE COMISIÓN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Fila de Tarjetas Clásicas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
            <div className="glass-panel-interactive" style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>AFECTADOS EN EL MES</span>
              <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--primary)", fontWeight: "bold" }}>{stats.afectados}</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total de afectaciones en el mes</span>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>MATRICULADOS EN EL MES</span>
              <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--success)", fontWeight: "bold" }}>{stats.matriculados}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Cont/Créd/Pref:</span>
                <strong>{stats.matriculadosContado}/{stats.matriculadosCredito}/{stats.matriculadosPreference}</strong>
              </div>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>TASA INT. FINANCIERA</span>
              <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--secondary)", fontWeight: "bold" }}>
                {stats.matriculadosVN > 0 ? `${((stats.matriculadosVNFinanciados / stats.matriculadosVN) * 100).toFixed(1)}%` : "0.0%"}
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>VN Finan/Total:</span>
                <strong>{stats.matriculadosVNFinanciados}/{stats.matriculadosVN}</strong>
              </div>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>PEDIDOS EN EL MES</span>
              <h3 style={{ fontSize: "1.85rem", margin: "8px 0", color: "var(--warning)", fontWeight: "bold" }}>{stats.pedidos}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Cont/Créd/Pref:</span>
                <strong>{stats.pedidosContado}/{stats.pedidosCredito}/{stats.pedidosPreference}</strong>
              </div>
            </div>
          </div>

          {/* Información del Plan y Tramos */}
          {activePlan ? (() => {
            const X = activePlan.objetivo_base + activePlan.arrastre;
            const diff = stats.objetivoComputado - X;
            let tramo = "X-4";
            if (diff >= 3) tramo = "X+3";
            else if (diff === 2) tramo = "X+2";
            else if (diff === 1) tramo = "X+1";
            else if (diff === 0) tramo = "X";
            else if (diff === -1) tramo = "X-1";
            else if (diff === -2) tramo = "X-2";
            else if (diff === -3) tramo = "X-3";
            else tramo = "X-4";

            const tramosValidos = ["X-4", "X-3", "X-2", "X-1", "X", "X+1", "X+2", "X+3"];
            const cumpleMinimoMat = stats.matriculados >= activePlan.min_matriculaciones;

            // Calcular diferencia para el siguiente tramo
            let textoSiguiente = "";
            if (tramo !== "X+3") {
              const valorActual = stats.objetivoComputado;
              let valorSiguiente = X;
              if (tramo === "X-4") valorSiguiente = X - 3;
              else if (tramo === "X-3") valorSiguiente = X - 2;
              else if (tramo === "X-2") valorSiguiente = X - 1;
              else if (tramo === "X-1") valorSiguiente = X;
              else if (tramo === "X") valorSiguiente = X + 1;
              else if (tramo === "X+1") valorSiguiente = X + 2;
              else if (tramo === "X+2") valorSiguiente = X + 3;
              
              const faltan = valorSiguiente - valorActual;
              textoSiguiente = `Faltan ${faltan.toFixed(1)} ud. para subir al tramo ${tramosValidos[tramosValidos.indexOf(tramo) + 1]}`;
            } else {
              textoSiguiente = "¡Estás en el tramo máximo de comisión!";
            }

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
                {/* Panel de Tramos e Inferencia */}
                <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h5 style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>🎯 Seguimiento de Tramos de Comisión</h5>
                    <span className="badge badge-tienda" style={{ fontSize: "0.75rem", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
                      Plan: {activePlan.nombre}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>PUNTOS HOY</span>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)" }}>{stats.objetivoComputado.toFixed(1)}</div>
                    </div>
                    <div style={{ height: "40px", width: "1px", background: "var(--border-light)" }}></div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>OBJETIVO (X)</span>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>{X}</div>
                    </div>
                    <div style={{ height: "40px", width: "1px", background: "var(--border-light)" }}></div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>TRAMO ALCANZADO</span>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--success)" }}>Tramo {tramo}</div>
                    </div>
                  </div>

                  {/* Barra visual de tramos */}
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Línea de Tramos:</span>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", gap: "4px" }}>
                      {tramosValidos.map(t => {
                        const isCurrent = t === tramo;
                        return (
                          <div
                            key={t}
                            style={{
                              flex: 1,
                              textAlign: "center",
                              padding: "6px 2px",
                              fontSize: "0.75rem",
                              fontWeight: isCurrent ? 700 : 400,
                              borderRadius: "4px",
                              background: isCurrent ? "var(--success)" : "rgba(255,255,255,0.03)",
                              color: isCurrent ? "#ffffff" : "var(--text-muted)",
                              border: isCurrent ? "none" : "1px solid var(--border-light)",
                              transition: "all 0.3s ease",
                              boxShadow: isCurrent ? "0 0 10px rgba(16, 185, 129, 0.4)" : "none"
                            }}
                          >
                            {t}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px", textAlign: "right", fontStyle: "italic" }}>
                      {textoSiguiente}
                    </div>
                  </div>

                  {/* Mínimo de matriculaciones */}
                  <div style={{
                    padding: "12px",
                    background: cumpleMinimoMat ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                    border: `1px solid ${cumpleMinimoMat ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: cumpleMinimoMat ? "var(--success)" : "var(--danger)" }}>
                        {cumpleMinimoMat ? "✓ Mínimo de Matriculaciones Cumplido" : "⚠️ Mínimo de Matriculaciones NO Alcanzado"}
                      </strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Necesitas mínimo {activePlan.min_matriculaciones} matriculaciones. Llevas {stats.matriculados}.
                      </div>
                    </div>
                    <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                      {stats.matriculados} / {activePlan.min_matriculaciones}
                    </span>
                  </div>
                </div>

                {/* Panel de Comisiones Acumuladas Estimadas */}
                <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h5 style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>💰 Comisiones Estimadas del Período</h5>
                    <span className="badge" style={{ fontSize: "0.75rem", backgroundColor: cumpleMinimoMat ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", color: cumpleMinimoMat ? "var(--success)" : "var(--danger)" }}>
                      {cumpleMinimoMat ? "Liquidables VN/VO" : "Penalizado (Min. Mat. 0€)"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                    <div style={{ background: "rgba(255, 255, 255, 0.01)", padding: "10px", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "block" }}>TOTAL ESTIMADO</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--success)", fontWeight: 800 }}>
                        {(cumpleMinimoMat ? stats.totalComisionGlobal : (stats.totalFinanciacion + stats.totalPreference + stats.totalReglasBonus)).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </strong>
                    </div>
                    <div style={{ background: "rgba(255, 255, 255, 0.01)", padding: "10px", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "block" }}>COMISIÓN TEÓRICA</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--text-primary)", fontWeight: 700 }}>
                        {stats.totalComisionGlobal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.78rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Base VN:</span>
                      <strong style={{ color: cumpleMinimoMat ? "var(--text-primary)" : "var(--text-muted)", textDecoration: cumpleMinimoMat ? "none" : "line-through" }}>{stats.totalBaseVN.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Base VO / Usado:</span>
                      <strong style={{ color: cumpleMinimoMat ? "var(--text-primary)" : "var(--text-muted)", textDecoration: cumpleMinimoMat ? "none" : "line-through" }}>{stats.totalUsado.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Incentivo Crédito/Finan:</span>
                      <strong>{stats.totalFinanciacion.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Reglas Preference/BOX3:</span>
                      <strong>{stats.totalPreference.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Reglas / Bonus Especiales:</span>
                      <strong>{stats.totalReglasBonus.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>
                    </div>
                  </div>
                </div>

                {/* Desglose de Expedientes */}
                <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", gridColumn: "span 1" }}>
                  <h5 style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>📂 Desglose de Expedientes en el Periodo</h5>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "250px", overflowY: "auto" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--success)" }}>✓ Sumando al Objetivo (Matriculados) ({stats.matriculadosList.length})</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                        {stats.matriculadosList.map((m: any) => {
                          const tipoVenta = m.tipoDeVenta?.nombre_tipo_venta || "N/D";
                          const esFinanciado = m.fecha_rci ? true : false;
                          const commDet = stats.computedDetailsList.find(d => d.id_expediente === m.id_expediente);
                          const commTotal = commDet ? commDet.total : 0;
                          return (
                            <Link
                              href={`/dashboard/expedientes/editar/${m.id_expediente}`}
                              key={m.id_expediente}
                              className="glass-panel-interactive"
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "0.8rem",
                                padding: "8px 12px",
                                background: "rgba(255,255,255,0.01)",
                                borderRadius: "4px",
                                border: "1px solid var(--border-light)",
                                cursor: "pointer",
                                textDecoration: "none",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "70%" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <strong style={{ color: "var(--primary)" }}>#EXP-{String(m.id_expediente).padStart(4, "0")}</strong>
                                  <span style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>
                                    {m.cliente?.nombre || "Sin cliente"}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                                  <span>{m.modelo?.nombre_modelo} ({m.modelo?.marca?.nombre || "VO"})</span>
                                  <span style={{ color: "var(--border-light)" }}>|</span>
                                  <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 4px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>{tipoVenta}</span>
                                  {esFinanciado && (
                                    <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 4px", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>F. RCI</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                <span style={{ fontWeight: 700, color: "var(--success)", fontSize: "0.95rem" }}>
                                  +{m.valorObjetivoEstimado?.toFixed(1) || "1.0"}
                                </span>
                                {commTotal > 0 && (
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                    {commTotal} €
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                        {stats.matriculadosList.length === 0 && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", padding: "4px" }}>
                            No hay expedientes matriculados en este periodo.
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: "8px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--warning)" }}>⏳ Pendientes de Matriculación (Pipeline) ({stats.pendientesList.length})</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                        {stats.pendientesList.map((p: any) => {
                          const tipoVenta = p.tipoDeVenta?.nombre_tipo_venta || "N/D";
                          const esFinanciado = p.fecha_rci ? true : false;
                          return (
                            <Link
                              href={`/dashboard/expedientes/editar/${p.id_expediente}`}
                              key={p.id_expediente}
                              className="glass-panel-interactive"
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "0.8rem",
                                padding: "8px 12px",
                                background: "rgba(255,255,255,0.01)",
                                borderRadius: "4px",
                                border: "1px solid var(--border-light)",
                                cursor: "pointer",
                                textDecoration: "none",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "85%" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <strong style={{ color: "var(--warning)" }}>#EXP-{String(p.id_expediente).padStart(4, "0")}</strong>
                                  <span style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>
                                    {p.cliente?.nombre || "Sin cliente"}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                                  <span>{p.modelo?.nombre_modelo} ({p.modelo?.marca?.nombre || "VO"})</span>
                                  <span style={{ color: "var(--border-light)" }}>|</span>
                                  <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 4px", background: "rgba(245, 158, 11, 0.1)", color: "var(--warning)" }}>{tipoVenta}</span>
                                  {esFinanciado && (
                                    <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 4px", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>F. RCI</span>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                  F. Pedido: {formatDate(p.fecha_expediente)}{p.fecha_afectacion ? ` | F. Afect: ${formatDate(p.fecha_afectacion)}` : ""}
                                </div>
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", whiteSpace: "nowrap" }}>
                                Pedido/Afect.
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div style={{
              padding: "24px",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-light)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              fontSize: "0.9rem"
            }}>
              💡 No hay ningún plan de comisiones aplicable para el período seleccionado ({statsMonth}/{statsYear}).
              Configura un plan en la pestaña de comisiones para habilitar la barra de tramos de objetivos.
            </div>
          )}
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

      {/* MODAL PARA ASIGNAR CLIENTE */}
      {assigningClientExpId && (
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
            gap: "20px"
          }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              Asignar Cliente al Expediente
            </h3>

            {/* Pestañas del Modal */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)", gap: "8px", marginBottom: "8px" }}>
              <button
                type="button"
                style={{
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  color: assignClientModalTab === "buscar" ? "var(--primary)" : "var(--text-secondary)",
                  borderBottom: assignClientModalTab === "buscar" ? "2px solid var(--primary)" : "none",
                  fontWeight: assignClientModalTab === "buscar" ? 700 : 400,
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
                onClick={() => setAssignClientModalTab("buscar")}
              >
                Buscar Existente
              </button>
              <button
                type="button"
                style={{
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  color: assignClientModalTab === "crear" ? "var(--primary)" : "var(--text-secondary)",
                  borderBottom: assignClientModalTab === "crear" ? "2px solid var(--primary)" : "none",
                  fontWeight: assignClientModalTab === "crear" ? 700 : 400,
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
                onClick={() => {
                  setAssignClientModalTab("crear");
                  if (tiendas && tiendas.length > 0 && !newClientTiendaId) {
                    setNewClientTiendaId(String(tiendas[0].id_tienda));
                  }
                }}
              >
                ➕ Crear Nuevo Cliente
              </button>
            </div>

            {assignClientModalTab === "buscar" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0, position: "relative" }}>
                  <label className="form-label">🔍 Buscar Cliente (Nombre o DNI)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Escribe al menos 2 caracteres..."
                    value={clientSearchQuery}
                    onChange={e => handleSearchClientsForAssign(e.target.value)}
                    autoFocus
                  />
                  {searchingClient && (
                    <div style={{ position: "absolute", right: "12px", bottom: "10px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Buscando...
                    </div>
                  )}
                </div>

                {clientSearchResults.length > 0 ? (
                  <div style={{
                    maxHeight: "180px",
                    overflowY: "auto",
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255, 255, 255, 0.02)"
                  }}>
                    {clientSearchResults.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleAssignClient(c)}
                        className="glass-panel-interactive"
                        style={{
                          padding: "10px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border-light)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderRadius: 0
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.nombre}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>DNI: {c.dni || "N/D"}</div>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>Seleccionar →</span>
                      </div>
                    ))}
                  </div>
                ) : clientSearchQuery.trim().length >= 2 && !searchingClient ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "12px" }}>
                    No se encontraron clientes para "{clientSearchQuery}"
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {createClientError && (
                  <div style={{ color: "var(--danger)", fontSize: "0.8rem", padding: "6px 8px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "4px" }}>
                    ⚠️ {createClientError}
                  </div>
                )}
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Juan Pérez"
                    value={newClientNombre}
                    onChange={e => setNewClientNombre(e.target.value)}
                    style={{ padding: "6px 10px" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>DNI / NIE</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 12345678Z"
                    value={newClientDni}
                    onChange={e => setNewClientDni(e.target.value)}
                    style={{ padding: "6px 10px" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>Teléfono</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 600123456"
                    value={newClientTelefono}
                    onChange={e => setNewClientTelefono(e.target.value)}
                    style={{ padding: "6px 10px" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Ej. juan@correo.com"
                    value={newClientEmail}
                    onChange={e => setNewClientEmail(e.target.value)}
                    style={{ padding: "6px 10px" }}
                  />
                </div>

                {tiendas.length > 0 && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.8rem" }}>Tienda Asociada</label>
                    <select
                      className="form-select"
                      value={newClientTiendaId}
                      onChange={e => setNewClientTiendaId(e.target.value)}
                      style={{ padding: "6px 10px" }}
                    >
                      {tiendas.map(t => (
                        <option key={t.id_tienda} value={t.id_tienda}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAssigningClientExpId(null);
                  setClientSearchQuery("");
                  setClientSearchResults([]);
                  setNewClientNombre("");
                  setNewClientDni("");
                  setNewClientEmail("");
                  setNewClientTelefono("");
                  setNewClientTiendaId("");
                  setAssignClientModalTab("buscar");
                  setCreateClientError(null);
                }}
                disabled={loading || creatingClient}
              >
                Cancelar
              </button>
              {assignClientModalTab === "crear" && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateAndAssignClient}
                  disabled={creatingClient}
                >
                  {creatingClient ? "Creando..." : "Crear y Asignar"}
                </button>
              )}
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
