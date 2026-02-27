from django.urls import path, include

app_name = 'app_backend'

urlpatterns = [
    path('', include('app_backend.api.urls', namespace='api')),
]
