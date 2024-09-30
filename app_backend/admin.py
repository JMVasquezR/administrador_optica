from tempfile import NamedTemporaryFile

import requests
from django import forms
from django.contrib import admin
from django.contrib.admin import TabularInline
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML

from app_backend.forms import SalesTicketForm
from app_backend.models.configurations import Configuration
from app_backend.models.patients import Patient
from app_backend.models.products import Product, Brand, Category
from app_backend.models.recipes import Recipe
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


@admin.action(description='Exportar a PDF')
def export_to_pdf(modeladmin, request, queryset):
    if queryset.count() == 1:  # Verifica que solo un registro esté seleccionado
        instance = queryset.first()
        sales_lines = SalesLines.objects.filter(sales_ticket=instance.id)
        configurations = Configuration.objects.all()
        html_string = render_to_string(
            'admin/pdf_template.html',
            {
                'ticket': instance,
                'sales_lines': sales_lines,
                'ruc': configurations.filter(key='empresa.ruc').values_list('value', flat=True)[0],
                'name_company': configurations.filter(key='empresa.nombre').values_list('value', flat=True)[0],
                'addres': configurations.filter(key='empresa.direccion').values_list('value', flat=True)[0],
                'phone': configurations.filter(key='empresa.telefono').values_list('value', flat=True)[0],
                'email': configurations.filter(key='empresa.email').values_list('value', flat=True)[0],
                'patient': instance.name_patient,
            }
        )
        html = HTML(string=html_string)
        response = HttpResponse(content_type='application/pdf')
        number = instance.ballot_number
        name = instance.name_patient.capitalize().replace(' ', '')
        response['Content-Disposition'] = f'attachment; filename={number}{name}.pdf'

        with NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_pdf:
            html.write_pdf(tmp_pdf.name)
            tmp_pdf_path = tmp_pdf.name

        send_simple_message(tmp_pdf_path, title=f'{number}{name}')
        html.write_pdf(response)
        return response
    else:
        modeladmin.message_user(request, "Selecciona solo un registro para exportar a PDF", level='error')


def send_simple_message(pdf_path, title):
    # TODO FALTA SEPARAR CREDENCIALES Y CONFIGURAR EL ENVIO DEL CORREO DEL USUARIO SELECCIONADO
    with open(pdf_path, 'rb') as pdf_file:
        response = requests.post(
            "https://api.mailgun.net/v3/sandbox05eef47a5c1b45818a8efb42cd3e3267.mailgun.org/messages",
            auth=("api", "47612584ba60889ac19fbc0120098d26-777a617d-6aaadc4b"),
            files={"attachment": (f"{title}.pdf", pdf_file)},  # Adjunta el archivo PDF
            data={
                "from": "Excited User <mailgun@sandbox05eef47a5c1b45818a8efb42cd3e3267.mailgun.org>",
                "to": ["josemartivr@gmail.com"],
                "subject": f"{title}",
                "text": "Buenas tardes, se adjunta boleta"
            }
        )
        return response


class SalesLinesInlineForm(forms.ModelForm):
    class Meta:
        model = SalesLines
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Agregar atributos de datos al campo de selección de producto
        if 'product' in self.fields:
            self.fields['product'].widget.attrs.update({
                'data-code': self.instance.product.code if self.instance.pk else '',
                'data-unit-measure': self.instance.product.unit_measure if self.instance.pk else ''
            })


class SalesLinesInline(TabularInline):
    model = SalesLines
    fields = ['quantity', 'product_code', 'product', 'product_unit_measure', 'unit_price', 'amount']
    readonly_fields = ('amount', 'product_code', 'product_unit_measure')
    form = SalesLinesInlineForm
    extra = 1

    def product_code(self, obj):
        return f"{obj.product_code}"

    def product_unit_measure(self, obj):
        return f"{obj.product_unit_measure}"

    product_code.short_description = 'Codigo'
    product_unit_measure.short_description = 'Unidad de medidad'


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
    actions = [export_to_pdf]
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

    class Media:
        js = ('js/sales_ticket.js',)

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
    list_display = ('name', 'code', 'unit_measure', 'brand', 'unit_price', 'category')
    search_fields = ('name', 'unit_price', 'category__name', 'brand__name')
    readonly_fields = ('code',)
    fieldsets = [
        (None, {
            'fields': [
                'name',
                'code',
                'brand',
                'category',
                'unit_measure',
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
    list_display = ('code', 'name')
    search_fields = ['name']


@admin.register(Configuration)
class ConfigurationAdmin(admin.ModelAdmin):
    list_display = ('key', 'value',)
    list_editable = ('value',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Recipe)
class RecipeBookAdmin(admin.ModelAdmin):
    list_display = ('prescription_number', 'patient', 'date_of_issue')
    fieldsets = [
        (None, {
            'fields': [
                'date_of_issue',
                'patient',
                'is_disabled',
            ]
        }),
        ('Distancia Lejos', {
            'fields': [
                ('left_eye_spherical_distance_far', 'right_eye_spherical_distance_far'),
                ('left_eye_cylinder_distance_far', 'right_eye_cylinder_distance_far'),
                ('left_eye_axis_distance_far', 'right_eye_axis_distance_far'),
                ('pupillary_distance_far',),
            ],
        }),
        ('Distancia Cerca', {
            'fields': [
                ('left_eye_spherical_distance_near', 'right_eye_spherical_distance_near'),
                ('left_eye_cylinder_distance_near', 'right_eye_cylinder_distance_near'),
                ('left_eye_axis_distance_near', 'right_eye_axis_distance_near'),
                ('pupillary_distance_near',),
            ]
        }),
        ('Otros', {
            'fields': [
                'observation', 'instruction'
            ]
        })
    ]
