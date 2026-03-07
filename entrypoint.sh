#!/bin/sh

# 1. Martí: Esto soluciona el "No directory at: /app/staticfiles/" y los errores 404
echo "🔹 Recolectando archivos estáticos (CSS/JS)..."
python manage.py collectstatic --noinput

# 2. Aplicar los cambios a la base de datos de Railway
echo "🔹 Aplicando migraciones..."
python manage.py migrate --noinput

# 3. Crear el superusuario de forma segura mediante un script de Python
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

# 4. Lanzar el servidor profesional (Gunicorn)
echo "🚀 Iniciando servidor de Ópticas K&M Lens..."
exec gunicorn admin_opticas.wsgi:application --bind 0.0.0.0:8000 --workers 3