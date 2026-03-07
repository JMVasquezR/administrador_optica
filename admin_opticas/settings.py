"""
Django settings for admin_opticas project.
"""

import os
from pathlib import Path

import dj_database_url

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
DEBUG = os.getenv('DEBUG', False) == str(True)

CSRF_TRUSTED_ORIGINS = [
    "https://administradoroptica-production.up.railway.app"
]

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", '').split(",")

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_filters',
    'corsheaders',
    'rest_framework',
    'app_backend',
    'app_notification',
    'app_web'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend'
    ]
}

ROOT_URLCONF = 'admin_opticas.urls'

LOGIN_URL = 'login'

# Redirección después de iniciar sesión
LOGIN_REDIRECT_URL = 'app_web:home'

# Redirección después de cerrar sesión
LOGOUT_REDIRECT_URL = 'login'

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

CORS_ALLOW_ALL_ORIGINS = True

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

STATIC_URL = '/static/'
MEDIA_URL = '/media/'

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Para producción con collectstatic
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'app_web', 'static'),
]

# Esto es para que WhiteNoise sea más inteligente con el caché
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

if not DEBUG:
    # Estas líneas SOLO se ejecutan en Railway (Producción)
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
else:
    # Estas líneas aseguran que en tu PC todo siga por HTTP normal
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
