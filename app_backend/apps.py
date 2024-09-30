from django.apps import AppConfig


class AppBackendConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app_backend'
    verbose_name = "2. Administrador"

    def ready(self):
        super().ready()

        try:
            from app_backend.models.configurations import Configuration

            Configuration.objects.get_or_create(key='empresa.ruc')
            Configuration.objects.get_or_create(key='empresa.direccion')
            Configuration.objects.get_or_create(key='empresa.telefono')
            Configuration.objects.get_or_create(key='empresa.email')
            Configuration.objects.get_or_create(key='empresa.nombre')
        except Exception as e:
            print("Error al cargar la fata")
