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
    is_disabled = BooleanField(default=False, verbose_name='Anulado')

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
            # Obtenemos el último ticket por ID para evitar confusiones de formato
            last_ticket = SalesTicket.objects.all().order_by('id').last()

            prefix = "001"
            if last_ticket:
                try:
                    # Intentamos sacar el número de la última boleta
                    # Ejemplo: "001-000005" -> parts[1] es "000005"
                    last_number_str = last_ticket.ballot_number.split('-')[-1]
                    new_number_int = int(last_number_str) + 1
                except (ValueError, IndexError, AttributeError):
                    # Si la última boleta tiene un formato basura (ej: "error", "1", ""),
                    # contamos cuántos registros hay para no repetir el correlativo
                    new_number_int = SalesTicket.objects.count() + 1

                self.ballot_number = f"{prefix}-{str(new_number_int).zfill(6)}"
            else:
                # Si la tabla está vacía
                self.ballot_number = f"{prefix}-000001"

        super(SalesTicket, self).save(*args, **kwargs)


class SalesLines(TimeStampedModel):
    class Meta:
        verbose_name = 'Linea de venta'
        verbose_name_plural = 'Lineas de ventas'
        db_table = 'TB_BACKEND_SALES_LINES'

    quantity = IntegerField(verbose_name='Cantidad', default=1)
    sales_ticket = ForeignKey(SalesTicket, on_delete=CASCADE, related_name='lines', verbose_name='Boleta')
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
