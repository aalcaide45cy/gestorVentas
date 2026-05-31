"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MarcaItem {
  id_marca: number;
  nombre: string;
  activo: boolean | null;
  modelos: {
    id_modelo: number;
    nombre_modelo: string;
  }[];
}

interface DropdownItem {
  id: number;
  nombre: string;
}

interface TiendaItem {
  id_tienda: number;
  nombre: string;
  ciudad: string | null;
}

interface AdminCatalogosFormProps {
  marcasIniciales: MarcaItem[];
  tiposVentaIniciales: DropdownItem[];
  estadosVehiculoIniciales: DropdownItem[];
  tiendasIniciales: TiendaItem[];
}

type TabType = "marcas" | "modelos" | "tiendas" | "ventas";

export default function AdminCatalogosForm({
  marcasIniciales,
  tiposVentaIniciales,
  estadosVehiculoIniciales,
  tiendasIniciales
}: AdminCatalogosFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("marcas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Datos locales
  const [marcas, setMarcas] = useState<MarcaItem[]>(marcasIniciales);
  const [tiposVenta, setTiposVenta] = useState<DropdownItem[]>(tiposVentaIniciales);
  const [estadosVehiculo, setEstadosVehiculo] = useState<DropdownItem[]>(estadosVehiculoIniciales);
  const [tiendas, setTiendas] = useState<TiendaItem[]>(tiendasIniciales);

  // Estados de formularios
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [nuevoModeloMarcaId, setNuevoModeloMarcaId] = useState<number | "">("");
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState("");
  const [nuevoTipoVentaNombre, setNuevoTipoVentaNombre] = useState("");
  const [nuevoEstadoVehiculoNombre, setNuevoEstadoVehiculoNombre] = useState("");
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState("");
  const [nuevaTiendaCiudad, setNuevaTiendaCiudad] = useState("");

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(text);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  // Estados para edición
  const [editingType, setEditingType] = useState<TabType | "estado_vehiculo" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [editingExtra, setEditingExtra] = useState(""); // para ciudad en tiendas

  const iniciarEdicion = (tipo: TabType | "estado_vehiculo", id: number, nombre: string, extra = "") => {
    setEditingType(tipo);
    setEditingId(id);
    setEditingNombre(nombre);
    setEditingExtra(extra);
  };

  const cancelarEdicion = () => {
    setEditingType(null);
    setEditingId(null);
    setEditingNombre("");
    setEditingExtra("");
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNombre.trim() || !editingId || !editingType) return;
    setLoading(true);

    try {
      if (editingType === "tiendas") {
        const res = await fetch("/api/admin/tiendas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_tienda: editingId, nombre: editingNombre, ciudad: editingExtra })
        });
        if (!res.ok) throw new Error("Error al actualizar la tienda");
        const result = await res.json();
        setTiendas(tiendas.map(t => t.id_tienda === editingId ? { ...t, nombre: result.data.nombre, ciudad: result.data.ciudad } : t));
        showNotification("Tienda actualizada correctamente", "success");
      } else {
        let payloadType = editingType as string;
        if (editingType === "ventas") {
          const esTipoVenta = tiposVenta.some(tv => tv.id === editingId);
          payloadType = esTipoVenta ? "tipo_venta" : "estado_vehiculo";
        } else if (editingType === "marcas") {
          payloadType = "marca";
        } else if (editingType === "modelos") {
          payloadType = "modelo";
        }

        const res = await fetch("/api/admin/catalogos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: payloadType, id: editingId, nombre: editingNombre, nombre_modelo: editingNombre, nombre_tipo_venta: editingNombre, nombre_estado_vehiculo: editingNombre })
        });

        if (!res.ok) throw new Error("Error al actualizar catálogo");
        const result = await res.json();

        if (payloadType === "marca") {
          setMarcas(marcas.map(m => m.id_marca === editingId ? { ...m, nombre: result.data.nombre } : m));
        } else if (payloadType === "modelo") {
          setMarcas(marcas.map(m => ({
            ...m,
            modelos: m.modelos.map(mod => mod.id_modelo === editingId ? { ...mod, nombre_modelo: result.data.nombre_modelo } : mod)
          })));
        } else if (payloadType === "tipo_venta") {
          setTiposVenta(tiposVenta.map(tv => tv.id === editingId ? { ...tv, nombre: result.data.nombre_tipo_venta } : tv));
        } else if (payloadType === "estado_vehiculo") {
          setEstadosVehiculo(estadosVehiculo.map(ev => ev.id === editingId ? { ...ev, nombre: result.data.nombre_estado_vehiculo } : ev));
        }

        showNotification("Elemento actualizado correctamente", "success");
      }
      cancelarEdicion();
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES DE CREACIÓN ---

  const handleCrearMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMarcaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", nombre: nuevaMarcaNombre })
      });

      if (!res.ok) throw new Error("Error al crear la marca");
      const result = await res.json();
      
      setMarcas([...marcas, { ...result.data, modelos: [] }]);
      setNuevaMarcaNombre("");
      showNotification("Marca creada correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoModeloMarcaId || !nuevoModeloNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "modelo",
          marca_id: nuevoModeloMarcaId,
          nombre_modelo: nuevoModeloNombre
        })
      });

      if (!res.ok) throw new Error("Error al crear el modelo");
      const result = await res.json();

      setMarcas(marcas.map(m => {
        if (m.id_marca === Number(nuevoModeloMarcaId)) {
          return {
            ...m,
            modelos: [...m.modelos, { id_modelo: result.data.id_modelo, nombre_modelo: result.data.nombre_modelo }]
          };
        }
        return m;
      }));

      setNuevoModeloNombre("");
      showNotification("Modelo creado correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaTiendaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/tiendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaTiendaNombre, ciudad: nuevaTiendaCiudad })
      });

      if (!res.ok) throw new Error("Error al crear tienda");
      const result = await res.json();

      setTiendas([...tiendas, {
        id_tienda: result.data.id_tienda,
        nombre: result.data.nombre,
        ciudad: result.data.ciudad
      }]);
      setNuevaTiendaNombre("");
      setNuevaTiendaCiudad("");
      showNotification("Tienda creada correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTipoVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTipoVentaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "tipo_venta", nombre_tipo_venta: nuevoTipoVentaNombre })
      });

      if (!res.ok) throw new Error("Error al crear tipo de venta");
      const result = await res.json();

      setTiposVenta([...tiposVenta, { id: result.data.id_tipo_de_venta, nombre: result.data.nombre_tipo_venta }]);
      setNuevoTipoVentaNombre("");
      showNotification("Tipo de venta creado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearEstadoVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEstadoVehiculoNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "estado_vehiculo", nombre_estado_vehiculo: nuevoEstadoVehiculoNombre })
      });

      if (!res.ok) throw new Error("Error al crear estado");
      const result = await res.json();

      setEstadosVehiculo([...estadosVehiculo, { id: result.data.id_estado_vehiculo, nombre: result.data.nombre_estado_vehiculo }]);
      setNuevoEstadoVehiculoNombre("");
      showNotification("Estado de vehículo creado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES DE ELIMINACIÓN ---

  const handleToggleMarcaActiva = async (idMarca: number, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", id: idMarca, toggleActivo: true, activo: nuevoEstado })
      });

      if (!res.ok) throw new Error("Error al cambiar estado de la marca");

      setMarcas(marcas.map(m => m.id_marca === idMarca ? { ...m, activo: nuevoEstado } : m));
      showNotification(`Marca ${nuevoEstado ? "activada" : "desactivada"}`, "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarMarcaFisicamente = async (idMarca: number, nombreMarca: string) => {
    if (!confirm(`¿Seguro que deseas eliminar definitivamente la marca "${nombreMarca}"? Se eliminarán todos sus modelos asociados.`)) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", id: idMarca })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar la marca porque tiene modelos referenciados en expedientes activos.");
      }
      if (!res.ok) throw new Error("Error al eliminar la marca");

      setMarcas(marcas.filter(m => m.id_marca !== idMarca));
      showNotification("Marca eliminada con éxito", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarModelo = async (idModelo: number, idMarca: number) => {
    if (!confirm("¿Seguro que deseas eliminar este modelo? Se borrará del catálogo.")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "modelo", id: idModelo })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar este modelo porque está asociado a expedientes de venta activos.");
      }
      if (!res.ok) throw new Error("Error al eliminar modelo");

      setMarcas(marcas.map(m => {
        if (m.id_marca === idMarca) {
          return { ...m, modelos: m.modelos.filter(mod => mod.id_modelo !== idModelo) };
        }
        return m;
      }));
      showNotification("Modelo eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarTienda = async (idTienda: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta tienda física?")) return;

    try {
      const res = await fetch("/api/admin/tiendas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tienda: idTienda })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al eliminar tienda");

      setTiendas(tiendas.filter(t => t.id_tienda !== idTienda));
      showNotification("Tienda eliminada con éxito", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarTipoVenta = async (idTipo: number) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de venta?")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "tipo_venta", id: idTipo })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar porque tiene expedientes de venta registrados.");
      }
      if (!res.ok) throw new Error("Error al eliminar");

      setTiposVenta(tiposVenta.filter(t => t.id !== idTipo));
      showNotification("Tipo de venta eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarEstadoVehiculo = async (idEstado: number) => {
    if (!confirm("¿Seguro que deseas eliminar este estado de vehículo?")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "estado_vehiculo", id: idEstado })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar porque tiene expedientes de venta registrados.");
      }
      if (!res.ok) throw new Error("Error al eliminar");

      setEstadosVehiculo(estadosVehiculo.filter(ev => ev.id !== idEstado));
      showNotification("Estado de vehículo eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* NOTIFICACIONES */}
      {error && (
        <div className="glass-panel" style={{ padding: "16px", color: "var(--danger)", borderLeft: "4px solid var(--danger)", background: "rgba(239, 68, 68, 0.05)", fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="glass-panel" style={{ padding: "16px", color: "var(--success)", borderLeft: "4px solid var(--success)", background: "rgba(16, 185, 129, 0.05)", fontWeight: 500 }}>
          ✓ {success}
        </div>
      )}

      {/* PESTAÑAS (TABS) */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn ${activeTab === "marcas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("marcas")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🏷️ Marcas
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "modelos" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("modelos")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🚙 Modelos
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "tiendas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("tiendas")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🏢 Tiendas
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "ventas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("ventas")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          💰 Pagos y Estados
        </button>
      </div>

      {/* PESTAÑA: MARCAS */}
      {activeTab === "marcas" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Gestión de Marcas</h3>
          
          <form onSubmit={handleCrearMarca} style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de nueva marca... (Ej. Nissan)"
              value={nuevaMarcaNombre}
              onChange={e => setNuevaMarcaNombre(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: "12px 20px" }} disabled={loading}>
              + Crear Marca
            </button>
          </form>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {marcas.map(m => {
              const isEditing = editingType === "marcas" && editingId === m.id_marca;
              return (
                <div key={m.id_marca} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-light)",
                  gap: "10px"
                }}>
                  {isEditing ? (
                    <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "8px", width: "100%", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-input"
                        value={editingNombre}
                        onChange={e => setEditingNombre(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: "0.85rem", flex: 1 }}
                        required
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: "6px 10px", fontSize: "0.8rem" }} disabled={loading}>✓</button>
                      <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "6px 10px", fontSize: "0.8rem" }}>✗</button>
                    </form>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: m.activo ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {m.nombre}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {m.modelos.length} modelo(s)
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => iniciarEdicion("marcas", m.id_marca, m.nombre)}
                          style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleToggleMarcaActiva(m.id_marca, !!m.activo)}
                          style={{ padding: "6px 10px", fontSize: "0.8rem", color: m.activo ? "var(--success)" : "var(--warning)" }}
                        >
                          {m.activo ? "Activa" : "Inactiva"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleEliminarMarcaFisicamente(m.id_marca, m.nombre)}
                          style={{ padding: "6px 10px", color: "var(--danger)", border: "1px solid var(--border-light)" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA: MODELOS */}
      {activeTab === "modelos" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Gestión de Modelos</h3>

          <form onSubmit={handleCrearModelo} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <select
                className="form-select"
                value={nuevoModeloMarcaId}
                onChange={e => setNuevoModeloMarcaId(e.target.value ? Number(e.target.value) : "")}
                required
                style={{ flex: 1, minWidth: "160px" }}
              >
                <option value="">Selecciona Marca</option>
                {marcas.filter(m => m.activo).map(m => (
                  <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                ))}
              </select>
              <input
                type="text"
                className="form-input"
                placeholder="Nombre de modelo... (Ej. Qashqai)"
                value={nuevoModeloNombre}
                onChange={e => setNuevoModeloNombre(e.target.value)}
                disabled={loading || !nuevoModeloMarcaId}
                required
                style={{ flex: 2, minWidth: "200px" }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }} disabled={loading || !nuevoModeloMarcaId}>
              + Crear Modelo
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {marcas.map(m => (
              <div key={m.id_marca} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase" }}>{m.nombre}</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", paddingLeft: "10px", borderLeft: "2px solid rgba(124, 58, 237, 0.2)" }}>
                  {m.modelos.map(mod => {
                    const isEditing = editingType === "modelos" && editingId === mod.id_modelo;
                    return (
                      <div key={mod.id_modelo} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-light)",
                        gap: "6px"
                      }}>
                        {isEditing ? (
                          <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "6px", width: "100%", alignItems: "center" }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingNombre}
                              onChange={e => setEditingNombre(e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "0.85rem", flex: 1 }}
                              required
                              autoFocus
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} disabled={loading}>✓</button>
                            <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "4px 8px", fontSize: "0.75rem" }}>✗</button>
                          </form>
                        ) : (
                          <>
                            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{mod.nombre_modelo}</span>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => iniciarEdicion("modelos", mod.id_modelo, mod.nombre_modelo)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0 }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarModelo(mod.id_modelo, m.id_marca)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 0 }}
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {m.modelos.length === 0 && (
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Sin modelos registrados</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: TIENDAS */}
      {activeTab === "tiendas" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Gestión de Tiendas Físicas</h3>

          <form onSubmit={handleCrearTienda} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de la tienda... (Ej. Concesionario Central)"
              value={nuevaTiendaNombre}
              onChange={e => setNuevaTiendaNombre(e.target.value)}
              disabled={loading}
              required
              style={{ flex: 2, minWidth: "200px" }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Ciudad... (Ej. Madrid)"
              value={nuevaTiendaCiudad}
              onChange={e => setNuevaTiendaCiudad(e.target.value)}
              disabled={loading}
              style={{ flex: 1, minWidth: "150px" }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              + Crear Tienda
            </button>
          </form>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {tiendas.map(t => {
              const isEditing = editingType === "tiendas" && editingId === t.id_tienda;
              return (
                <div key={t.id_tienda} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-light)",
                  gap: "10px"
                }}>
                  {isEditing ? (
                    <form onSubmit={handleGuardarEdicion} style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nombre de la tienda"
                        value={editingNombre}
                        onChange={e => setEditingNombre(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                        required
                        autoFocus
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ciudad"
                        value={editingExtra}
                        onChange={e => setEditingExtra(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                      />
                      <div style={{ display: "flex", gap: "6px", alignSelf: "flex-end" }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} disabled={loading}>✓ Guardar</button>
                        <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>✗ Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                        {t.ciudad && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>📍 {t.ciudad}</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => iniciarEdicion("tiendas", t.id_tienda, t.nombre, t.ciudad || "")}
                          style={{ padding: "8px" }}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleEliminarTienda(t.id_tienda)}
                          style={{ padding: "8px", color: "var(--danger)", border: "1px solid var(--border-light)" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {tiendas.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontStyle: "italic", gridColumn: "1 / -1" }}>
                No hay tiendas registradas en el sistema.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA: VENTAS (TIPOS & ESTADOS) */}
      {activeTab === "ventas" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", flexWrap: "wrap" }}>
          {/* TIPOS DE VENTA */}
          <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ fontSize: "1.15rem" }}>Tipos de Venta (Pagos)</h3>

            <form onSubmit={handleCrearTipoVenta} style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Financiación Preference"
                value={nuevoTipoVentaNombre}
                onChange={e => setNuevoTipoVentaNombre(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                + Crear
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "350px", overflowY: "auto" }}>
              {tiposVenta.map(t => {
                const isEditing = editingType === "ventas" && editingId === t.id;
                return (
                  <div key={t.id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-light)",
                    gap: "6px"
                  }}>
                    {isEditing ? (
                      <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "6px", width: "100%", alignItems: "center" }}>
                        <input
                          type="text"
                          className="form-input"
                          value={editingNombre}
                          onChange={e => setEditingNombre(e.target.value)}
                          style={{ padding: "4px 8px", fontSize: "0.85rem", flex: 1 }}
                          required
                          autoFocus
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} disabled={loading}>✓</button>
                        <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "4px 8px", fontSize: "0.75rem" }}>✗</button>
                      </form>
                    ) : (
                      <>
                        <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => iniciarEdicion("ventas", t.id, t.nombre)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0 }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarTipoVenta(t.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 0 }}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ESTADOS DE VEHÍCULO */}
          <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ fontSize: "1.15rem" }}>Estados del Vehículo</h3>

            <form onSubmit={handleCrearEstadoVehiculo} style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Buyback"
                value={nuevoEstadoVehiculoNombre}
                onChange={e => setNuevoEstadoVehiculoNombre(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                + Crear
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "350px", overflowY: "auto" }}>
              {estadosVehiculo.map(ev => {
                const isEditing = editingType === "ventas" && editingId === ev.id;
                return (
                  <div key={ev.id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-light)",
                    gap: "6px"
                  }}>
                    {isEditing ? (
                      <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "6px", width: "100%", alignItems: "center" }}>
                        <input
                          type="text"
                          className="form-input"
                          value={editingNombre}
                          onChange={e => setEditingNombre(e.target.value)}
                          style={{ padding: "4px 8px", fontSize: "0.85rem", flex: 1 }}
                          required
                          autoFocus
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} disabled={loading}>✓</button>
                        <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "4px 8px", fontSize: "0.75rem" }}>✗</button>
                      </form>
                    ) : (
                      <>
                        <span style={{ fontWeight: 600 }}>{ev.nombre}</span>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => iniciarEdicion("ventas", ev.id, ev.nombre)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0 }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarEstadoVehiculo(ev.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 0 }}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
