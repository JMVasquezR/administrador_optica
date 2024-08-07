from django.db.models import (
    CharField, ForeignKey, FloatField, ManyToManyField, TextField, BooleanField, DateField, PROTECT, IntegerField
)
from model_utils.models import TimeStampedModel

from app_backend.models.patients import Patient
from app_backend.models.products import Product


class SalesTicket(TimeStampedModel):
    class Meta:
        verbose_name = 'Boleta de venta'
        verbose_name_plural = 'Boletas de ventas'
        ordering = ['-ballot_number']
        db_table = 'TB_BACKEND_SALES_TICKET'

    ballot_number = CharField(max_length=10, verbose_name='Número de boleta')
    date_of_issue = DateField(verbose_name='Fecha de emisión')
    patient = ForeignKey(Patient, on_delete=PROTECT, verbose_name='Paciente')
    sales_total = FloatField(null=True, blank=True, verbose_name='Total de ventas')
    product = ManyToManyField(Product, related_name='product', through='saleslines')
    observation = TextField(null=True, blank=True)
    is_disabled = BooleanField(default=False, verbose_name='Deshabilitado')

    def __str__(self):
        return f'{self.ballot_number}'

    @property
    def total_bill(self):
        return f"S/.{self.sales_total if self.sales_total else ''}"

    @property
    def name_patient(self):
        return self.patient.full_name


class SalesLines(TimeStampedModel):
    class Meta:
        verbose_name = 'Linea de venta'
        verbose_name_plural = 'Lineas de ventas'
        db_table = 'TB_BACKEND_SALES_LINES'

    quantity = IntegerField(verbose_name='Cantidad', default=1)
    sales_ticket = ForeignKey(SalesTicket, on_delete=PROTECT, verbose_name='Boleta')
    product = ForeignKey(Product, on_delete=PROTECT, verbose_name='Producto')
    unit_price = FloatField(verbose_name='Precio unitario', null=True, blank=True)
    amount = FloatField(verbose_name='Importe', null=True, blank=True)

    def __str__(self):
        return f'Cantidad: {self.quantity} | Descripción: {self.product.name} | P/u: {self.product.unit_price} | Importe: {self.amount}'

    @property
    def set_money_amount(self):
        return f"S/.{self.amount if self.amount else ''}"

    @property
    def marca_name(self):
        if self.product.brand:
            return f'{self.product.brand.name}'
        return ''
