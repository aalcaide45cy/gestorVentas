import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { usuarios, marcas, modelos, tipoDeVenta, estadoVehiculo } from "@/db/schema";
import { eq } from "drizzle-orm";

// Middleware manual de validación de Admin
async function checkAdmin() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.query.usuarios.findFirst({
    where: eq(usuarios.clerk_id, userId),
  });

  return user && user.rol === "administrador" ? user : null;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { tipo, ...data } = body;

    if (!tipo) {
      return NextResponse.json({ message: "Falta especificar el tipo de catálogo" }, { status: 400 });
    }

    if (tipo === "marca") {
      if (!data.nombre) return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 });
      const [nueva] = await db.insert(marcas).values({
        nombre: data.nombre,
        activo: true,
        acceso_rapido: !!data.acceso_rapido,
        sistema_comisiones: !!data.sistema_comisiones
      }).returning();
      return NextResponse.json({ success: true, data: nueva }, { status: 201 });
    }

    if (tipo === "modelo") {
      if (!data.marca_id || !data.nombre_modelo) {
        return NextResponse.json({ message: "Falta marca_id o nombre_modelo" }, { status: 400 });
      }
      const [nuevo] = await db.insert(modelos).values({
        marca_id: Number(data.marca_id),
        nombre_modelo: data.nombre_modelo,
        acceso_rapido: !!data.acceso_rapido
      }).returning();
      return NextResponse.json({ success: true, data: nuevo }, { status: 201 });
    }

    if (tipo === "tipo_venta") {
      if (!data.nombre_tipo_venta) return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 });
      const [nuevo] = await db.insert(tipoDeVenta).values({
        nombre_tipo_venta: data.nombre_tipo_venta,
        color: data.color || '#3b82f6'
      }).returning();
      return NextResponse.json({ success: true, data: nuevo }, { status: 201 });
    }

    if (tipo === "estado_vehiculo") {
      if (!data.nombre_estado_vehiculo) return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 });
      if (data.predeterminado) {
        await db.update(estadoVehiculo).set({ predeterminado: false });
      }
      const [nuevo] = await db.insert(estadoVehiculo).values({
        nombre_estado_vehiculo: data.nombre_estado_vehiculo,
        predeterminado: !!data.predeterminado
      }).returning();
      return NextResponse.json({ success: true, data: nuevo }, { status: 201 });
    }

    return NextResponse.json({ message: "Tipo de catálogo no soportado" }, { status: 400 });
  } catch (error: any) {
    console.error("Error al crear catálogo:", error);
    return NextResponse.json({ message: error.message || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { tipo, id } = body;

    if (!tipo || !id) {
      return NextResponse.json({ message: "Faltan datos requeridos (tipo, id)" }, { status: 400 });
    }

    if (tipo === "marca") {
      // Como sugerimos en el plan, permitiremos opcionalmente desactivar o activar marcas
      const { toggleActivo, activo } = body;
      if (toggleActivo) {
        await db.update(marcas)
          .set({ activo: !!activo })
          .where(eq(marcas.id_marca, Number(id)));
        return NextResponse.json({ success: true, message: `Estado de la marca actualizado` });
      } else {
        // Borrar físicamente
        await db.delete(marcas).where(eq(marcas.id_marca, Number(id)));
        return NextResponse.json({ success: true, message: "Marca eliminada" });
      }
    }

    if (tipo === "modelo") {
      await db.delete(modelos).where(eq(modelos.id_modelo, Number(id)));
      return NextResponse.json({ success: true, message: "Modelo eliminado" });
    }

    if (tipo === "tipo_venta") {
      await db.delete(tipoDeVenta).where(eq(tipoDeVenta.id_tipo_de_venta, Number(id)));
      return NextResponse.json({ success: true, message: "Tipo de venta eliminado" });
    }

    if (tipo === "estado_vehiculo") {
      await db.delete(estadoVehiculo).where(eq(estadoVehiculo.id_estado_vehiculo, Number(id)));
      return NextResponse.json({ success: true, message: "Estado de vehículo eliminado" });
    }

    return NextResponse.json({ message: "Tipo de catálogo no soportado" }, { status: 400 });
  } catch (error: any) {
    console.error("Error al eliminar catálogo:", error);
    return NextResponse.json({ message: error.message || "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { tipo, id, ...data } = body;

    if (!tipo || !id) {
      return NextResponse.json({ message: "Faltan datos requeridos (tipo, id)" }, { status: 400 });
    }

    if (tipo === "marca") {
      if (!data.nombre) return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 });
      const [actualizada] = await db.update(marcas)
        .set({ 
          nombre: data.nombre,
          acceso_rapido: data.acceso_rapido !== undefined ? !!data.acceso_rapido : undefined,
          sistema_comisiones: data.sistema_comisiones !== undefined ? !!data.sistema_comisiones : undefined
        })
        .where(eq(marcas.id_marca, Number(id)))
        .returning();
      return NextResponse.json({ success: true, data: actualizada });
    }

    if (tipo === "modelo") {
      if (!data.nombre_modelo) return NextResponse.json({ message: "El nombre_modelo es requerido" }, { status: 400 });
      const [actualizada] = await db.update(modelos)
        .set({ 
          nombre_modelo: data.nombre_modelo,
          acceso_rapido: data.acceso_rapido !== undefined ? !!data.acceso_rapido : undefined,
          orden_acceso_rapido: data.orden_acceso_rapido !== undefined ? Number(data.orden_acceso_rapido) : undefined
        })
        .where(eq(modelos.id_modelo, Number(id)))
        .returning();
      return NextResponse.json({ success: true, data: actualizada });
    }

    if (tipo === "tipo_venta") {
      if (!data.nombre_tipo_venta) return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 });
      const [actualizado] = await db.update(tipoDeVenta)
        .set({ 
          nombre_tipo_venta: data.nombre_tipo_venta,
          color: data.color !== undefined ? data.color : undefined
        })
        .where(eq(tipoDeVenta.id_tipo_de_venta, Number(id)))
        .returning();
      return NextResponse.json({ success: true, data: actualizado });
    }

    if (tipo === "estado_vehiculo") {
      if (!data.nombre_estado_vehiculo) return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 });
      if (data.predeterminado) {
        await db.update(estadoVehiculo).set({ predeterminado: false });
      }
      const [actualizado] = await db.update(estadoVehiculo)
        .set({ 
          nombre_estado_vehiculo: data.nombre_estado_vehiculo,
          predeterminado: data.predeterminado !== undefined ? !!data.predeterminado : undefined
        })
        .where(eq(estadoVehiculo.id_estado_vehiculo, Number(id)))
        .returning();
      return NextResponse.json({ success: true, data: actualizado });
    }

    return NextResponse.json({ message: "Tipo de catálogo no soportado" }, { status: 400 });
  } catch (error: any) {
    console.error("Error al actualizar catálogo:", error);
    return NextResponse.json({ message: error.message || "Error interno" }, { status: 500 });
  }
}
