import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models import (
    CharField, DateField, ForeignKey, TimeField, TextField, UUIDField, CASCADE, DateTimeField, BooleanField
)

from app_backend.models.opticas import Optica
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

    optica = ForeignKey(Optica, on_delete=models.CASCADE, related_name='citas', default=1)
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


class CampaignContact(models.Model):
    optica = ForeignKey(Optica, on_delete=models.CASCADE, related_name='contactos_campana', default=1)

    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = ForeignKey(
        Patient, on_delete=CASCADE, related_name='campaign_contacts', verbose_name="Paciente"
    )
    user = ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='contacts_performed',
        verbose_name="Personal que contactó"
    )
    created = DateTimeField(auto_now_add=True, verbose_name="Fecha de contacto")
    medium = CharField(max_length=20, default='whatsapp', verbose_name="Medio")
    recipe = ForeignKey(
        'Recipe', on_delete=models.SET_NULL, null=True, blank=True, related_name='campaign_conversions'
    )
    is_converted = BooleanField(default=False, verbose_name="¿Generó venta?")

    class Meta:
        verbose_name = "Contacto de Campaña"
        verbose_name_plural = "Contactos de Campaña"
        ordering = ['-created']

    def __str__(self):
        return f"{self.patient.full_name} - {self.created.strftime('%d/%m/%Y')}"
