import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { usuarios, clientes, emailsClientes, telefonosClientes, expedientes, usuariosTiendas, estadoVehiculo } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // 1. Obtener los datos del body
    const body = await req.json();
    const { cliente: clienteData, expediente: expedienteData } = body;

    if (!expedienteData) {
      return NextResponse.json({ message: "Faltan datos del expediente" }, { status: 400 });
    }

    // 2. Obtener el id_usuario local a partir del clerk_id
    const localUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.clerk_id, userId),
    });

    if (!localUser) {
      return NextResponse.json({ message: "Usuario local no encontrado" }, { status: 404 });
    }

    // Bloquear si es Invitado
    if (localUser.rol === "invitado") {
      return NextResponse.json({ message: "Los invitados no tienen permiso para crear expedientes" }, { status: 403 });
    }

    // 3. Ejecutar secuencialmente para insertar cliente, emails, teléfonos si se proporciona cliente
    let clienteId: number | null = null;

    if (clienteData && clienteData.nombre) {
      // Verificar si el cliente ya existe por DNI (si se proporciona)
      let clienteExistente = null;
      if (clienteData.dni) {
        clienteExistente = await db.query.clientes.findFirst({
          where: eq(clientes.dni, clienteData.dni),
        });
      }

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        // Crear nuevo cliente
        const [nuevoCliente] = await db.insert(clientes).values({
          cliente_id: crypto.randomUUID(),
          dni: clienteData.dni || null,
          nombre: clienteData.nombre,
          fecha_de_nacimiento: clienteData.fecha_de_nacimiento || null,
          tienda_id: clienteData.tienda_id || null,
        }).returning();

        clienteId = nuevoCliente.id;

        // Insertar emails del cliente
        if (clienteData.emails && clienteData.emails.length > 0) {
          await db.insert(emailsClientes).values(
            clienteData.emails.map((e: any) => ({
              id_cliente: clienteId,
              email: e.email,
              tipo_email: e.tipo_email || "Principal",
            }))
          );
        }

        // Insertar teléfonos del cliente
        if (clienteData.telefonos && clienteData.telefonos.length > 0) {
          await db.insert(telefonosClientes).values(
            clienteData.telefonos.map((t: any) => ({
              id_cliente: clienteId,
              telefono: t.telefono,
              tipo_telefono: t.tipo_telefono || "Principal",
            }))
          );
        }
      }
    }

    // Determinar tienda
    let tiendaId = expedienteData.id_tienda;
    if (!tiendaId) {
      const userShops = await db.query.usuariosTiendas.findMany({
        where: eq(usuariosTiendas.id_usuario, localUser.id_usuario),
      });
      if (userShops.length === 1) {
        tiendaId = userShops[0].id_tienda;
      }
    }

    // Determinar fecha
    const fechaExp = expedienteData.fecha_expediente || new Date().toISOString().split('T')[0];

    // Determinar Estado del Vehículo
    let estadoVehiculoId = expedienteData.id_estado_vehiculo || null;
    if (!estadoVehiculoId) {
      if (expedienteData.estado_nombre === "usado") {
        const dbEstadoUsado = await db.query.estadoVehiculo.findFirst({
          where: ilike(estadoVehiculo.nombre_estado_vehiculo, "usado")
        });
        if (dbEstadoUsado) {
          estadoVehiculoId = dbEstadoUsado.id_estado_vehiculo;
        }
      } else {
        const defaultState = await db.query.estadoVehiculo.findFirst({
          where: eq(estadoVehiculo.predeterminado, true)
        });
        if (defaultState) {
          estadoVehiculoId = defaultState.id_estado_vehiculo;
        }
      }
    }

    // Crear el expediente
    const [nuevoExpediente] = await db.insert(expedientes).values({
      id_usuario: localUser.id_usuario,
      id_cliente: clienteId,
      id_modelo: expedienteData.id_modelo || null,
      id_tienda: tiendaId || null,
      fecha_expediente: fechaExp,
      fecha_afectacion: expedienteData.fecha_afectacion || null,
      fecha_matriculacion: expedienteData.fecha_matriculacion || null,
      fecha_entrega: expedienteData.fecha_entrega || null,
      matricula: expedienteData.matricula || null,
      vin: expedienteData.vin || null,
      id_tipo_de_venta: expedienteData.id_tipo_de_venta || null,
      id_estado_vehiculo: estadoVehiculoId,
    }).returning();

    return NextResponse.json({ success: true, data: nuevoExpediente }, { status: 201 });
  } catch (error: any) {
    console.error("Error al guardar expediente transaccional:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const localUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.clerk_id, userId),
    });

    if (!localUser || localUser.rol === "invitado") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { id_expediente, expediente: expedienteData, id_cliente } = body;

    if (!id_expediente || !expedienteData) {
      return NextResponse.json({ message: "Faltan datos obligatorios para actualizar" }, { status: 400 });
    }

    // Actualizar expediente
    await db.update(expedientes).set({
      id_modelo: expedienteData.id_modelo !== undefined ? expedienteData.id_modelo : undefined,
      id_tipo_de_venta: expedienteData.id_tipo_de_venta !== undefined ? expedienteData.id_tipo_de_venta : undefined,
      id_estado_vehiculo: expedienteData.id_estado_vehiculo !== undefined ? expedienteData.id_estado_vehiculo : undefined,
      id_tienda: expedienteData.id_tienda !== undefined ? expedienteData.id_tienda : undefined,
      fecha_expediente: expedienteData.fecha_expediente !== undefined ? expedienteData.fecha_expediente : undefined,
      fecha_afectacion: expedienteData.fecha_afectacion !== undefined ? expedienteData.fecha_afectacion : undefined,
      fecha_matriculacion: expedienteData.fecha_matriculacion !== undefined ? expedienteData.fecha_matriculacion : undefined,
      fecha_entrega: expedienteData.fecha_entrega !== undefined ? expedienteData.fecha_entrega : undefined,
      matricula: expedienteData.matricula !== undefined ? expedienteData.matricula : undefined,
      vin: expedienteData.vin !== undefined ? expedienteData.vin : undefined,
      id_cliente: id_cliente !== undefined ? id_cliente : undefined,
    }).where(eq(expedientes.id_expediente, id_expediente));

    return NextResponse.json({ success: true, message: "Expediente actualizado correctamente" }, { status: 200 });
  } catch (error: any) {
    console.error("Error al actualizar expediente:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const localUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.clerk_id, userId),
    });

    if (!localUser || localUser.rol === "invitado") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Falta el ID del expediente a eliminar" }, { status: 400 });
    }

    await db.delete(expedientes).where(eq(expedientes.id_expediente, Number(id)));

    return NextResponse.json({ success: true, message: "Expediente eliminado correctamente" }, { status: 200 });
  } catch (error: any) {
    console.error("Error al eliminar expediente:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
