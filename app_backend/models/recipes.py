from django.db.models import (ForeignKey, CharField, FloatField, PROTECT, TextField, DateField, BooleanField, Max)
from model_utils.models import TimeStampedModel

from app_backend.models.patients import Patient


class Recipe(TimeStampedModel):
    class Meta:
        verbose_name = 'Recetario'
        verbose_name_plural = 'Recetarios'

    def __str__(self):
        return f'{self.prescription_number}'

    prescription_number = CharField(max_length=6, unique=True, verbose_name='Número de recetario')

    patient = ForeignKey(Patient, on_delete=PROTECT, verbose_name='Paciente')
    date_of_issue = DateField(verbose_name='Fecha de emisión')

    # Distancia ojo derecho
    right_eye_spherical_distance_far = FloatField(null=True, blank=True, verbose_name='O.D. Esferico')
    right_eye_cylinder_distance_far = FloatField(null=True, blank=True, verbose_name='O.D. Cilindro')
    right_eye_axis_distance_far = FloatField(null=True, blank=True, verbose_name='O.D. Eje')

    # Distancia ojo izquierdo
    left_eye_spherical_distance_far = FloatField(null=True, blank=True, verbose_name='O.I. Esferico')
    left_eye_cylinder_distance_far = FloatField(null=True, blank=True, verbose_name='O.I. Cilindro')
    left_eye_axis_distance_far = FloatField(null=True, blank=True, verbose_name='O.I. Eje')

    # Distancia - Distancia pupílar
    pupillary_distance_far = FloatField(null=True, blank=True, verbose_name='Distancia pupilar')

    # Cerca ojo derecha
    right_eye_spherical_distance_near = FloatField(null=True, blank=True, verbose_name='O.D. Esferico')
    right_eye_cylinder_distance_near = FloatField(null=True, blank=True, verbose_name='O.D. Cilindro')
    right_eye_axis_distance_near = FloatField(null=True, blank=True, verbose_name='O.D. Eje')

    # Cerca ojo izquierdo
    left_eye_spherical_distance_near = FloatField(null=True, blank=True, verbose_name='O.I. Esferico')
    left_eye_cylinder_distance_near = FloatField(null=True, blank=True, verbose_name='O.I. Cilindro')
    left_eye_axis_distance_near = FloatField(null=True, blank=True, verbose_name='O.I. Eje')

    # Cerca - Distancia pupílar
    pupillary_distance_near = FloatField(null=True, blank=True, verbose_name='Distancia pupilar')

    observation = TextField(null=True, blank=True, verbose_name='Observaciones')
    instruction = TextField(null=True, blank=True, verbose_name='Instrucciones')

    is_active = BooleanField(default=True, verbose_name='Estado')

    @property
    def name_patient(self):
        return self.patient.full_name

    def save(self, *args, **kwargs):
        if not self.prescription_number:
            last_number = Recipe.objects.aggregate(max_number=Max('prescription_number'))['max_number']
            new_number = int(last_number) + 1 if last_number and last_number.isdigit() else 1
            self.prescription_number = f'{new_number:06d}'
        super().save(*args, **kwargs)
