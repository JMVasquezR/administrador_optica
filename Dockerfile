FROM python:3.12

# Instala dependencias del sistema
RUN apt-get update && apt-get install -y \
    libgirepository1.0-dev \
    libcairo2 \
    libpango1.0-dev \
    libgdk-pixbuf2.0-dev \
    libgtk-3-dev \
    gir1.2-gtk-3.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# Instala las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Recopila los archivos estáticos
RUN rm -rf /app/staticfiles && python manage.py collectstatic --noinput

# Comando de inicio con Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "admin_opticas.wsgi:application"]
