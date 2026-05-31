import Image from "next/image";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "24px",
      position: "relative"
    }}>
      <div className="glow-bg"></div>
      
      <main className="glass-panel" style={{
        maxWidth: "600px",
        width: "100%",
        padding: "48px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "32px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glow)"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <h1 style={{ fontSize: "2.2rem", margin: 0 }}>GestorVentas</h1>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", lineHeight: "1.6" }}>
          Sistema avanzado de control y seguimiento de ventas. Gestiona expedientes, clientes, modelos y estados de vehículos de forma eficiente y segura.
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
          <button className="btn btn-primary" style={{ flex: 1, minWidth: "160px" }}>
            Ingresar al Sistema
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </button>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          paddingTop: "16px",
          borderTop: "1px solid var(--border-light)",
          width: "100%"
        }}>
          <span className="badge badge-admin">Admin</span>
          <span className="badge badge-director">Director</span>
          <span className="badge badge-zona">Zona</span>
          <span className="badge badge-tienda">Tienda</span>
          <span className="badge badge-vendedor">Vendedor</span>
        </div>
      </main>
    </div>
  );
}

