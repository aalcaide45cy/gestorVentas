import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { syncUser } from "@/lib/auth-utils";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalSearch from "@/components/GlobalSearch";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await syncUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.bloqueado) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-app)",
        color: "var(--text-primary)",
        padding: "20px"
      }}>
        <div className="glass-panel" style={{
          padding: "50px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          borderLeft: "4px solid var(--danger)",
          maxWidth: "500px"
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
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.5rem" }}>Cuenta Suspendida</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            Tu acceso al sistema ha sido suspendido por un administrador. Si crees que esto es un error, por favor contacta con la dirección.
          </p>
        </div>
      </div>
    );
  }

  const userRole = user.rol || "invitado";
  const userRoleCapitalized = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  // Determinar permisos para las rutas
  const isAdmin = userRole === "administrador";
  const isVendedorOrUp = ["administrador", "director", "jefe_zona", "jefe_tienda", "vendedor"].includes(userRole);
  const canCreateExpediente = ["administrador", "jefe_tienda", "vendedor"].includes(userRole);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "var(--bg-app)",
      position: "relative"
    }}>
      <div className="glow-bg"></div>

      {/* SIDEBAR LATERAL */}
      <aside className="glass-panel" style={{
        width: "280px",
        minHeight: "calc(100vh - 32px)",
        margin: "16px 0 16px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "32px 24px",
        borderRadius: "var(--radius-lg)",
        position: "sticky",
        top: "16px",
        height: "calc(100vh - 32px)",
        zIndex: 10
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {/* CABECERA SIDEBAR (LOGO Y TEMA) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-primary)" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-glow)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <span style={{ fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.02em" }}>GestorVentas</span>
            </Link>
            <ThemeToggle />
          </div>

          {/* PERFIL DE USUARIO EN SIDEBAR */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-light)"
          }}>
            <UserButton />
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.nombre}
              </span>
              <span className={`badge badge-${userRole}`} style={{ alignSelf: "flex-start", marginTop: "4px", fontSize: "0.65rem" }}>
                {userRoleCapitalized}
              </span>
            </div>
          </div>

          {/* MENÚ DE NAVEGACIÓN */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Link href="/dashboard" className="glass-panel-interactive" style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px solid transparent"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </Link>
            
            <Link href="/dashboard/perfil" className="glass-panel-interactive" style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px solid transparent"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Mis Datos
            </Link>

            {isVendedorOrUp && (
              <>
                <Link href="/dashboard/expedientes" className="glass-panel-interactive" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid transparent"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Expedientes
                </Link>

                {canCreateExpediente && (
                  <Link href="/dashboard/expedientes/nuevo" className="glass-panel-interactive" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid transparent"
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nuevo Expediente
                  </Link>
                )}

                <Link href="/dashboard/clientes" className="glass-panel-interactive" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid transparent"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Clientes
                </Link>
              </>
            )}

            {isAdmin && (
              <Link href="/dashboard/admin" className="glass-panel-interactive" style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.95rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                background: "rgba(255, 255, 255, 0.01)",
                border: "1px solid transparent"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Configuración
              </Link>
            )}
          </nav>
        </div>

        {/* FOOTER SIDEBAR */}
        <div style={{
          borderTop: "1px solid var(--border-light)",
          paddingTop: "20px",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--text-muted)"
        }}>
          GestorVentas v1.0.0
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main style={{
        flex: 1,
        padding: "32px",
        overflowY: "auto",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "32px"
      }}>
        {/* CABECERA SUPERIOR DE ACCIONES */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          width: "100%",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--border-light)",
          marginBottom: "-8px"
        }}>
          <GlobalSearch />
        </div>

        {children}
      </main>
    </div>
  );
}
