from django.db.models import (CharField, )
from model_utils.models import TimeStampedModel


class Configuration(TimeStampedModel):
    class Meta:
        verbose_name = 'Detalle de empresa'
        verbose_name_plural = 'Detalles de empresa'
        db_table = 'TB_CONFIGURATION'

    key = CharField(max_length=50, unique=True, verbose_name='Detalle')
    value = CharField(max_length=1000, default='', verbose_name='Valor')
