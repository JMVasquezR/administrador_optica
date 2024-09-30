from django.db.models import (
    CharField, ForeignKey, FloatField, ManyToManyField, TextField, BooleanField, DateField, PROTECT, IntegerField,
    CASCADE
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

    ballot_number = CharField(max_length=10, unique=True, verbose_name='Número de boleta')
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
        return f"S/.{self.sales_total if self.sales_total else '0.0'}"

    @property
    def name_patient(self):
        return self.patient.full_name

    def save(self, *args, **kwargs):
        if not self.ballot_number:
            # Obtener la última instancia guardada
            last_ticket = SalesTicket.objects.all().order_by('id').last()
            if last_ticket:
                last_ballot_number = last_ticket.ballot_number
                prefix, number = last_ballot_number.split('-')
                number = int(number) + 1
                new_number = str(number).zfill(6)  # Asegurar que el número tenga 6 dígitos
            else:
                prefix = "001"
                new_number = "000001"

            self.ballot_number = f"{prefix}-{new_number}"

        super(SalesTicket, self).save(*args, **kwargs)


class SalesLines(TimeStampedModel):
    class Meta:
        verbose_name = 'Linea de venta'
        verbose_name_plural = 'Lineas de ventas'
        db_table = 'TB_BACKEND_SALES_LINES'

    quantity = IntegerField(verbose_name='Cantidad', default=1)
    sales_ticket = ForeignKey(SalesTicket, on_delete=CASCADE, verbose_name='Boleta')
    product = ForeignKey(Product, on_delete=CASCADE, verbose_name='Producto')
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

    @property
    def product_code(self):
        if self.product.code:
            return f'{self.product.code}'
        return ''

    @property
    def product_unit_measure(self):
        if self.product.unit_measure:
            return f'{self.product.unit_measure}'
        return ''
