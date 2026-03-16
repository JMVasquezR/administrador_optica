from django.contrib import admin

from app_backend.models.appointment import CampaignContact
from app_backend.models.patients import Patient
from app_backend.models.products import Brand, Category
from app_backend.models.sales_ticket import SalesTicket


@admin.register(CampaignContact)
class CampaignContactAdmin(admin.ModelAdmin):
    list_display = ('id', 'medium', 'recipe', 'patient', 'user', 'is_converted', 'created')


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('id', 'name',)
    search_fields = ['name']


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'type_document', 'document_number', 'phone_or_cellular')
    search_fields = ['first_name', 'surname', 'second_surname', 'document_number']
    fieldsets = [
        (None, {
            'fields': [
                'first_name',
                ('surname', 'second_surname'),
                'gender',
                'date_of_birth',
                ('type_document',),
                'document_number',
                'direction',
                ('phone_or_cellular', 'email'),
                'is_active',
                'last_visit',
            ]
        }),
    ]


@admin.register(SalesTicket)
class SalesTicketAdmin(admin.ModelAdmin):
    list_display = ('ballot_number', 'patient', 'date_of_issue', 'total_bill', 'is_disabled')
    search_fields = [
        'ballot_number', 'patient__first_name', 'patient__surname', 'patient__second_surname',
        'patient__document_number', 'product__brand__name'
    ]
    readonly_fields = ('total_bill',)
    fieldsets = [
        (None, {
            'fields': [
                ('ballot_number', 'date_of_issue'),
                'patient',
                'observation',
                'total_bill',
                'is_disabled',
            ]
        }),
    ]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ['name']
