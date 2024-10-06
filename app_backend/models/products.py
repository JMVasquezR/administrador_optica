from django.db import models
from django.db.models import (CharField, FloatField, ForeignKey, PROTECT, TextField)
from django.db.models.functions import Length
from model_utils.models import TimeStampedModel


class Category(TimeStampedModel):
    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        db_table = 'TB_BACKEND_CATEGORY'

    name = CharField(max_length=250, verbose_name='Nombre')
    code = CharField(max_length=4, verbose_name='Codigo')
    description = TextField(null=True, blank=True, verbose_name='Descripción')

    def __str__(self):
        return f'{self.name}'

    def save(self, *args, **kwargs):
        self.code = self.code.upper()
        super().save(*args, **kwargs)


class Brand(TimeStampedModel):
    class Meta:
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'
        db_table = 'TB_BACKEND_BRAND'

    name = CharField(max_length=250, verbose_name='Nombre')
    description = TextField(null=True, blank=True, verbose_name='Descripción')

    def __str__(self):
        return f'{self.name}'


UNIT_MEASURE = (
    ('UNIDAD', 'UNIDAD'),
    ('PAR', 'PAR'),
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
    name = CharField(max_length=250, verbose_name='Nombre')
    code = CharField(max_length=7, null=True, blank=True, verbose_name='Codigo')
    description = TextField(null=True, blank=True, verbose_name='Descripción')
    unit_price = FloatField(null=True, blank=True, verbose_name='Precio')
    category = ForeignKey(Category, on_delete=PROTECT, verbose_name='Categoria')
    brand = ForeignKey(Brand, on_delete=PROTECT, null=True, blank=True, verbose_name='Marca')
    unit_measure = CharField(max_length=7, choices=UNIT_MEASURE, verbose_name='Unidad de medida')

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
        if self.code is None:
            last_id = Product.objects.last().id if Product.objects.exists() else 1
            formatted_id = str(last_id + 1).zfill(3)
            self.code = f'{self.category.code}{formatted_id}'.upper()
        super().save(*args, **kwargs)


