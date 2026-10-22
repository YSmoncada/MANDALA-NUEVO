// Tipos de datos centrales de la aplicación NoxOS

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'bartender' | 'mesera' | 'usuario' | string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: string | number;
  categoria: string | number;
  imagen?: string;
  stock?: number;
  activo: boolean;
}

export interface Mesa {
  id: number;
  numero: number;
  zona?: string;
  ocupada_por_id?: number | null;
}

export interface DetallePedido {
  id: number;
  producto_id: number;
  producto_nombre: string;
  producto_precio: string | number;
  cantidad: number;
}

export interface Pedido {
  id: number;
  mesa: number;
  mesa_numero?: number;
  usuario?: number;
  usuario_nombre?: string;
  mesera_nombre?: string;
  estado: 'pendiente' | 'despachado' | 'finalizada' | 'cancelado';
  total: string | number;
  fecha_hora: string;
  productos_detalle: DetallePedido[];
}
