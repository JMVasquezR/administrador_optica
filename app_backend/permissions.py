from rest_framework import permissions

# Los SAFE_METHODS son: GET, HEAD, OPTIONS (acciones de solo lectura)
SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


class EsAdmin(permissions.BasePermission):
    """Solo el dueño de la óptica (ADMIN) tiene acceso total."""

    def has_permission(self, request, view):
        return (
                request.user.is_authenticated and
                request.user.perfil.rol == 'ADMIN'
        )


class EsOptometrista(permissions.BasePermission):
    """Acceso para ADMIN y OPTOMETRISTA (Salud: Pacientes, Agenda y Recetario)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.perfil.rol in ['ADMIN', 'OPTOMETRISTA']


class EsVendedor(permissions.BasePermission):
    """Acceso para ADMIN y VENDEDOR (Ventas: Boletas, Almacén y Agenda)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.perfil.rol in ['ADMIN', 'VENTAS']


class IsAdminOrVendedorOrReadOnly(permissions.BasePermission):
    """
    Permite lectura a cualquier usuario autenticado (incluye Optometrista),
    pero solo ADMIN o VENDEDOR pueden Crear, Editar o Eliminar.
    Útil para el listado de Pacientes o Productos.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Si la petición es de solo lectura (ver el listado o detalle), permitimos a todos
        if request.method in SAFE_METHODS:
            return True

        # Para cambios (POST, PUT, DELETE), verificamos que sea ADMIN o VENDEDOR
        return request.user.perfil.rol in ['ADMIN', 'VENTAS']
