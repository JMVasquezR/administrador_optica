from datetime import timedelta

from django.db import models
from django.utils import timezone

from app_backend.models.patients import Patient


class PatientWithOldSalesManager(models.Manager):
    def get_queryset(self):
        one_year_ago = timezone.now().date() - timedelta(days=365)
        return super().get_queryset().filter(salesticket__date_of_issue__lte=one_year_ago).distinct()


class PatientProxy(Patient):
    objects = PatientWithOldSalesManager()

    class Meta:
        proxy = True
        verbose_name = 'Paciente para control anual'
        verbose_name_plural = 'Pacientes con controles anuales'
