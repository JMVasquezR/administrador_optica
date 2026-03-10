#!/bin/sh

# Salir inmediatamente si un comando falla
set -e

echo "🔹 Recolectando archivos estáticos (CSS/JS)..."
python manage.py collectstatic --noinput

echo "🔹 Aplicando migraciones..."
python manage.py migrate --noinput

echo "🔹 Verificando usuario administrador..."
python manage.py shell <<EOF
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin1234')
        print("✅ Usuario admin creado con éxito.")
    else:
        print("⚠️ El usuario admin ya existe.")
except Exception as e:
    print(f"❌ Error al verificar admin: {e}")
EOF

echo "🚀 Tareas de preparación listas. Pasando el control a Gunicorn..."

# LA LÍNEA MÁGICA: Esto permite que el CMD del Dockerfile se ejecute después
exec "$@"