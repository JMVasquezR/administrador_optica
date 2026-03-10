FROM python:3.12

# Instala dependencias del sistema
RUN apt-get update && apt-get install -y \
    libgirepository1.0-dev \
    libcairo2 \
    libpango1.0-dev \
    libgdk-pixbuf-xlib-2.0-dev \
    libgtk-3-dev \
    gir1.2-gtk-3.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# Instala las dependencias de Python incluyendo gunicorn
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Prepara el entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# El ENTRYPOINT ejecuta el script de preparación
ENTRYPOINT ["/entrypoint.sh"]

# El CMD lanza el servidor con los recursos optimizados para 8 vCPU
# Martí: He cambiado el puerto a $PORT para que Railway no tenga problemas
CMD ["gunicorn", "admin_opticas.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "9", \
     "--threads", "4", \
     "--timeout", "120", \
     "--access-logfile", "-"]