"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function ClientesList({ clientesIniciales, tiendas }: ClientesListProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteItem[]>(clientesIniciales);
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | false>(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    if (!dni.trim() || !nombre.trim()) return;
    setLoading(true);

    try {
      const isEdit = modalOpen === "edit";
      const res = await fetch("/api/clientes", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isEdit ? selectedCliente?.id : undefined,
          dni,
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
          dni,
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
          telefonos: mappedTelefonos
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* NOTIFICACIONES */}
      {error && (
        <div className="glass-panel" style={{ padding: "12px 16px", color: "var(--danger)", borderLeft: "4px solid var(--danger)", background: "rgba(239, 68, 68, 0.05)" }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="glass-panel" style={{ padding: "12px 16px", color: "var(--success)", borderLeft: "4px solid var(--success)", background: "rgba(16, 185, 129, 0.05)" }}>
          ✓ {success}
        </div>
      )}

      {/* BOTÓN ALTA CLIENTE */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                  <th>Nombre</th>
                  <th>DNI / NIE</th>
                  <th>Fecha Nacimiento</th>
                  <th>Correos</th>
                  <th>Teléfonos</th>
                  <th>Tienda Asignada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const tiendaAsociada = tiendas.find(t => t.id_tienda === c.tienda_id);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{c.nombre}</td>
                      <td>{c.dni}</td>
                      <td>{c.fecha_de_nacimiento || "No indicada"}</td>
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
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenEditModal(c)}
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORMULARIO MODAL DE REGISTRO */}
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
                  <label className="form-label">DNI / NIE *</label>
                  <input type="text" className="form-input" placeholder="Ej. 12345678Z" value={dni} onChange={e => setDni(e.target.value)} required />
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
    </div>
  );
}
