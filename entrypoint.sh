#!/bin/sh

echo "🔹 Aplicando migraciones..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "🔹 Creando usuario admin si no existe..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin1234')
    print("✅ Usuario admin creado con éxito.")
else:
    print("⚠️ El usuario admin ya existe.")
EOF

echo "🔹 Iniciando servidor..."
exec "$@"
