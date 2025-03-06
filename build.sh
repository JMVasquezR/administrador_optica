#!/bin/bash
set -e

# Instalar dependencias del sistema necesarias
apt-get update && apt-get install -y \
    libgirepository1.0-dev \
    libcairo2 \
    libpango1.0-dev \
    libgdk-pixbuf2.0-dev \
    libgtk-3-dev \
    gir1.2-gtk-3.0

# Instalar dependencias de Python
pip install -r requirements.txt