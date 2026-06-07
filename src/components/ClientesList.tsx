"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/date-utils";

interface EmailContact {
  id_email_cliente?: number;
  email: string;
  tipo_email?: string | null;
}

interface TelefonoContact {
  id_telefono_cliente?: number;
  telefono: string;
  tipo_telefono?: string | null;
}

interface ClienteItem {
  id: number;
  cliente_id: string;
  dni: string | null;
  nombre: string | null;
  fecha_de_nacimiento: string | null;
  tienda_id: number | null;
  emails: EmailContact[];
  telefonos: TelefonoContact[];
  expedientes?: any[];
}

interface TiendaItem {
  id_tienda: number;
  nombre: string;
  ciudad: string | null;
}

interface ClientesListProps {
  clientesIniciales: ClienteItem[];
  tiendas: TiendaItem[];
}

type SortField = "nombre" | "dni" | "fecha_de_nacimiento" | "tienda" | "expedientes" | "id";

export default function ClientesList({ clientesIniciales, tiendas }: ClientesListProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteItem[]>(clientesIniciales);
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | false>(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expedientesModalCliente, setExpedientesModalCliente] = useState<ClienteItem | null>(null);

  // Selección múltiple y eliminación
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmDeleteCliente, setConfirmDeleteCliente] = useState<ClienteItem | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkSelectionUnlocked, setBulkSelectionUnlocked] = useState(false);

  // Filtros por columna
  const [filterNombre, setFilterNombre] = useState("");
  const [filterDni, setFilterDni] = useState("");
  const [filterFechaNacimiento, setFilterFechaNacimiento] = useState("");
  const [filterCorreo, setFilterCorreo] = useState("");
  const [filterTelefono, setFilterTelefono] = useState("");
  const [filterTienda, setFilterTienda] = useState("");

  // Ordenación por columnas
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Campos de formulario
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [tiendaId, setTiendaId] = useState("");
  const [emails, setEmails] = useState([{ email: "", tipo: "Principal" }]);
  const [telefonos, setTelefonos] = useState([{ telefono: "", tipo: "Principal" }]);

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(text);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  // Dinámicos de Emails
  const addEmail = () => setEmails([...emails, { email: "", tipo: "Alternativo" }]);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const handleEmailChange = (index: number, val: string) => {
    const updated = [...emails];
    updated[index].email = val;
    setEmails(updated);
  };
  const handleEmailTipoChange = (index: number, val: string) => {
    const updated = [...emails];
    updated[index].tipo = val;
    setEmails(updated);
  };

  // Dinámicos de Teléfonos
  const addTelefono = () => setTelefonos([...telefonos, { telefono: "", tipo: "Alternativo" }]);
  const removeTelefono = (index: number) => setTelefonos(telefonos.filter((_, i) => i !== index));
  const handleTelefonoChange = (index: number, val: string) => {
    const updated = [...telefonos];
    updated[index].telefono = val;
    setTelefonos(updated);
  };
  const handleTelefonoTipoChange = (index: number, val: string) => {
    const updated = [...telefonos];
    updated[index].tipo = val;
    setTelefonos(updated);
  };

  const handleOpenModal = () => {
    setDni("");
    setNombre("");
    setFechaNacimiento("");
    setTiendaId("");
    setEmails([{ email: "", tipo: "Principal" }]);
    setTelefonos([{ telefono: "", tipo: "Principal" }]);
    setModalOpen("create");
  };

  const handleOpenEditModal = (c: ClienteItem) => {
    setSelectedCliente(c);
    setDni(c.dni || "");
    setNombre(c.nombre || "");
    setFechaNacimiento(c.fecha_de_nacimiento || "");
    setTiendaId(c.tienda_id ? String(c.tienda_id) : "");
    if (c.emails && c.emails.length > 0) {
      setEmails(c.emails.map(e => ({ email: e.email, tipo: e.tipo_email || "Principal" })));
    } else {
      setEmails([{ email: "", tipo: "Principal" }]);
    }
    if (c.telefonos && c.telefonos.length > 0) {
      setTelefonos(c.telefonos.map(t => ({ telefono: t.telefono, tipo: t.tipo_telefono || "Principal" })));
    } else {
      setTelefonos([{ telefono: "", tipo: "Principal" }]);
    }
    setModalOpen("edit");
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setLoading(true);

    try {
      const isEdit = modalOpen === "edit";
      const res = await fetch("/api/clientes", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isEdit ? selectedCliente?.id : undefined,
          dni: dni.trim() || null,
          nombre,
          fecha_de_nacimiento: fechaNacimiento || null,
          tienda_id: tiendaId ? Number(tiendaId) : null,
          emails: emails.filter(e => e.email),
          telefonos: telefonos.filter(t => t.telefono)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al guardar cliente.");

      const mappedEmails = emails.filter(e => e.email).map(e => ({ email: e.email, tipo_email: e.tipo }));
      const mappedTelefonos = telefonos.filter(t => t.telefono).map(t => ({ telefono: t.telefono, tipo_telefono: t.tipo }));

      if (isEdit && selectedCliente) {
        setClientes(clientes.map(c => c.id === selectedCliente.id ? {
          ...c,
          dni: dni.trim() || null,
          nombre,
          fecha_de_nacimiento: fechaNacimiento || null,
          tienda_id: tiendaId ? Number(tiendaId) : null,
          emails: mappedEmails,
          telefonos: mappedTelefonos
        } : c));
        showNotification("Cliente actualizado correctamente.", "success");
      } else {
        const nuevoCliente: ClienteItem = {
          id: data.data.id,
          cliente_id: data.data.cliente_id,
          dni: data.data.dni,
          nombre: data.data.nombre,
          fecha_de_nacimiento: data.data.fecha_de_nacimiento,
          tienda_id: data.data.tienda_id,
          emails: mappedEmails,
          telefonos: mappedTelefonos,
          expedientes: []
        };
        setClientes([nuevoCliente, ...clientes]);
        showNotification("Cliente registrado correctamente.", "success");
      }

      setModalOpen(false);
      setSelectedCliente(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Lógica de eliminación unitaria
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteCliente) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?id=${confirmDeleteCliente.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al eliminar cliente.");

      setClientes(clientes.filter(c => c.id !== confirmDeleteCliente.id));
      setSelectedIds(selectedIds.filter(id => id !== confirmDeleteCliente.id));
      showNotification("Cliente eliminado correctamente.", "success");
      setConfirmDeleteCliente(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Lógica de eliminación masiva
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al eliminar clientes seleccionados.");

      setClientes(clientes.filter(c => !selectedIds.includes(c.id)));
      showNotification(`${selectedIds.length} clientes eliminados correctamente.`, "success");
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Gestión de Selección
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredClientesSorted.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(x => x !== id));
    }
  };

  // Manejo de Ordenación
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtrado de Clientes
  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      // Filtrar por Nombre
      if (filterNombre && !c.nombre?.toLowerCase().includes(filterNombre.toLowerCase())) {
        return false;
      }
      // Filtrar por DNI
      if (filterDni && !c.dni?.toLowerCase().includes(filterDni.toLowerCase())) {
        return false;
      }
      // Filtrar por Fecha Nacimiento (formateada o cruda)
      if (filterFechaNacimiento) {
        const fFormatted = c.fecha_de_nacimiento ? formatDate(c.fecha_de_nacimiento).toLowerCase() : "no indicada";
        if (!fFormatted.includes(filterFechaNacimiento.toLowerCase())) {
          return false;
        }
      }
      // Filtrar por Correo
      if (filterCorreo) {
        const match = c.emails.some(e => e.email.toLowerCase().includes(filterCorreo.toLowerCase()));
        if (!match) return false;
      }
      // Filtrar por Teléfono
      if (filterTelefono) {
        const match = c.telefonos.some(t => t.telefono.toLowerCase().includes(filterTelefono.toLowerCase()));
        if (!match) return false;
      }
      // Filtrar por Tienda
      if (filterTienda) {
        if (filterTienda === "global") {
          if (c.tienda_id !== null) return false;
        } else {
          if (c.tienda_id !== Number(filterTienda)) return false;
        }
      }
      return true;
    });
  }, [clientes, filterNombre, filterDni, filterFechaNacimiento, filterCorreo, filterTelefono, filterTienda]);

  // Ordenación de Clientes
  const filteredClientesSorted = useMemo(() => {
    const sorted = [...filteredClientes];
    sorted.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "nombre") {
        valA = a.nombre || "";
        valB = b.nombre || "";
      } else if (sortField === "dni") {
        valA = a.dni || "";
        valB = b.dni || "";
      } else if (sortField === "fecha_de_nacimiento") {
        valA = a.fecha_de_nacimiento || "";
        valB = b.fecha_de_nacimiento || "";
      } else if (sortField === "tienda") {
        const tiendaA = tiendas.find(t => t.id_tienda === a.tienda_id)?.nombre || "Global";
        const tiendaB = tiendas.find(t => t.id_tienda === b.tienda_id)?.nombre || "Global";
        valA = tiendaA;
        valB = tiendaB;
      } else if (sortField === "expedientes") {
        valA = a.expedientes?.length || 0;
        valB = b.expedientes?.length || 0;
      } else {
        valA = a.id;
        valB = b.id;
      }

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? valA - valB
          : valB - valA;
      }
    });
    return sorted;
  }, [filteredClientes, sortField, sortDirection, tiendas]);

  const totalBulkExpedientes = useMemo(() => {
    return clientes
      .filter(c => selectedIds.includes(c.id))
      .reduce((acc, c) => acc + (c.expedientes?.length || 0), 0);
  }, [clientes, selectedIds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* NOTIFICACIONES */}
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

      {/* BARRA SUPERIOR DE ACCIONES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setBulkSelectionUnlocked(!bulkSelectionUnlocked);
              if (bulkSelectionUnlocked) setSelectedIds([]);
            }}
            style={{
              padding: "10px 16px",
              fontSize: "0.85rem",
              backgroundColor: bulkSelectionUnlocked ? "var(--warning)" : "rgba(255,255,255,0.05)",
              color: bulkSelectionUnlocked ? "black" : "var(--text-primary)",
              border: "1px solid var(--border-light)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            title={bulkSelectionUnlocked ? "Bloquear Selección Masiva" : "Desbloquear Selección Masiva"}
          >
            {bulkSelectionUnlocked ? "🔓 Selección Activa" : "🔒 Selección Inactiva"}
          </button>

          {bulkSelectionUnlocked && selectedIds.length > 0 && (
            <div
              className="glass-panel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "8px 16px",
                borderColor: "var(--danger)",
                backgroundColor: "rgba(239, 68, 68, 0.05)",
                animation: "fadeIn 0.2s ease"
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>
                {selectedIds.length} seleccionado(s)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmBulkDelete(true)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  backgroundColor: "var(--danger)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                🗑️ Eliminar Seleccionados
              </button>
            </div>
          )}
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenModal} style={{ padding: "10px 20px" }}>
          + Registrar Nuevo Cliente
        </button>
      </div>

      {/* LISTADO DE CLIENTES */}
      {clientes.length === 0 ? (
        <div className="glass-panel" style={{ padding: "60px 40px", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>No hay clientes registrados en el sistema.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "8px" }}>
          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  {bulkSelectionUnlocked && (
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={filteredClientesSorted.length > 0 && selectedIds.length === filteredClientesSorted.length}
                        onChange={e => handleSelectAll(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                    </th>
                  )}
                  <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer" }}>
                    Nombre {sortField === "nombre" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("dni")} style={{ cursor: "pointer" }}>
                    DNI / NIE {sortField === "dni" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("fecha_de_nacimiento")} style={{ cursor: "pointer" }}>
                    Fecha Nacimiento {sortField === "fecha_de_nacimiento" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Correos</th>
                  <th>Teléfonos</th>
                  <th onClick={() => handleSort("tienda")} style={{ cursor: "pointer" }}>
                    Tienda Asignada {sortField === "tienda" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("expedientes")} style={{ cursor: "pointer" }}>
                    Ventas Realizadas {sortField === "expedientes" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
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
                      value={filterNombre}
                      onChange={e => setFilterNombre(e.target.value)}
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "100px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      className="form-input"
                      value={filterDni}
                      onChange={e => setFilterDni(e.target.value)}
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      className="form-input"
                      value={filterFechaNacimiento}
                      onChange={e => setFilterFechaNacimiento(e.target.value)}
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      className="form-input"
                      value={filterCorreo}
                      onChange={e => setFilterCorreo(e.target.value)}
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "100px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      className="form-input"
                      value={filterTelefono}
                      onChange={e => setFilterTelefono(e.target.value)}
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "80px" }}
                    />
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={filterTienda}
                      onChange={e => setFilterTienda(e.target.value)}
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "100%", minWidth: "120px" }}
                    >
                      <option value="">Todas</option>
                      <option value="global">Global (Sin Tienda)</option>
                      {tiendas.map(t => (
                        <option key={t.id_tienda} value={t.id_tienda}>{t.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td></td>
                  <td style={{ textAlign: "center" }}>
                    {(filterNombre || filterDni || filterFechaNacimiento || filterCorreo || filterTelefono || filterTienda) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterNombre("");
                          setFilterDni("");
                          setFilterFechaNacimiento("");
                          setFilterCorreo("");
                          setFilterTelefono("");
                          setFilterTienda("");
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
                {filteredClientesSorted.map((c) => {
                  const tiendaAsociada = tiendas.find(t => t.id_tienda === c.tienda_id);
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr key={c.id} style={{ background: isSelected && bulkSelectionUnlocked ? "rgba(var(--primary-rgb), 0.04)" : undefined }}>
                      {bulkSelectionUnlocked && (
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => handleSelectOne(c.id, e.target.checked)}
                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          />
                        </td>
                      )}
                      <td style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{c.nombre}</td>
                      <td>{c.dni || "N/D"}</td>
                      <td>{c.fecha_de_nacimiento ? formatDate(c.fecha_de_nacimiento) : "No indicada"}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {c.emails.map((e, idx) => (
                            <div key={idx} style={{ fontSize: "0.85rem" }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginRight: "4px" }}>
                                ({e.tipo_email || "Principal"}):
                              </span>
                              {e.email}
                            </div>
                          ))}
                          {c.emails.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Ninguno</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {c.telefonos.map((t, idx) => (
                            <div key={idx} style={{ fontSize: "0.85rem" }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginRight: "4px" }}>
                                ({t.tipo_telefono || "Principal"}):
                              </span>
                              {t.telefono}
                            </div>
                          ))}
                          {c.telefonos.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Ninguno</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${tiendaAsociada ? "badge-tienda" : "badge-invitado"}`} style={{ fontSize: "0.75rem" }}>
                          {tiendaAsociada ? tiendaAsociada.nombre : "Global (Sin Tienda)"}
                        </span>
                      </td>
                      <td>
                        {c.expedientes && c.expedientes.length > 0 ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setExpedientesModalCliente(c)}
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              color: "var(--primary)",
                              border: "1px solid var(--primary)",
                              background: "rgba(6, 182, 212, 0.05)",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer"
                            }}
                          >
                            {c.expedientes.length} venta(s)
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", paddingLeft: "12px" }}>0</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleOpenEditModal(c)}
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCliente(c)}
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.8rem",
                              color: "var(--danger)",
                              background: "rgba(239, 68, 68, 0.05)",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer"
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMAR BORRADO CLIENTE (MODAL) */}
      {confirmDeleteCliente && (
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
          zIndex: 9999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{ padding: "32px", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ margin: 0, color: "var(--danger)" }}>⚠️ Confirmar Eliminación</h3>
            {confirmDeleteCliente.expedientes && confirmDeleteCliente.expedientes.length > 0 ? (
              <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "1.6" }}>
                El cliente <strong>{confirmDeleteCliente.nombre}</strong> tiene <strong>{confirmDeleteCliente.expedientes.length}</strong> expediente(s) de venta asociado(s).
                <br />
                <span style={{ color: "var(--warning)", fontWeight: "600", display: "block", marginTop: "12px", padding: "10px", background: "rgba(230, 157, 0, 0.05)", border: "1px solid rgba(230, 157, 0, 0.15)", borderRadius: "var(--radius-sm)" }}>
                  ⚠️ Si continúas, estos expedientes se desvincularán del cliente y pasarán a quedar registrados como "Sin cliente".
                </span>
                <span style={{ display: "block", marginTop: "12px" }}>
                  ¿Deseas confirmar la eliminación del cliente?
                </span>
              </p>
            ) : (
              <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "1.6" }}>
                ¿Estás seguro de que deseas eliminar al cliente <strong>{confirmDeleteCliente.nombre}</strong>?
                <br />
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginTop: "8px" }}>
                  Nota: Se eliminarán de forma definitiva sus datos de contacto (correos y teléfonos).
                </span>
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteCliente(null)} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={handleDeleteConfirm} disabled={loading} style={{ backgroundColor: "var(--danger)", color: "#fff", border: "none" }}>
                {loading ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAR BORRADO MASIVO CLIENTES (MODAL) */}
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
          zIndex: 9999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{ padding: "32px", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ margin: 0, color: "var(--danger)" }}>⚠️ Confirmar Eliminación Masiva</h3>
            {totalBulkExpedientes > 0 ? (
              <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "1.6" }}>
                Vas a eliminar <strong>{selectedIds.length}</strong> clientes, los cuales acumulan un total de <strong>{totalBulkExpedientes}</strong> expediente(s) de venta asociados.
                <br />
                <span style={{ color: "var(--warning)", fontWeight: "600", display: "block", marginTop: "12px", padding: "10px", background: "rgba(230, 157, 0, 0.05)", border: "1px solid rgba(230, 157, 0, 0.15)", borderRadius: "var(--radius-sm)" }}>
                  ⚠️ Si continúas, todos estos expedientes quedarán desvinculados (como "Sin cliente").
                </span>
                <span style={{ display: "block", marginTop: "12px" }}>
                  ¿Deseas proceder con la eliminación masiva?
                </span>
              </p>
            ) : (
              <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "1.6" }}>
                ¿Estás seguro de que deseas eliminar los <strong>{selectedIds.length}</strong> clientes seleccionados?
                <br />
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginTop: "8px" }}>
                  Nota: Se borrarán sus datos de contacto de forma definitiva.
                </span>
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmBulkDelete(false)} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={handleBulkDeleteConfirm} disabled={loading} style={{ backgroundColor: "var(--danger)", color: "#fff", border: "none" }}>
                {loading ? "Eliminando..." : "Sí, Eliminar Todo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO MODAL DE REGISTRO / EDICIÓN */}
      {modalOpen && (
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
            maxWidth: "600px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>
              {modalOpen === "edit" ? "Editar Cliente" : "Registrar Nuevo Cliente"}
            </h3>

            <form onSubmit={handleSaveCliente} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">DNI / NIE</label>
                  <input type="text" className="form-input" placeholder="Ej. 12345678Z" value={dni} onChange={e => setDni(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre Completo *</label>
                  <input type="text" className="form-input" placeholder="Ej. María López" value={nombre} onChange={e => setNombre(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha de Nacimiento</label>
                  <input type="date" className="form-input" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tienda de Registro</label>
                  <select className="form-select" value={tiendaId} onChange={e => setTiendaId(e.target.value)}>
                    <option value="">Selecciona Tienda (Opcional)</option>
                    {tiendas.map(t => (
                      <option key={t.id_tienda} value={t.id_tienda}>{t.nombre} {t.ciudad ? `(${t.ciudad})` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* EMAILS DINÁMICOS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Correos Electrónicos</label>
                  <button type="button" className="btn btn-secondary" onClick={addEmail} style={{ padding: "4px 8px", fontSize: "0.75rem" }}>+ Añadir</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {emails.map((e, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px" }}>
                      <input type="email" className="form-input" placeholder="correo@ejemplo.com" value={e.email} onChange={event => handleEmailChange(idx, event.target.value)} style={{ flex: 2 }} />
                      <select className="form-select" value={e.tipo} onChange={event => handleEmailTipoChange(idx, event.target.value)} style={{ flex: 1 }}>
                        <option value="Principal">Principal</option>
                        <option value="Trabajo">Trabajo</option>
                        <option value="Personal">Personal</option>
                      </select>
                      {emails.length > 1 && (
                        <button type="button" className="btn btn-secondary" onClick={() => removeEmail(idx)} style={{ padding: "10px", color: "var(--danger)" }}>🗑️</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* TELEFONOS DINÁMICOS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Teléfonos de Contacto</label>
                  <button type="button" className="btn btn-secondary" onClick={addTelefono} style={{ padding: "4px 8px", fontSize: "0.75rem" }}>+ Añadir</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {telefonos.map((t, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px" }}>
                      <input type="text" className="form-input" placeholder="Ej. 600123456" value={t.telefono} onChange={event => handleTelefonoChange(idx, event.target.value)} style={{ flex: 2 }} />
                      <select className="form-select" value={t.tipo} onChange={event => handleTelefonoTipoChange(idx, event.target.value)} style={{ flex: 1 }}>
                        <option value="Principal">Principal</option>
                        <option value="Móvil">Móvil</option>
                        <option value="Trabajo">Trabajo</option>
                      </select>
                      {telefonos.length > 1 && (
                        <button type="button" className="btn btn-secondary" onClick={() => removeTelefono(idx)} style={{ padding: "10px", color: "var(--danger)" }}>🗑️</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Guardando..." : (modalOpen === "edit" ? "Guardar Cambios" : "Registrar Cliente")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETALLES DE VENTAS (MODAL) */}
      {expedientesModalCliente && (
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
            maxWidth: "800px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", margin: 0 }}>
                Expedientes de {expedientesModalCliente.nombre}
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExpedientesModalCliente(null)}
                style={{ padding: "6px 12px", fontSize: "0.8rem", color: "var(--danger)" }}
              >
                Cerrar
              </button>
            </div>

            <div className="table-container">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Vehículo</th>
                    <th>Método de Venta</th>
                    <th>Estado Vehículo</th>
                    <th>Matrícula</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(expedientesModalCliente.expedientes || []).map((exp: any) => (
                    <tr key={exp.id_expediente}>
                      <td style={{ fontWeight: "bold", color: "var(--primary)" }}>
                        #EXP-{String(exp.id_expediente).padStart(4, "0")}
                      </td>
                      <td>
                        {exp.modelo ? (
                          <>
                            <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{exp.modelo.nombre_modelo}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{exp.modelo.marca?.nombre}</div>
                          </>
                        ) : "N/D"}
                      </td>
                      <td>
                        {exp.tipoDeVenta && (
                          <span className="badge" style={{
                            fontSize: "0.7rem",
                            backgroundColor: exp.tipoDeVenta.color || "#3b82f6",
                            color: "#fff"
                          }}>
                            {exp.tipoDeVenta.nombre_tipo_venta}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() === 'nuevo' ? 'tienda' : 'vendedor'}`}>
                          {exp.estadoVehiculo?.nombre_estado_vehiculo || "N/D"}
                        </span>
                      </td>
                      <td>{exp.matricula || "N/D"}</td>
                      <td>{exp.fecha_expediente ? formatDate(exp.fecha_expediente) : "N/D"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setExpedientesModalCliente(null);
                            router.push(`/dashboard/expedientes/editar/${exp.id_expediente}`);
                          }}
                          style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!expedientesModalCliente.expedientes || expedientesModalCliente.expedientes.length === 0) && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", padding: "20px" }}>
                        No hay expedientes asociados a este cliente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
