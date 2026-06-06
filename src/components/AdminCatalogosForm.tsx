"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MarcaItem {
  id_marca: number;
  nombre: string;
  activo: boolean | null;
  acceso_rapido?: boolean | null;
  sistema_comisiones?: boolean | null;
  modelos: {
    id_modelo: number;
    nombre_modelo: string;
    acceso_rapido?: boolean | null;
  }[];
}

interface DropdownItem {
  id: number;
  nombre: string;
  color?: string | null;
  predeterminado?: boolean | null;
}

interface TiendaItem {
  id_tienda: number;
  nombre: string;
  ciudad: string | null;
}

interface AdminCatalogosFormProps {
  marcasIniciales: MarcaItem[];
  tiposVentaIniciales: DropdownItem[];
  estadosVehiculoIniciales: DropdownItem[];
  tiendasIniciales: TiendaItem[];
}

type TabType = "marcas" | "modelos" | "tiendas" | "pagos" | "estados";

export default function AdminCatalogosForm({
  marcasIniciales,
  tiposVentaIniciales,
  estadosVehiculoIniciales,
  tiendasIniciales
}: AdminCatalogosFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("marcas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Datos locales
  const [marcas, setMarcas] = useState<MarcaItem[]>(marcasIniciales);
  const [tiposVenta, setTiposVenta] = useState<DropdownItem[]>(tiposVentaIniciales);
  const [estadosVehiculo, setEstadosVehiculo] = useState<DropdownItem[]>(estadosVehiculoIniciales);
  const [tiendas, setTiendas] = useState<TiendaItem[]>(tiendasIniciales);

  // Estados de ordenación
  const [sortField, setSortField] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
    setSortField("id");
    setSortOrder("asc");
  };

  // Listados ordenados
  const sortedMarcas = [...marcas].sort((a, b) => {
    let aVal: any = a.id_marca;
    let bVal: any = b.id_marca;
    if (sortField === "nombre") {
      aVal = a.nombre;
      bVal = b.nombre;
    } else if (sortField === "activo") {
      aVal = a.activo ? 1 : 0;
      bVal = b.activo ? 1 : 0;
    } else if (sortField === "acceso_rapido") {
      aVal = a.acceso_rapido ? 1 : 0;
      bVal = b.acceso_rapido ? 1 : 0;
    } else if (sortField === "sistema_comisiones") {
      aVal = a.sistema_comisiones ? 1 : 0;
      bVal = b.sistema_comisiones ? 1 : 0;
    } else if (sortField === "modelos") {
      aVal = a.modelos.length;
      bVal = b.modelos.length;
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const flatModelos = marcas.flatMap(m => 
    m.modelos.map(mod => ({
      id_modelo: mod.id_modelo,
      nombre_modelo: mod.nombre_modelo,
      acceso_rapido: mod.acceso_rapido,
      id_marca: m.id_marca,
      nombre_marca: m.nombre
    }))
  );

  const sortedModelos = [...flatModelos].sort((a, b) => {
    let aVal: any = a.id_modelo;
    let bVal: any = b.id_modelo;
    if (sortField === "nombre") {
      aVal = a.nombre_modelo;
      bVal = b.nombre_modelo;
    } else if (sortField === "marca") {
      aVal = a.nombre_marca;
      bVal = b.nombre_marca;
    } else if (sortField === "acceso_rapido") {
      aVal = a.acceso_rapido ? 1 : 0;
      bVal = b.acceso_rapido ? 1 : 0;
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const sortedTiendas = [...tiendas].sort((a, b) => {
    let aVal: any = a.id_tienda;
    let bVal: any = b.id_tienda;
    if (sortField === "nombre") {
      aVal = a.nombre;
      bVal = b.nombre;
    } else if (sortField === "ciudad") {
      aVal = a.ciudad || "";
      bVal = b.ciudad || "";
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const sortedTiposVenta = [...tiposVenta].sort((a, b) => {
    let aVal: any = a.id;
    let bVal: any = b.id;
    if (sortField === "nombre") {
      aVal = a.nombre;
      bVal = b.nombre;
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const sortedEstadosVehiculo = [...estadosVehiculo].sort((a, b) => {
    let aVal: any = a.id;
    let bVal: any = b.id;
    if (sortField === "nombre") {
      aVal = a.nombre;
      bVal = b.nombre;
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Estados de formularios
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [nuevaMarcaAccesoRapido, setNuevaMarcaAccesoRapido] = useState(false);
  const [nuevaMarcaSistemaComisiones, setNuevaMarcaSistemaComisiones] = useState(false);
  const [nuevoModeloMarcaId, setNuevoModeloMarcaId] = useState<number | "">("");
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState("");
  const [nuevoModeloAccesoRapido, setNuevoModeloAccesoRapido] = useState(false);
  const [nuevoTipoVentaNombre, setNuevoTipoVentaNombre] = useState("");
  const [nuevoTipoVentaColor, setNuevoTipoVentaColor] = useState("#3b82f6");
  const [nuevoEstadoVehiculoNombre, setNuevoEstadoVehiculoNombre] = useState("");
  const [nuevoEstadoVehiculoPredeterminado, setNuevoEstadoVehiculoPredeterminado] = useState(false);
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState("");
  const [nuevaTiendaCiudad, setNuevaTiendaCiudad] = useState("");

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(text);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  // Estados para edición
  const [editingType, setEditingType] = useState<TabType | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [editingExtra, setEditingExtra] = useState(""); // para ciudad en tiendas
  const [editingColor, setEditingColor] = useState(""); // para color en tipos de pago
  const [editingPredeterminado, setEditingPredeterminado] = useState(false); // para predeterminado en estados

  const iniciarEdicion = (tipo: TabType, id: number, nombre: string, extra = "", color = "", predeterminado = false) => {
    setEditingType(tipo);
    setEditingId(id);
    setEditingNombre(nombre);
    setEditingExtra(extra);
    setEditingColor(color);
    setEditingPredeterminado(predeterminado);
  };

  const cancelarEdicion = () => {
    setEditingType(null);
    setEditingId(null);
    setEditingNombre("");
    setEditingExtra("");
    setEditingColor("");
    setEditingPredeterminado(false);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNombre.trim() || !editingId || !editingType) return;
    setLoading(true);

    try {
      if (editingType === "tiendas") {
        const res = await fetch("/api/admin/tiendas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_tienda: editingId, nombre: editingNombre, ciudad: editingExtra })
        });
        if (!res.ok) throw new Error("Error al actualizar la tienda");
        const result = await res.json();
        setTiendas(tiendas.map(t => t.id_tienda === editingId ? { ...t, nombre: result.data.nombre, ciudad: result.data.ciudad } : t));
        showNotification("Tienda actualizada correctamente", "success");
      } else {
        let payloadType = editingType as string;
        if (editingType === "pagos") {
          payloadType = "tipo_venta";
        } else if (editingType === "estados") {
          payloadType = "estado_vehiculo";
        } else if (editingType === "marcas") {
          payloadType = "marca";
        } else if (editingType === "modelos") {
          payloadType = "modelo";
        }

        const res = await fetch("/api/admin/catalogos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: payloadType,
            id: editingId,
            nombre: editingNombre,
            nombre_modelo: editingNombre,
            nombre_tipo_venta: editingNombre,
            nombre_estado_vehiculo: editingNombre,
            color: editingColor,
            predeterminado: editingPredeterminado
          })
        });

        if (!res.ok) throw new Error("Error al actualizar catálogo");
        const result = await res.json();

        if (payloadType === "marca") {
          setMarcas(marcas.map(m => m.id_marca === editingId ? { ...m, nombre: result.data.nombre } : m));
        } else if (payloadType === "modelo") {
          setMarcas(marcas.map(m => ({
            ...m,
            modelos: m.modelos.map(mod => mod.id_modelo === editingId ? { ...mod, nombre_modelo: result.data.nombre_modelo } : mod)
          })));
        } else if (payloadType === "tipo_venta") {
          setTiposVenta(tiposVenta.map(tv => tv.id === editingId ? { ...tv, nombre: result.data.nombre_tipo_venta, color: result.data.color } : tv));
        } else if (payloadType === "estado_vehiculo") {
          if (result.data.predeterminado) {
            setEstadosVehiculo(estadosVehiculo.map(ev => ev.id === editingId ? { ...ev, nombre: result.data.nombre_estado_vehiculo, predeterminado: true } : { ...ev, predeterminado: false }));
          } else {
            setEstadosVehiculo(estadosVehiculo.map(ev => ev.id === editingId ? { ...ev, nombre: result.data.nombre_estado_vehiculo, predeterminado: false } : ev));
          }
        }

        showNotification("Elemento actualizado correctamente", "success");
      }
      cancelarEdicion();
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const handleToggleMarcaSistemaComisiones = async (idMarca: number, estadoActual: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", id: idMarca, sistema_comisiones: !estadoActual, nombre: marcas.find(m => m.id_marca === idMarca)?.nombre })
      });
      if (!res.ok) throw new Error("Error al cambiar sistema de comisiones de la marca");
      const result = await res.json();
      setMarcas(marcas.map(m => m.id_marca === idMarca ? { ...m, sistema_comisiones: result.data.sistema_comisiones } : m));
      showNotification("Sistema de comisiones de la marca actualizado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMarcaAccesoRapido = async (idMarca: number, estadoActual: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", id: idMarca, acceso_rapido: !estadoActual, nombre: marcas.find(m => m.id_marca === idMarca)?.nombre })
      });
      if (!res.ok) throw new Error("Error al cambiar acceso rápido de la marca");
      const result = await res.json();
      setMarcas(marcas.map(m => m.id_marca === idMarca ? { ...m, acceso_rapido: result.data.acceso_rapido } : m));
      showNotification("Acceso rápido de la marca actualizado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModeloAccesoRapido = async (idModelo: number, estadoActual: boolean) => {
    setLoading(true);
    try {
      const modelItem = flatModelos.find(m => m.id_modelo === idModelo);
      const res = await fetch("/api/admin/catalogos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "modelo", id: idModelo, acceso_rapido: !estadoActual, nombre_modelo: modelItem?.nombre_modelo })
      });
      if (!res.ok) throw new Error("Error al cambiar acceso rápido del modelo");
      const result = await res.json();
      setMarcas(marcas.map(m => ({
        ...m,
        modelos: m.modelos.map(mod => mod.id_modelo === idModelo ? { ...mod, acceso_rapido: result.data.acceso_rapido } : mod)
      })));
      showNotification("Acceso rápido del modelo actualizado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEstadoPredeterminado = async (idEstado: number, estadoActual: boolean) => {
    if (estadoActual) return; // Ya es predeterminado
    setLoading(true);
    try {
      const stateItem = estadosVehiculo.find(ev => ev.id === idEstado);
      const res = await fetch("/api/admin/catalogos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tipo: "estado_vehiculo", 
          id: idEstado, 
          predeterminado: true, 
          nombre_estado_vehiculo: stateItem?.nombre 
        })
      });
      if (!res.ok) throw new Error("Error al cambiar el estado predeterminado");
      setEstadosVehiculo(estadosVehiculo.map(ev => ev.id === idEstado ? { ...ev, predeterminado: true } : { ...ev, predeterminado: false }));
      showNotification("Estado predeterminado actualizado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES DE CREACIÓN ---

  const handleCrearMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMarcaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", nombre: nuevaMarcaNombre, acceso_rapido: nuevaMarcaAccesoRapido, sistema_comisiones: nuevaMarcaSistemaComisiones })
      });

      if (!res.ok) throw new Error("Error al crear la marca");
      const result = await res.json();
      
      setMarcas([...marcas, { ...result.data, modelos: [] }]);
      setNuevaMarcaNombre("");
      setNuevaMarcaAccesoRapido(false);
      setNuevaMarcaSistemaComisiones(false);
      showNotification("Marca creada correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoModeloMarcaId || !nuevoModeloNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "modelo",
          marca_id: nuevoModeloMarcaId,
          nombre_modelo: nuevoModeloNombre,
          acceso_rapido: nuevoModeloAccesoRapido
        })
      });

      if (!res.ok) throw new Error("Error al crear el modelo");
      const result = await res.json();

      setMarcas(marcas.map(m => {
        if (m.id_marca === Number(nuevoModeloMarcaId)) {
          return {
            ...m,
            modelos: [...m.modelos, { id_modelo: result.data.id_modelo, nombre_modelo: result.data.nombre_modelo, acceso_rapido: result.data.acceso_rapido }]
          };
        }
        return m;
      }));
      setNuevoModeloNombre("");
      setNuevoModeloAccesoRapido(false);
      showNotification("Modelo creado correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaTiendaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/tiendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaTiendaNombre, ciudad: nuevaTiendaCiudad })
      });

      if (!res.ok) throw new Error("Error al crear tienda");
      const result = await res.json();

      setTiendas([...tiendas, {
        id_tienda: result.data.id_tienda,
        nombre: result.data.nombre,
        ciudad: result.data.ciudad
      }]);
      setNuevaTiendaNombre("");
      setNuevaTiendaCiudad("");
      showNotification("Tienda creada correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTipoVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTipoVentaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tipo: "tipo_venta", 
          nombre_tipo_venta: nuevoTipoVentaNombre,
          color: nuevoTipoVentaColor
        })
      });

      if (!res.ok) throw new Error("Error al crear tipo de venta");
      const result = await res.json();

      setTiposVenta([...tiposVenta, { 
        id: result.data.id_tipo_de_venta, 
        nombre: result.data.nombre_tipo_venta,
        color: result.data.color
      }]);
      setNuevoTipoVentaNombre("");
      setNuevoTipoVentaColor("#3b82f6");
      showNotification("Tipo de venta creado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearEstadoVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEstadoVehiculoNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tipo: "estado_vehiculo", 
          nombre_estado_vehiculo: nuevoEstadoVehiculoNombre,
          predeterminado: nuevoEstadoVehiculoPredeterminado
        })
      });

      if (!res.ok) throw new Error("Error al crear estado");
      const result = await res.json();

      const nuevoEstadoItem = { 
        id: result.data.id_estado_vehiculo, 
        nombre: result.data.nombre_estado_vehiculo,
        predeterminado: result.data.predeterminado
      };

      if (result.data.predeterminado) {
        setEstadosVehiculo([...estadosVehiculo.map(ev => ({ ...ev, predeterminado: false })), nuevoEstadoItem]);
      } else {
        setEstadosVehiculo([...estadosVehiculo, nuevoEstadoItem]);
      }

      setNuevoEstadoVehiculoNombre("");
      setNuevoEstadoVehiculoPredeterminado(false);
      showNotification("Estado de vehículo creado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES DE ELIMINACIÓN ---

  const handleToggleMarcaActiva = async (idMarca: number, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", id: idMarca, toggleActivo: true, activo: nuevoEstado })
      });

      if (!res.ok) throw new Error("Error al cambiar estado de la marca");

      setMarcas(marcas.map(m => m.id_marca === idMarca ? { ...m, activo: nuevoEstado } : m));
      showNotification(`Marca ${nuevoEstado ? "activada" : "desactivada"}`, "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarMarcaFisicamente = async (idMarca: number, nombreMarca: string) => {
    if (!confirm(`¿Seguro que deseas eliminar definitivamente la marca "${nombreMarca}"? Se eliminarán todos sus modelos asociados.`)) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", id: idMarca })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar la marca porque tiene modelos referenciados en expedientes activos.");
      }
      if (!res.ok) throw new Error("Error al eliminar la marca");

      setMarcas(marcas.filter(m => m.id_marca !== idMarca));
      showNotification("Marca eliminada con éxito", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarModelo = async (idModelo: number, idMarca: number) => {
    if (!confirm("¿Seguro que deseas eliminar este modelo? Se borrará del catálogo.")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "modelo", id: idModelo })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar este modelo porque está asociado a expedientes de venta activos.");
      }
      if (!res.ok) throw new Error("Error al eliminar modelo");

      setMarcas(marcas.map(m => {
        if (m.id_marca === idMarca) {
          return { ...m, modelos: m.modelos.filter(mod => mod.id_modelo !== idModelo) };
        }
        return m;
      }));
      showNotification("Modelo eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarTienda = async (idTienda: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta tienda física?")) return;

    try {
      const res = await fetch("/api/admin/tiendas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tienda: idTienda })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al eliminar tienda");

      setTiendas(tiendas.filter(t => t.id_tienda !== idTienda));
      showNotification("Tienda eliminada con éxito", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarTipoVenta = async (idTipo: number) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de venta?")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "tipo_venta", id: idTipo })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar porque tiene expedientes de venta registrados.");
      }
      if (!res.ok) throw new Error("Error al eliminar");

      setTiposVenta(tiposVenta.filter(t => t.id !== idTipo));
      showNotification("Tipo de venta eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarEstadoVehiculo = async (idEstado: number) => {
    if (!confirm("¿Seguro que deseas eliminar este estado de vehículo?")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "estado_vehiculo", id: idEstado })
      });

      if (res.status === 409) {
        throw new Error("No se puede eliminar porque tiene expedientes de venta registrados.");
      }
      if (!res.ok) throw new Error("Error al eliminar");

      setEstadosVehiculo(estadosVehiculo.filter(ev => ev.id !== idEstado));
      showNotification("Estado de vehículo eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* NOTIFICACIONES FLOTANTES */}
      {(error || success) && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "90%",
          maxWidth: "450px",
          animation: "fadeIn 0.3s ease"
        }}>
          {error && (
            <div className="glass-panel" style={{
              padding: "16px 20px",
              color: "var(--danger)",
              borderLeft: "4px solid var(--danger)",
              background: "rgba(239, 68, 68, 0.1)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
            }}>
              <span>⚠️ {error}</span>
            </div>
          )}
          {success && (
            <div className="glass-panel" style={{
              padding: "16px 20px",
              color: "var(--success)",
              borderLeft: "4px solid var(--success)",
              background: "rgba(16, 185, 129, 0.1)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
            }}>
              <span>✓ {success}</span>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑAS (TABS) */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn ${activeTab === "marcas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => changeTab("marcas")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🏷️ Marcas
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "modelos" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => changeTab("modelos")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🚙 Modelos
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "tiendas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => changeTab("tiendas")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🏢 Tiendas
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "pagos" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => changeTab("pagos")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          💰 Pagos
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "estados" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => changeTab("estados")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🚗 Estados
        </button>
      </div>

      {/* PESTAÑA: MARCAS */}
      {activeTab === "marcas" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Gestión de Marcas</h3>
          
          <form onSubmit={handleCrearMarca} style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de nueva marca... (Ej. Nissan)"
              value={nuevaMarcaNombre}
              onChange={e => setNuevaMarcaNombre(e.target.value)}
              disabled={loading}
              required
              style={{ flex: 1 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="chkMarcaAccesoRapido"
                checked={nuevaMarcaAccesoRapido}
                onChange={e => setNuevaMarcaAccesoRapido(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="chkMarcaAccesoRapido" style={{ cursor: "pointer", fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Acceso Rápido
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="chkMarcaSistemaComisiones"
                checked={nuevaMarcaSistemaComisiones}
                onChange={e => setNuevaMarcaSistemaComisiones(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="chkMarcaSistemaComisiones" style={{ cursor: "pointer", fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Sist. Comisiones
              </label>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: "12px 20px" }} disabled={loading}>
              + Crear Marca
            </button>
          </form>

          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>

                  <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Nombre Marca{sortField === "nombre" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th onClick={() => handleSort("activo")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Estado{sortField === "activo" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th onClick={() => handleSort("acceso_rapido")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Acceso Rápido{sortField === "acceso_rapido" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th onClick={() => handleSort("sistema_comisiones")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Sist. Comisiones{sortField === "sistema_comisiones" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th onClick={() => handleSort("modelos")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Modelos Asoc.{sortField === "modelos" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedMarcas.map(m => {
                  const isEditing = editingType === "marcas" && editingId === m.id_marca;
                  return (
                    <tr key={m.id_marca}>
                      <td>
                        {isEditing ? (
                          <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingNombre}
                              onChange={e => setEditingNombre(e.target.value)}
                              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                              required
                              autoFocus
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: "6px 10px" }} disabled={loading}>✓</button>
                            <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "6px 10px" }}>✗</button>
                          </form>
                        ) : (
                          <span style={{ fontWeight: 600, color: m.activo ? "var(--text-primary)" : "var(--text-muted)" }}>
                            {m.nombre}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${m.activo ? "badge-tienda" : "badge-admin"}`} style={{ fontSize: "0.75rem" }}>
                          {m.activo ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`badge ${m.acceso_rapido ? "badge-tienda" : "badge-admin"}`}
                          onClick={() => handleToggleMarcaAccesoRapido(m.id_marca, !!m.acceso_rapido)}
                          disabled={loading}
                          style={{ border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                          title="Alternar Acceso Rápido"
                        >
                          {m.acceso_rapido ? "⭐ Sí" : "✖ No"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`badge ${m.sistema_comisiones ? "badge-tienda" : "badge-admin"}`}
                          onClick={() => handleToggleMarcaSistemaComisiones(m.id_marca, !!m.sistema_comisiones)}
                          disabled={loading}
                          style={{ border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                          title="Alternar en Sistema de Comisiones"
                        >
                          {m.sistema_comisiones ? "✓ Activo" : "✖ Inactivo"}
                        </button>
                      </td>
                      <td>{m.modelos.length} modelo(s)</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => iniciarEdicion("marcas", m.id_marca, m.nombre)}
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleToggleMarcaActiva(m.id_marca, !!m.activo)}
                            style={{ padding: "6px 10px", fontSize: "0.8rem", color: m.activo ? "var(--warning)" : "var(--success)" }}
                          >
                            {m.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleEliminarMarcaFisicamente(m.id_marca, m.nombre)}
                            style={{ padding: "6px 10px", color: "var(--danger)", border: "1px solid var(--border-light)" }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: MODELOS */}
      {activeTab === "modelos" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Gestión de Modelos</h3>

          <form onSubmit={handleCrearModelo} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="form-select"
              value={nuevoModeloMarcaId}
              onChange={e => setNuevoModeloMarcaId(e.target.value ? Number(e.target.value) : "")}
              required
              style={{ flex: 1, minWidth: "160px" }}
            >
              <option value="">Selecciona Marca</option>
              {marcas.filter(m => m.activo).map(m => (
                <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
              ))}
            </select>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de modelo... (Ej. Qashqai)"
              value={nuevoModeloNombre}
              onChange={e => setNuevoModeloNombre(e.target.value)}
              disabled={loading || !nuevoModeloMarcaId}
              required
              style={{ flex: 2, minWidth: "200px" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="chkModeloAccesoRapido"
                checked={nuevoModeloAccesoRapido}
                onChange={e => setNuevoModeloAccesoRapido(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="chkModeloAccesoRapido" style={{ cursor: "pointer", fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Acceso Rápido
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !nuevoModeloMarcaId}>
              + Crear Modelo
            </button>
          </form>

          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th onClick={() => handleSort("marca")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Marca{sortField === "marca" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Nombre Modelo{sortField === "nombre" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th onClick={() => handleSort("acceso_rapido")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Acceso Rápido{sortField === "acceso_rapido" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedModelos.map(mod => {
                  const isEditing = editingType === "modelos" && editingId === mod.id_modelo;
                  return (
                    <tr key={mod.id_modelo}>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase" }}>
                          {mod.nombre_marca}
                        </span>
                      </td>
                      <td>
                        {isEditing ? (
                          <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingNombre}
                              onChange={e => setEditingNombre(e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                              required
                              autoFocus
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px" }} disabled={loading}>✓</button>
                            <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "4px 8px" }}>✗</button>
                          </form>
                        ) : (
                          <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>{mod.nombre_modelo}</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`badge ${mod.acceso_rapido ? "badge-tienda" : "badge-admin"}`}
                          onClick={() => handleToggleModeloAccesoRapido(mod.id_modelo, !!mod.acceso_rapido)}
                          disabled={loading}
                          style={{ border: "none", cursor: "pointer", fontSize: "0.75rem" }}
                          title="Alternar Acceso Rápido"
                        >
                          {mod.acceso_rapido ? "⭐ Sí" : "✖ No"}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => iniciarEdicion("modelos", mod.id_modelo, mod.nombre_modelo)}
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleEliminarModelo(mod.id_modelo, mod.id_marca)}
                            style={{ padding: "6px 10px", color: "var(--danger)", border: "1px solid var(--border-light)" }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedModelos.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                      No hay modelos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: TIENDAS */}
      {activeTab === "tiendas" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Gestión de Tiendas Físicas</h3>

          <form onSubmit={handleCrearTienda} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de la tienda... (Ej. Concesionario Central)"
              value={nuevaTiendaNombre}
              onChange={e => setNuevaTiendaNombre(e.target.value)}
              disabled={loading}
              required
              style={{ flex: 2, minWidth: "200px" }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Ciudad... (Ej. Madrid)"
              value={nuevaTiendaCiudad}
              onChange={e => setNuevaTiendaCiudad(e.target.value)}
              disabled={loading}
              style={{ flex: 1, minWidth: "150px" }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              + Crear Tienda
            </button>
          </form>

          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Nombre Tienda{sortField === "nombre" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th onClick={() => handleSort("ciudad")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Ciudad{sortField === "ciudad" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedTiendas.map(t => {
                  const isEditing = editingType === "tiendas" && editingId === t.id_tienda;
                  return (
                    <tr key={t.id_tienda}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editingNombre}
                            onChange={e => setEditingNombre(e.target.value)}
                            style={{ padding: "6px 10px", fontSize: "0.85rem", maxWidth: "200px" }}
                            required
                          />
                        ) : (
                          <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editingExtra}
                            onChange={e => setEditingExtra(e.target.value)}
                            style={{ padding: "6px 10px", fontSize: "0.85rem", maxWidth: "150px" }}
                          />
                        ) : (
                          t.ciudad ? `📍 ${t.ciudad}` : <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin indicar</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button type="button" className="btn btn-primary" onClick={handleGuardarEdicion} style={{ padding: "6px 12px", fontSize: "0.8rem" }} disabled={loading}>✓</button>
                            <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>✗</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => iniciarEdicion("tiendas", t.id_tienda, t.nombre, t.ciudad || "")}
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleEliminarTienda(t.id_tienda)}
                              style={{ padding: "6px 12px", color: "var(--danger)", border: "1px solid var(--border-light)" }}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedTiendas.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                      No hay tiendas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: PAGOS */}
      {activeTab === "pagos" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Tipos de Venta (Pagos)</h3>

          <form onSubmit={handleCrearTipoVenta} style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Financiación Preference"
              value={nuevoTipoVentaNombre}
              onChange={e => setNuevoTipoVentaNombre(e.target.value)}
              disabled={loading}
              required
              style={{ flex: 1, minWidth: "200px" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Color:</label>
              <input
                type="color"
                value={nuevoTipoVentaColor}
                onChange={e => setNuevoTipoVentaColor(e.target.value)}
                style={{ width: "36px", height: "36px", padding: 0, border: "1px solid var(--border-light)", borderRadius: "4px", cursor: "pointer" }}
                title="Elige el color para este tipo de pago"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              + Crear Tipo Pago
            </button>
          </form>

          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Nombre Tipo Venta{sortField === "nombre" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th>Color Asignado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedTiposVenta.map(t => {
                  const isEditing = editingType === "pagos" && editingId === t.id;
                  return (
                    <tr key={t.id}>
                      <td>
                        {isEditing ? (
                          <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingNombre}
                              onChange={e => setEditingNombre(e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                              required
                              autoFocus
                            />
                            <input
                              type="color"
                              value={editingColor}
                              onChange={e => setEditingColor(e.target.value)}
                              style={{ width: "30px", height: "30px", padding: 0, border: "1px solid var(--border-light)", borderRadius: "4px", cursor: "pointer" }}
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px" }} disabled={loading}>✓</button>
                            <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "4px 8px" }}>✗</button>
                          </form>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            backgroundColor: t.color || "#3b82f6",
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            border: "1px solid var(--border-light)"
                          }}></span>
                          <span style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{t.color || "#3b82f6"}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => iniciarEdicion("pagos", t.id, t.nombre, "", t.color || "#3b82f6")}
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleEliminarTipoVenta(t.id)}
                            style={{ padding: "6px 12px", color: "var(--danger)", border: "1px solid var(--border-light)" }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: ESTADOS */}
      {activeTab === "estados" && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.15rem" }}>Estados del Vehículo</h3>

          <form onSubmit={handleCrearEstadoVehiculo} style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Buyback"
              value={nuevoEstadoVehiculoNombre}
              onChange={e => setNuevoEstadoVehiculoNombre(e.target.value)}
              disabled={loading}
              required
              style={{ flex: 1, minWidth: "200px" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="chkNuevoEstadoPredeterminado"
                checked={nuevoEstadoVehiculoPredeterminado}
                onChange={e => setNuevoEstadoVehiculoPredeterminado(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="chkNuevoEstadoPredeterminado" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                Predeterminado
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              + Crear Estado
            </button>
          </form>

          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Nombre Estado{sortField === "nombre" ? (sortOrder === "asc" ? " ▲" : " ▼") : " ↕"}
                  </th>
                  <th>Predeterminado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedEstadosVehiculo.map(ev => {
                  const isEditing = editingType === "estados" && editingId === ev.id;
                  return (
                    <tr key={ev.id}>
                      <td>
                        {isEditing ? (
                          <form onSubmit={handleGuardarEdicion} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingNombre}
                              onChange={e => setEditingNombre(e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                              required
                              autoFocus
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="checkbox"
                                id="chkEditEstadoPredeterminado"
                                checked={editingPredeterminado}
                                onChange={e => setEditingPredeterminado(e.target.checked)}
                                style={{ width: "16px", height: "16px", cursor: "pointer" }}
                              />
                              <label htmlFor="chkEditEstadoPredeterminado" style={{ fontSize: "0.8rem", cursor: "pointer" }}>Predet.</label>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px" }} disabled={loading}>✓</button>
                            <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} style={{ padding: "4px 8px" }}>✗</button>
                          </form>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{ev.nombre}</span>
                        )}
                      </td>
                      <td>
                        <div onClick={() => handleToggleEstadoPredeterminado(ev.id, !!ev.predeterminado)} style={{ cursor: "pointer", display: "inline-block" }}>
                          {ev.predeterminado ? (
                            <span className="badge badge-success" style={{ background: "rgba(16, 185, 129, 0.2)", color: "var(--success)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>
                              ★ Predeterminado
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--text-muted)", border: "1px solid var(--border-light)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem" }}>
                              Hacer Predeterminado
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => iniciarEdicion("estados", ev.id, ev.nombre, "", "", !!ev.predeterminado)}
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleEliminarEstadoVehiculo(ev.id)}
                            style={{ padding: "6px 12px", color: "var(--danger)", border: "1px solid var(--border-light)" }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
