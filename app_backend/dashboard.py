import base64
import io
import urllib

import matplotlib.pyplot as plt
from django.utils import timezone
from django.utils.translation import gettext as _
from jet.dashboard.dashboard import Dashboard
from jet.dashboard.modules import DashboardModule

from app_backend.models.sales_ticket import SalesTicket


class AbstractDash(DashboardModule):
    title = None
    template = 'admin/dashboard_modules/price_chart.html'

    def __init__(self, **kwargs):
        super(AbstractDash, self).__init__(**kwargs)
        self.dates = None
        self.prices = None

    def get_date_and_price(self):
        pass

    def generate_chart(self):
        plt.figure(figsize=(5, 3))
        plt.plot(self.dates, self.prices, marker='o', linestyle='-', color='b')
        plt.title('Precio en el tiempo')
        plt.xlabel('Fecha')
        plt.ylabel('Precio')
        plt.xticks(rotation=45)
        plt.grid(True)
        plt.legend()
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
        buf.seek(0)
        string = base64.b64encode(buf.read())
        uri = urllib.parse.quote(string)
        self.chart = uri


class SalesForTheMonth(AbstractDash):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.get_date_and_price()
        self.generate_chart()
        self.title = _('Ventas del mes')

    def get_date_and_price(self):
        current_date = timezone.now()
        products = SalesTicket.objects.filter(
            date_of_issue__year=current_date.year,
            date_of_issue__month=current_date.month
        ).order_by('date_of_issue')
        self.prices = [float(product.sales_total) for product in products]
        self.dates = [product.date_of_issue.strftime('%d %b %Y') for product in products]


class SalesForTheYear(AbstractDash):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.get_date_and_price()
        self.generate_chart()
        self.title = _('Ventas del año')

    def get_date_and_price(self):
        current_date = timezone.now()
        products = SalesTicket.objects.filter(date_of_issue__year=current_date.year).order_by('date_of_issue')
        self.prices = [float(product.sales_total) for product in products]
        self.dates = [product.date_of_issue.strftime('%b %Y') for product in products]


class CustomIndexDashboard(Dashboard):
    columns = 3

    def init_with_context(self, context):
        self.children.append(SalesForTheMonth())
        self.children.append(SalesForTheYear())
