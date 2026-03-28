from django.db.models import (CharField, DateField, ImageField)
from model_utils.models import TimeStampedModel


class Optica(TimeStampedModel):
    nombre = CharField(max_length=150, verbose_name="Nombre de la Óptica")
    ruc = CharField(max_length=20, unique=True, verbose_name="RUC / Identificación")
    direccion = CharField(max_length=255, blank=True, null=True)
    telefono = CharField(max_length=20, blank=True, null=True)
    logo = ImageField(upload_to='logos_opticas/', blank=True, null=True)

    PLANES = [
        ('ESENCIAL', 'Plan Esencial'),
        ('CRECIMIENTO', 'Plan Crecimiento'),
        ('PREMIUM', 'Plan Premium'),
    ]
    plan = CharField(max_length=20, choices=PLANES, default='ESENCIAL')
    fecha_vencimiento = DateField(null=True, blank=True)

    def __str__(self):
        return self.nombre
