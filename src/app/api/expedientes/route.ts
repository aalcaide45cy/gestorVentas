import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { usuarios, clientes, emailsClientes, telefonosClientes, expedientes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // 1. Obtener los datos del body
    const body = await req.json();
    const { cliente: clienteData, expediente: expedienteData } = body;

    if (!clienteData || !expedienteData) {
      return NextResponse.json({ message: "Faltan datos del cliente o del expediente" }, { status: 400 });
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

    // 3. Ejecutar transacción para insertar cliente, emails, teléfonos y el expediente
    const nuevoExpediente = await db.transaction(async (tx) => {
      // Verificar si el cliente ya existe por DNI
      let clienteId: number;
      const clienteExistente = await tx.query.clientes.findFirst({
        where: eq(clientes.dni, clienteData.dni),
      });

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        // Crear nuevo cliente
        const [nuevoCliente] = await tx.insert(clientes).values({
          cliente_id: crypto.randomUUID(),
          dni: clienteData.dni,
          nombre: clienteData.nombre,
          fecha_de_nacimiento: clienteData.fecha_de_nacimiento,
          tienda_id: clienteData.tienda_id,
        }).returning();

        clienteId = nuevoCliente.id;

        // Insertar emails del cliente
        if (clienteData.emails && clienteData.emails.length > 0) {
          await tx.insert(emailsClientes).values(
            clienteData.emails.map((e: any) => ({
              id_cliente: clienteId,
              email: e.email,
              tipo_email: e.tipo_email || "Principal",
            }))
          );
        }

        // Insertar teléfonos del cliente
        if (clienteData.telefonos && clienteData.telefonos.length > 0) {
          await tx.insert(telefonosClientes).values(
            clienteData.telefonos.map((t: any) => ({
              id_cliente: clienteId,
              telefono: t.telefono,
              tipo_telefono: t.tipo_telefono || "Principal",
            }))
          );
        }
      }

      // Crear el expediente
      const [expedienteCreado] = await tx.insert(expedientes).values({
        id_usuario: localUser.id_usuario,
        id_cliente: clienteId,
        id_modelo: expedienteData.id_modelo,
        fecha_expediente: expedienteData.fecha_expediente,
        fecha_afectacion: expedienteData.fecha_afectacion,
        fecha_matriculacion: expedienteData.fecha_matriculacion,
        fecha_entrega: expedienteData.fecha_entrega,
        matricula: expedienteData.matricula,
        id_tipo_de_venta: expedienteData.id_tipo_de_venta,
        id_estado_vehiculo: expedienteData.id_estado_vehiculo,
      }).returning();

      return expedienteCreado;
    });

    return NextResponse.json({ success: true, data: nuevoExpediente }, { status: 201 });
  } catch (error: any) {
    console.error("Error al guardar expediente transaccional:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
