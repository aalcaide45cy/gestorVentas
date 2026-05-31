"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EmailContact {
  email: string;
}

interface TelefonoContact {
  telefono: string;
}

interface UserItem {
  id_usuario: number;
  clerk_id: string;
  nombre: string | null;
  rol: string | null;
  fecha_de_registro: string | null;
  emails: EmailContact[];
  telefonos: TelefonoContact[];
}

interface AdminUsuariosListProps {
  usuariosIniciales: UserItem[];
  currentUserId: string; // Para evitar que el administrador se auto-desasigne su propio rol de administrador
}

export default function AdminUsuariosList({ usuariosIniciales, currentUserId }: AdminUsuariosListProps) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UserItem[]>(usuariosIniciales);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleRolChange = async (idUsuario: number, clerkId: string, nuevoRol: string) => {
    // Evitar que el administrador se quite el rol a sí mismo
    if (clerkId === currentUserId && nuevoRol !== "administrador") {
      setNotification({
        text: "No puedes quitarte el rol de Administrador a ti mismo para evitar perder acceso.",
        type: "error"
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setUpdatingId(idUsuario);
    setNotification(null);

    try {
      const response = await fetch("/api/admin/usuarios/rol", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: idUsuario,
          rol: nuevoRol
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar rol.");
      }

      // Actualizar estado local
      setUsuarios(prev =>
        prev.map(u => (u.id_usuario === idUsuario ? { ...u, rol: nuevoRol } : u))
      );

      setNotification({
        text: "Rol actualizado correctamente.",
        type: "success"
      });
      router.refresh();
    } catch (error: any) {
      setNotification({
        text: error.message || "Error al actualizar el rol.",
        type: "error"
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {notification && (
        <div className="glass-panel" style={{
          padding: "12px 16px",
          color: notification.type === "success" ? "var(--success)" : "var(--danger)",
          borderLeft: `4px solid var(--${notification.type === "success" ? "success" : "danger"})`,
          background: `rgba(${notification.type === "success" ? "16, 185, 129" : "239, 68, 68"}, 0.05)`,
          fontSize: "0.9rem"
        }}>
          {notification.text}
        </div>
      )}

      <div className="table-container">
        <table className="table-premium">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Contacto</th>
              <th>Fecha de Ingreso</th>
              <th>Rol Asignado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usr) => (
              <tr key={usr.id_usuario}>
                <td>
                  <div style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{usr.nombre}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    ID: {usr.clerk_id.substring(0, 15)}...
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {usr.emails?.[0]?.email && <span>📧 {usr.emails[0].email}</span>}
                    {usr.telefonos?.[0]?.telefono && <span>📞 {usr.telefonos[0].telefono}</span>}
                  </div>
                </td>
                <td>{usr.fecha_de_registro || "No registrada"}</td>
                <td>
                  <span className={`badge badge-${usr.rol || "invitado"}`}>
                    {usr.rol || "invitado"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <select
                      className="form-select"
                      value={usr.rol || "invitado"}
                      onChange={(e) => handleRolChange(usr.id_usuario, usr.clerk_id, e.target.value)}
                      disabled={updatingId === usr.id_usuario}
                      style={{ padding: "8px 12px", width: "160px", fontSize: "0.85rem" }}
                    >
                      <option value="administrador">Administrador</option>
                      <option value="director">Director</option>
                      <option value="jefe_zona">Jefe de Zona</option>
                      <option value="jefe_tienda">Jefe de Tienda</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="invitado">Invitado</option>
                    </select>
                    {updatingId === usr.id_usuario && (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Guardando...</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
