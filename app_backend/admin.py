from django.contrib import admin

from app_backend.models.products import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('id', 'name',)
    search_fields = ['name']
