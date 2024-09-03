from django.contrib import admin
from django.utils import timezone
# TODO SI NO LO UTILIZAMOS MAS DESISTALAR TWILIO
from twilio.rest import Client

from app_notification.models.annual_controls import PatientProxy


@admin.action(description='Envio de whatsapp')
def send_whatsapp(modeladmin, request, queryset):
    # TODO RETIRAR LAS CLAVES PRIVADAS Y ADECUARLAS PARA QUE SEA CONFIGURABLE
    account_sid = 'AC00df97d52853bfd0cb42590cff91cffd'
    auth_token = 'e2ced9c0e9a35cea17f84b929fa7b3a4'
    client = Client(account_sid, auth_token)

    message = client.messages.create(
        from_='whatsapp:+14155238886',
        body='prueba 2',
        to='whatsapp:+51994225054'
    )

    print(message.sid)


@admin.register(PatientProxy)
class PatientProxyAdmin(admin.ModelAdmin):
    list_display = (
        'full_name', 'date_of_birth', 'document_number', 'phone_or_cellular', 'email',
        'days_since_sale'
    )
    search_fields = ('first_name', 'surname', 'second_surname', 'document_number')
    actions = [send_whatsapp]

    def days_since_sale(self, obj):
        latest_ticket = obj.salesticket_set.order_by('-date_of_issue').first()
        if latest_ticket:
            return f'{(timezone.now().date() - latest_ticket.date_of_issue).days} dias'
        return None

    def full_name(self, obj):
        return obj.full_name

    days_since_sale.short_description = 'Días desde la última venta'
    full_name.short_description = 'Nombre completo'
