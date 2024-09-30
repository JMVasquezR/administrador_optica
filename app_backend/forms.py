from django import forms

from app_backend.models.sales_ticket import SalesTicket


class SalesTicketForm(forms.ModelForm):
    class Meta:
        model = SalesTicket
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(SalesTicketForm, self).__init__(*args, **kwargs)
        last_ticket = SalesTicket.objects.all().order_by('id').last()

        if last_ticket:
            self.fields['ballot_number'].widget.attrs.update({'placeholder': last_ticket.ballot_number})
        else:
            self.fields['ballot_number'].widget.attrs.update({'placeholder': '001-000001'})
