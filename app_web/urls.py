from django.urls import path

from app_web.views import IndexView

app_name = 'app_web'

urlpatterns = [
    path('', IndexView.as_view(), name='index'),
]
