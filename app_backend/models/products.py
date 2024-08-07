from django.db.models import (CharField, FloatField, ForeignKey, PROTECT, TextField)
from model_utils.models import TimeStampedModel


class Category(TimeStampedModel):
    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        db_table = 'TB_BACKEND_CATEGORY'

    name = CharField(max_length=250, verbose_name='Nombre')
    description = TextField(null=True, blank=True, verbose_name='Descripción')

    def __str__(self):
        return f'{self.name}'


class Brand(TimeStampedModel):
    class Meta:
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'
        db_table = 'TB_BACKEND_BRAND'

    name = CharField(max_length=250, verbose_name='Nombre')
    description = TextField(null=True, blank=True, verbose_name='Descripción')

    def __str__(self):
        return f'{self.name}'


class Product(TimeStampedModel):
    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        db_table = 'TB_BACKEND_PRODUCT'

    name = CharField(max_length=250, verbose_name='Nombre')
    description = TextField(null=True, blank=True, verbose_name='Descripción')
    unit_price = FloatField(null=True, blank=True, verbose_name='Precio')
    category = ForeignKey(Category, on_delete=PROTECT, verbose_name='Categoria')
    brand = ForeignKey(Brand, on_delete=PROTECT, null=True, blank=True, verbose_name='Marca')

    def __str__(self):
        marca = self.brand.name if self.brand else ''
        return f'{self.name} {marca}'

    @property
    def detail_product(self):
        brand = self.brand.name if self.brand else ''
        return f'{self.name} {brand}'
