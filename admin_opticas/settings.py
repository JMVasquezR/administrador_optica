"""
Django settings for admin_opticas project.
"""

import os
import dj_database_url
import jet
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

if os.getenv("RAILWAY_ENV") is None:
    from dotenv import load_dotenv
    load_dotenv()

ENV_PATH = os.getenv('ENV_PATH', '.env')

if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    print(f"⚠️ Advertencia: No se encontró el archivo {ENV_PATH}. Usando variables de entorno del sistema.")

SECRET_KEY = 'django-insecure-e5zg!ez@5ff9ys6eq-z57#s)*8+$g3ce4cy+573lx23cym)%l4'
DEBUG = True

CSRF_TRUSTED_ORIGINS = [
    "https://administradoroptica-production.up.railway.app"
]

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", '').split(",")

INSTALLED_APPS = [
    'jet.dashboard',
    'jet',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'app_backend',
    'app_notification',
    'app_web'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Agregar WhiteNoise
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'admin_opticas.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'admin_opticas.wsgi.application'

# 🔹 Configuración de la Base de Datos
BD_DEFAULT = os.getenv('BD_DEFAULT', 'True') == str(True)

if BD_DEFAULT:
    DATABASES = {
        'default': dj_database_url.config(default=os.getenv("DATABASE_URL"))
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

LANGUAGE_CODE = 'es-pe'

TIME_ZONE = 'America/Lima'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# 🔹 Archivos estáticos y Django Jet
STATIC_URL = '/static/'
MEDIA_URL = '/media/'

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Para producción con collectstatic
MEDIA_ROOT = os.path.join(BASE_DIR, 'media') if os.getenv('MEDIA_ROOT') is None else os.getenv('MEDIA_ROOT')

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'app_web/static'),  # Solo incluir estáticos de la app
    os.path.join(jet.__path__[0], 'static'),  # Incluir estáticos de Django Jet
]

# 🔹 Configuración de WhiteNoise
if not DEBUG:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# 🔹 Configuración de Jet
JET_INDEX_DASHBOARD = 'app_backend.dashboard.CustomIndexDashboard'

JET_THEMES = [
    {'theme': 'default', 'color': '#47bac1', 'title': 'Default'},
    {'theme': 'green', 'color': '#44b78b', 'title': 'Green'},
    {'theme': 'light-green', 'color': '#2faa60', 'title': 'Light Green'},
    {'theme': 'light-violet', 'color': '#a464c4', 'title': 'Light Violet'},
    {'theme': 'light-blue', 'color': '#5EADDE', 'title': 'Light Blue'},
    {'theme': 'light-gray', 'color': '#222', 'title': 'Light Gray'},
]

JET_SIDE_MENU_COMPACT = True
X_FRAME_OPTIONS = 'SAMEORIGIN'

JET_SIDE_MENU_ITEMS = None

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
