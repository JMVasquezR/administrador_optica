from django.db import models
from django.db.models import (
    CharField, FloatField, ForeignKey, PROTECT, TextField, IntegerField, BooleanField, CASCADE
)
from django.db.models.functions import Length
from model_utils.models import TimeStampedModel

from app_backend.models.opticas import Optica


class Category(TimeStampedModel):
    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        db_table = 'TB_BACKEND_CATEGORY'

    optica = ForeignKey(Optica, on_delete=CASCADE, related_name='categorias', default=1, db_index=True)
    name = CharField(max_length=250, verbose_name='Nombre', db_index=True)
    description = TextField(null=True, blank=True, verbose_name='Descripción')

    def __str__(self):
        return f'{self.name}'

    def save(self, *args, **kwargs):
        self.code = self.name.upper()
        super().save(*args, **kwargs)


class Brand(TimeStampedModel):
    optica = ForeignKey(Optica, on_delete=CASCADE, related_name='marcas', default=1, db_index=True)
    name = CharField(max_length=250, verbose_name='Nombre')
    description = TextField(null=True, blank=True, verbose_name='Descripción')

    class Meta:
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'
        db_table = 'TB_BACKEND_BRAND'

    def __str__(self):
        return f'{self.name}'


UNIT_MEASURE = (
    ('UNIDAD', 'UNIDAD'),
    ('PAR', 'PAR'),
    ('CAJA', 'CAJA'),
    ('BOTELLA', 'BOTELLA'),
    ('PAQUETE', 'PAQUETE'),
    ('METRO', 'METRO'),
    ('LITRO', 'LITRO'),
)


class ProductManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().annotate(name_length=Length('name')).order_by('name_length', 'name')


class Product(TimeStampedModel):
    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        db_table = 'TB_BACKEND_PRODUCT'

    objects = ProductManager()
    optica = ForeignKey(Optica, on_delete=CASCADE, related_name='productos', default=1, db_index=True)
    name = CharField(max_length=250, verbose_name='Nombre del Producto')
    code = CharField(max_length=150, null=True, blank=True, verbose_name='Código del Producto')
    description = TextField(null=True, blank=True, verbose_name='Descripción')
    unit_price = FloatField(null=True, blank=True, verbose_name='Precio (S/)')
    category = ForeignKey(Category, on_delete=PROTECT, verbose_name='Categoría')
    brand = ForeignKey(Brand, on_delete=PROTECT, null=True, blank=True, verbose_name='Marca')
    unit_measure = CharField(max_length=7, choices=UNIT_MEASURE, verbose_name='Unidad de Medida')
    initial_stock = IntegerField(default=0, verbose_name='Stock Inicial')
    status = BooleanField(default=True, verbose_name='Estado del Producto')

    def __str__(self):
        marca = self.brand.name if self.brand else self.category.name
        name_ = self.category.name if self.name == 'Sin nombre' else self.name

        if self.name == 'Sin nombre':
            return f'{name_} - {marca}'
        return f'{marca} - {name_}'

    @property
    def detail_product(self):
        brand = self.brand.name if self.brand else ''
        return f'{self.name} {brand}'

    def save(self, *args, **kwargs):
        if self.code is None or self.code == 'AUTO-GENERADO':
            last_id = Product.objects.last().id if Product.objects.exists() else 1
            formatted_id = str(last_id + 1).zfill(3)
            self.code = f'OPTCASKYMLENS{formatted_id}'.upper()
        super().save(*args, **kwargs)
