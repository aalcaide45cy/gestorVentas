import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { usuarios, clientes, modelos, marcas, tipoDeVenta, estadoVehiculo, expedientes, usuariosTiendas, emailsClientes, telefonosClientes } from "@/db/schema";
import { eq, ilike, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
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

    // Resolver tienda del usuario
    let userTiendaId: number | null = null;
    const userShops = await db.query.usuariosTiendas.findMany({
      where: eq(usuariosTiendas.id_usuario, localUser.id_usuario),
    });
    if (userShops.length === 1) {
      userTiendaId = userShops[0].id_tienda;
    }

    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ message: "Formato de datos inválido" }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      // 1. Evitar duplicados (VIN o Matrícula)
      let duplicate = false;

      if (item.vin) {
        const existingVin = await db.query.expedientes.findFirst({
          where: eq(expedientes.vin, item.vin)
        });
        if (existingVin) duplicate = true;
      }

      if (!duplicate && item.matricula) {
        const existingMatricula = await db.query.expedientes.findFirst({
          where: eq(expedientes.matricula, item.matricula)
        });
        if (existingMatricula) duplicate = true;
      }

      if (duplicate) {
        skippedCount++;
        continue;
      }

      // 2. Resolver/Crear/Actualizar Cliente
      let idCliente: number | null = null;
      if (item.cliente_nombre) {
        let clienteExistente = null;
        if (item.cliente_dni) {
          clienteExistente = await db.query.clientes.findFirst({
            where: eq(clientes.dni, item.cliente_dni),
          });
        }
        if (!clienteExistente) {
          clienteExistente = await db.query.clientes.findFirst({
            where: ilike(clientes.nombre, item.cliente_nombre),
          });
        }

        if (clienteExistente) {
          idCliente = clienteExistente.id;
          const updateData: any = {};
          if (item.cliente_dni && clienteExistente.dni !== item.cliente_dni) {
            updateData.dni = item.cliente_dni;
          }
          if (item.cliente_fecha_nacimiento && clienteExistente.fecha_de_nacimiento !== item.cliente_fecha_nacimiento) {
            updateData.fecha_de_nacimiento = item.cliente_fecha_nacimiento;
          }
          if (Object.keys(updateData).length > 0) {
            await db.update(clientes).set(updateData).where(eq(clientes.id, idCliente));
          }
        } else {
          const [nuevoCliente] = await db.insert(clientes).values({
            cliente_id: crypto.randomUUID(),
            dni: item.cliente_dni || null,
            nombre: item.cliente_nombre,
            fecha_de_nacimiento: item.cliente_fecha_nacimiento || null,
          }).returning();
          idCliente = nuevoCliente.id;
        }

        // Re-sincronizar emails del cliente
        if (item.cliente_emails !== undefined && item.cliente_emails !== null) {
          await db.delete(emailsClientes).where(eq(emailsClientes.id_cliente, idCliente));
          if (item.cliente_emails.trim().length > 0) {
            const emailParts = item.cliente_emails.split("|");
            const emailValues = emailParts.map((p: string) => {
              const [email, tipo] = p.split(":");
              return {
                id_cliente: idCliente,
                email: email.trim(),
                tipo_email: tipo ? tipo.trim() : "Principal",
              };
            }).filter((e: any) => e.email.length > 0);

            if (emailValues.length > 0) {
              await db.insert(emailsClientes).values(emailValues);
            }
          }
        }

        // Re-sincronizar teléfonos del cliente
        if (item.cliente_telefonos !== undefined && item.cliente_telefonos !== null) {
          await db.delete(telefonosClientes).where(eq(telefonosClientes.id_cliente, idCliente));
          if (item.cliente_telefonos.trim().length > 0) {
            const telParts = item.cliente_telefonos.split("|");
            const telValues = telParts.map((p: string) => {
              const [telefono, tipo] = p.split(":");
              return {
                id_cliente: idCliente,
                telefono: telefono.trim(),
                tipo_telefono: tipo ? tipo.trim() : "Principal",
              };
            }).filter((t: any) => t.telefono.length > 0);

            if (telValues.length > 0) {
              await db.insert(telefonosClientes).values(telValues);
            }
          }
        }
      }

      // 3. Resolver/Crear/Actualizar Modelo y Marca
      let idModelo: number | null = null;
      if (item.modelo_nombre) {
        let idMarca: number | null = null;
        if (item.marca_nombre) {
          const marcaExistente = await db.query.marcas.findFirst({
            where: ilike(marcas.nombre, item.marca_nombre),
          });
          const mActiva = item.marca_activo === null || item.marca_activo === "" ? true : item.marca_activo === "true";
          const mAccRapido = item.marca_acceso_rapido === "true";
          const mSistCom = item.marca_sistema_comisiones === "true";

          if (marcaExistente) {
            idMarca = marcaExistente.id_marca;
            await db.update(marcas).set({
              activo: mActiva,
              acceso_rapido: mAccRapido,
              sistema_comisiones: mSistCom,
            }).where(eq(marcas.id_marca, idMarca));
          } else {
            const [nuevaMarca] = await db.insert(marcas).values({
              nombre: item.marca_nombre,
              activo: mActiva,
              acceso_rapido: mAccRapido,
              sistema_comisiones: mSistCom,
            }).returning();
            idMarca = nuevaMarca.id_marca;
          }
        }

        let modeloExistente = null;
        if (idMarca) {
          modeloExistente = await db.query.modelos.findFirst({
            where: and(
              ilike(modelos.nombre_modelo, item.modelo_nombre),
              eq(modelos.marca_id, idMarca)
            ),
          });
        } else {
          modeloExistente = await db.query.modelos.findFirst({
            where: ilike(modelos.nombre_modelo, item.modelo_nombre),
          });
        }

        const modAccRapido = item.modelo_acceso_rapido === "true";
        const modOrden = item.modelo_orden_acceso_rapido ? parseInt(item.modelo_orden_acceso_rapido, 10) : 0;

        if (modeloExistente) {
          idModelo = modeloExistente.id_modelo;
          await db.update(modelos).set({
            acceso_rapido: modAccRapido,
            orden_acceso_rapido: isNaN(modOrden) ? 0 : modOrden,
            ...(idMarca ? { marca_id: idMarca } : {})
          }).where(eq(modelos.id_modelo, idModelo));
        } else if (idMarca) {
          const [nuevoModelo] = await db.insert(modelos).values({
            marca_id: idMarca,
            nombre_modelo: item.modelo_nombre,
            acceso_rapido: modAccRapido,
            orden_acceso_rapido: isNaN(modOrden) ? 0 : modOrden,
          }).returning();
          idModelo = nuevoModelo.id_modelo;
        }
      }

      // 4. Resolver/Crear/Actualizar Tipo de Venta
      let idTipoDeVenta: number | null = null;
      if (item.tipo_venta_nombre) {
        const tipoVentaExistente = await db.query.tipoDeVenta.findFirst({
          where: ilike(tipoDeVenta.nombre_tipo_venta, item.tipo_venta_nombre),
        });
        const colorVenta = item.tipo_venta_color || "#3b82f6";
        if (tipoVentaExistente) {
          idTipoDeVenta = tipoVentaExistente.id_tipo_de_venta;
          await db.update(tipoDeVenta).set({
            color: colorVenta,
          }).where(eq(tipoDeVenta.id_tipo_de_venta, idTipoDeVenta));
        } else {
          const [nuevoTipo] = await db.insert(tipoDeVenta).values({
            nombre_tipo_venta: item.tipo_venta_nombre,
            color: colorVenta,
          }).returning();
          idTipoDeVenta = nuevoTipo.id_tipo_de_venta;
        }
      }

      // 5. Resolver/Crear/Actualizar Estado Vehículo
      let idEstadoVehiculo: number | null = null;
      if (item.estado_vehiculo_nombre) {
        const estadoVehiculoExistente = await db.query.estadoVehiculo.findFirst({
          where: ilike(estadoVehiculo.nombre_estado_vehiculo, item.estado_vehiculo_nombre),
        });
        const esPredeterminado = item.estado_vehiculo_predeterminado === "true";
        if (estadoVehiculoExistente) {
          idEstadoVehiculo = estadoVehiculoExistente.id_estado_vehiculo;
          await db.update(estadoVehiculo).set({
            predeterminado: esPredeterminado,
          }).where(eq(estadoVehiculo.id_estado_vehiculo, idEstadoVehiculo));
        } else {
          const [nuevoEstado] = await db.insert(estadoVehiculo).values({
            nombre_estado_vehiculo: item.estado_vehiculo_nombre,
            predeterminado: esPredeterminado,
          }).returning();
          idEstadoVehiculo = nuevoEstado.id_estado_vehiculo;
        }
      }

      // 6. Insertar Expediente
      await db.insert(expedientes).values({
        id_usuario: localUser.id_usuario,
        id_cliente: idCliente,
        id_modelo: idModelo,
        id_tienda: userTiendaId,
        fecha_expediente: item.fecha_expediente || new Date().toISOString().split('T')[0],
        fecha_afectacion: item.fecha_afectacion || null,
        fecha_matriculacion: item.fecha_matriculacion || null,
        fecha_entrega: item.fecha_entrega || null,
        fecha_rci: item.fecha_rci || null,
        matricula: item.matricula || null,
        vin: item.vin || null,
        id_tipo_de_venta: idTipoDeVenta,
        id_estado_vehiculo: idEstadoVehiculo,
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      message: `Importación completada: ${importedCount} importados, ${skippedCount} duplicados omitidos.`
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error al importar expedientes:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
