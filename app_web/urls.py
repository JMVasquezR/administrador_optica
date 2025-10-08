from django.urls import path

from app_web.views import IndexView, AdminHomeView

app_name = 'app_web'

urlpatterns = [
    path('', IndexView.as_view(), name='index'),
    path('optica', AdminHomeView.as_view(), name='home'),
]
