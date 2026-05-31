import { syncUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { db } from "@/db";

export default async function AdminPage() {
  const user = await syncUser();

  // Validar rol de administrador
  if (!user || user.rol !== "administrador") {
    return (
      <div className="glass-panel" style={{
        padding: "50px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        borderLeft: "4px solid var(--danger)",
        marginTop: "40px"
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--danger)"
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 style={{ fontSize: "1.5rem" }}>Acceso Denegado</h2>
        <p style={{ color: "var(--text-secondary)", maxWidth: "450px", lineHeight: "1.6" }}>
          Esta área es exclusiva para usuarios con rol de <strong>Administrador</strong>. Tu rol actual es <strong>{(user?.rol || "invitado").toUpperCase()}</strong>.
        </p>
      </div>
    );
  }

  // Obtener todos los usuarios de la base de datos
  const dbUsuarios = await db.query.usuarios.findMany({
    with: {
      emails: true,
      telefonos: true
    }
  });

  // Obtener todas las marcas con sus modelos
  const dbMarcas = await db.query.marcas.findMany({
    with: {
      modelos: true
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      {/* CABECERA */}
      <div>
        <h1 style={{ fontSize: "1.85rem", marginBottom: "8px" }}>Panel de Configuración y Control</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Administra los roles de los usuarios del sistema y supervisa el catálogo de vehículos.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "40px" }}>
        {/* SECCIÓN 1: CONTROL DE ROLES DE USUARIOS */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "20px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Gestión de Usuarios y Roles
          </h2>

          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>ID Registro</th>
                  <th>Contacto</th>
                  <th>Fecha de Ingreso</th>
                  <th>Rol Asignado</th>
                </tr>
              </thead>
              <tbody>
                {dbUsuarios.map((usr) => (
                  <tr key={usr.id_usuario}>
                    <td style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{usr.nombre}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {usr.clerk_id.substring(0, 12)}...
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN 2: CATÁLOGO DE MARCAS Y MODELOS */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "20px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            Catálogo de Marcas y Modelos
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px"
          }}>
            {dbMarcas.map((marca) => (
              <div key={marca.id_marca} style={{
                padding: "20px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-light)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "1.1rem" }}>{marca.nombre}</h3>
                  <span className="badge badge-tienda" style={{ fontSize: "0.65rem" }}>
                    {marca.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Modelos del catálogo:</span>
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    {marca.modelos.map((mod) => (
                      <li key={mod.id_modelo} style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        padding: "4px 8px",
                        background: "rgba(255, 255, 255, 0.02)",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        borderLeft: "2px solid var(--primary)"
                      }}>
                        {mod.nombre_modelo}
                      </li>
                    ))}
                    {marca.modelos.length === 0 && (
                      <li style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        Sin modelos asociados
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
