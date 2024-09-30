from django.urls import path, include

app_name = 'app_backend'

urlpatterns = [
    path('api/', include('app_backend.api.urls', namespace='api')),
]
