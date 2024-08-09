from django.contrib import admin
from django.contrib.admin import TabularInline

from app_backend.forms import SalesTicketForm
from app_backend.models.patients import Patient
from app_backend.models.products import Product, Brand, Category
from app_backend.models.sales_ticket import SalesTicket, SalesLines
from app_backend.models.type_document import TypeDocument


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
            ]
        }),
    ]


@admin.register(TypeDocument)
class TypeDocumentAdmin(admin.ModelAdmin):
    list_display = ('short_name', 'long_name', 'type_patron', 'taxpayer_type', 'type_length', 'length')
    fieldsets = [
        (None, {
            'fields': [
                ('short_name', 'long_name'),
                'type_patron',
                'taxpayer_type',
                ('type_length', 'length')
            ]
        })
    ]


class SalesLinesInline(TabularInline):
    model = SalesLines
    readonly_fields = ('amount',)
    extra = 1


@admin.register(SalesTicket)
class SalesTicketAdmin(admin.ModelAdmin):
    form = SalesTicketForm
    list_display = ('ballot_number', 'patient', 'date_of_issue', 'total_bill', 'is_disabled')
    search_fields = [
        'ballot_number', 'patient__first_name', 'patient__surname', 'patient__second_surname',
        'patient__document_number', 'product__brand__name'
    ]
    inlines = [SalesLinesInline]
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

    def total_bill(self, obj):
        return f"{obj.total_bill}"

    total_bill.short_description = 'Total'

    def save_formset(self, request, form, formset, change):
        instances = formset.save()

        for instance in instances:
            if instance.unit_price:
                price = instance.unit_price
                instance.amount = instance.quantity * price
                instance.save(update_fields=['amount'])
            else:
                price = instance.product.unit_price
                instance.unit_price = instance.product.unit_price
                instance.amount = instance.quantity * price
                instance.save(update_fields=['amount', 'unit_price'])

        sales = SalesLines.objects.filter(sales_ticket__ballot_number=request.POST.get('ballot_number'))

        s = 0
        for sale in sales:
            s = s + sale.amount

        bill = SalesTicket.objects.get(ballot_number=request.POST.get('ballot_number'))
        bill.sales_total = s
        bill.save(update_fields=['sales_total'])


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'brand', 'unit_price', 'category')
    search_fields = ('name', 'unit_price', 'category__name', 'brand__name')
    fieldsets = [
        (None, {
            'fields': [
                'name',
                'brand',
                'category',
                'description',
                'unit_price',
            ]
        }),
    ]


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('id', 'name',)
    search_fields = ['name']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ['name']
