import { syncUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { db } from "@/db";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { expedientes } from "@/db/schema";
import ExpedientesList from "@/components/ExpedientesList";

export default async function ExpedientesPage() {
  const user = await syncUser();

  if (!user || user.rol === "invitado") {
    redirect("/dashboard");
  }

  const userRole = user.rol || "invitado";
  const canCreate = ["administrador", "jefe_tienda", "vendedor"].includes(userRole);

  // Obtener expedientes de la base de datos con relaciones resueltas por Drizzle ORM
  const dbExpedientes = await db.query.expedientes.findMany({
    orderBy: [desc(expedientes.id_expediente)],
    with: {
      cliente: {
        with: {
          emails: true,
          telefonos: true
        }
      },
      modelo: {
        with: {
          marca: true
        }
      },
      tipoDeVenta: true,
      estadoVehiculo: true,
      usuario: true
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* CABECERA */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", marginBottom: "8px" }}>Control de Expedientes</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Listado completo de ventas realizadas y seguimiento de expedientes.
          </p>
        </div>

        {canCreate && (
          <Link href="/dashboard/expedientes/nuevo" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Expediente
          </Link>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {dbExpedientes.length === 0 ? (
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
            background: "rgba(124, 58, 237, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
            marginBottom: "8px"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.4rem" }}>No hay expedientes registrados</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "460px", lineHeight: "1.6" }}>
            Aún no se ha guardado ninguna venta en el sistema. Registra un nuevo expediente para comenzar a llevar el control.
          </p>
          {canCreate && (
            <Link href="/dashboard/expedientes/nuevo" className="btn btn-primary" style={{ marginTop: "8px" }}>
              Registrar Primera Venta
            </Link>
          )}
        </div>
      ) : (
        <ExpedientesList expedientesIniciales={dbExpedientes} userRole={userRole} />
      )}
    </div>
  );
}
