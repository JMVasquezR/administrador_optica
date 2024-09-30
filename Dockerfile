# Usa una imagen base oficial de Python
FROM python:3.10

# Establece el directorio de trabajo
WORKDIR /app

# Copia el archivo de requerimientos e instálalos
COPY requirements/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto de los archivos del proyecto
COPY . /app/

# Expone el puerto en el que Django se ejecutará
EXPOSE 8000

# Define el comando por defecto para ejecutar el servidor
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "admin_opticas.wsgi:application"]