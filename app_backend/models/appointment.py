from django.conf import settings
from django.db import models
from django.db.models import (CharField, DateField, ForeignKey, TimeField, TextField)

from app_backend.models.patients import Patient


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('confirmed', 'Confirmada'),
        ('completed', 'Completada'),
        ('cancelled', 'Cancelada'),
    ]

    MEDIUM_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('presencial', 'Presencial'),
        ('llamada', 'Llamada'),
        ('otro', 'Otro'),
    ]

    patient = ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments', verbose_name="Paciente")
    created_by = ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Registrado por"
    )
    date = DateField(verbose_name="Fecha de la Cita")
    time = TimeField(null=True, blank=True, verbose_name="Hora de la Cita")
    reason = CharField(max_length=255, verbose_name="Motivo (ej: Re-examen)")
    notes = TextField(blank=True, null=True, verbose_name="Notas u Observaciones")
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Estado")
    medium = CharField(max_length=20, choices=MEDIUM_CHOICES, default='whatsapp', verbose_name="Medio de Contacto")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cita"
        verbose_name_plural = "Citas"
        ordering = ['date', 'time']

    def __str__(self):
        return f"{self.date} {self.time} - {self.patient.full_name} ({self.get_status_display()})"
