import { syncUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { desc } from "drizzle-orm";
import { clientes } from "@/db/schema";

export default async function ClientesPage() {
  const user = await syncUser();

  if (!user || user.rol === "invitado") {
    redirect("/dashboard");
  }

  // Obtener clientes de la base de datos con sus listas de correos y teléfonos
  const dbClientes = await db.query.clientes.findMany({
    orderBy: [desc(clientes.id)],
    with: {
      emails: true,
      telefonos: true
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* CABECERA */}
      <div>
        <h1 style={{ fontSize: "1.85rem", marginBottom: "8px" }}>Base de Clientes</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Directorio de clientes registrados y su información de contacto (correos y teléfonos).
        </p>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {dbClientes.length === 0 ? (
        /* VISTA VACÍA */
        <div className="glass-panel" style={{
          padding: "60px 40px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(6, 182, 212, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--secondary)",
            marginBottom: "8px"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.4rem" }}>No hay clientes registrados</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "460px", lineHeight: "1.6" }}>
            Los clientes se registran automáticamente cuando creas un expediente de venta. Registra un nuevo expediente para comenzar a poblar tu base de datos de clientes.
          </p>
        </div>
      ) : (
        /* TABLA DE CLIENTES */
        <div className="glass-panel" style={{ padding: "8px" }}>
          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Cliente ID</th>
                  <th>Nombre</th>
                  <th>DNI / NIE</th>
                  <th>Fecha Nacimiento</th>
                  <th>Correos</th>
                  <th>Teléfonos</th>
                  <th>Tienda</th>
                </tr>
              </thead>
              <tbody>
                {dbClientes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {c.cliente_id.substring(0, 8)}...
                    </td>
                    <td style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{c.nombre}</td>
                    <td>{c.dni}</td>
                    <td>{c.fecha_de_nacimiento || "No indicada"}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {c.emails.map((e) => (
                          <div key={e.id_email_cliente} style={{ fontSize: "0.85rem" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginRight: "4px" }}>
                              ({e.tipo_email}):
                            </span>
                            {e.email}
                          </div>
                        ))}
                        {c.emails.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Ninguno</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {c.telefonos.map((t) => (
                          <div key={t.id_telefono_cliente} style={{ fontSize: "0.85rem" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginRight: "4px" }}>
                              ({t.tipo_telefono}):
                            </span>
                            {t.telefono}
                          </div>
                        ))}
                        {c.telefonos.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Ninguno</span>}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-invitado" style={{ fontSize: "0.75rem" }}>
                        ID: {c.tienda_id || "Global"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
