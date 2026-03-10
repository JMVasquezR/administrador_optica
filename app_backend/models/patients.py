from django.db.models import (CharField, DateField, ForeignKey, PROTECT, EmailField, BooleanField)
from model_utils.models import TimeStampedModel

from app_backend.models.type_document import TypeDocument

GENDER = (
    ('M', 'Masculino'),
    ('F', 'Femenino'),
)


class Patient(TimeStampedModel):
    class Meta:
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'
        db_table = 'TB_BACKEND_PATIENT'
        unique_together = ('type_document', 'document_number')

    first_name = CharField(max_length=250, verbose_name='Nombre completo')
    surname = CharField(max_length=100, verbose_name='Apellido paterno')
    second_surname = CharField(max_length=100, blank=True, null=True, verbose_name='Apellido materno')
    date_of_birth = DateField(blank=True, null=True, verbose_name='Fecha de nacimiento')
    type_document = ForeignKey(TypeDocument, on_delete=PROTECT, verbose_name='Tipo de documento')
    document_number = CharField(max_length=25, verbose_name='Número de documento')
    gender = CharField(choices=GENDER, max_length=1, verbose_name='Genero')
    phone_or_cellular = CharField(max_length=150, null=True, blank=True, verbose_name='Telefono o Celular')
    direction = CharField(max_length=500, blank=True, null=True, verbose_name='Dirección')
    email = EmailField(blank=True, null=True, verbose_name='Correo')
    is_active = BooleanField(default=True, verbose_name='Estado')
    last_visit = DateField(null=True, blank=True, verbose_name="Última Visita")

    def __str__(self):
        return f'{self.first_name} {self.surname} {self.second_surname if self.second_surname else ""}'

    @property
    def months_since_last_visit(self):
        if not self.last_visit:
            return None
        from dateutil.relativedelta import relativedelta
        from django.utils import timezone
        diff = relativedelta(timezone.now().date(), self.last_visit)
        return diff.years * 12 + diff.months

    @property
    def full_name(self):
        return f'{self.first_name} {self.surname} {self.second_surname if self.second_surname else ""}'

    @property
    def full_document(self):
        return f'{self.type_document} - {self.document_number}'

    @property
    def date(self):
        return '' if self.date_of_birth is None else self.date_of_birth
