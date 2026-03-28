from django.contrib.auth.models import User
from django.db.models import (CharField, ForeignKey, CASCADE, OneToOneField)
from model_utils.models import TimeStampedModel

from app_backend.models.opticas import Optica


class PerfilUsuario(TimeStampedModel):
    user = OneToOneField(User, on_delete=CASCADE, related_name='perfil')
    optica = ForeignKey(Optica, on_delete=CASCADE, related_name='empleados')

    ROLES = [
        ('ADMIN', 'Administrador / Dueño'),
        ('OPTOMETRISTA', 'Optometrista'),
        ('VENTAS', 'Ventas / Recepción'),
    ]
    rol = CharField(max_length=20, choices=ROLES, default='VENTAS')

    def __str__(self):
        return f"{self.user.username} - {self.optica.nombre}"
