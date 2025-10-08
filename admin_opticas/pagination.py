import math

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.utils.urls import replace_query_param


class CustomPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'

    def get_paginated_response(self, data):
        total_items = self.page.paginator.count
        total_pages = math.ceil(total_items / self.page_size)
        return Response({
            'total_items': total_items,
            'total_pages': total_pages,
            'current_page': self.page.number,
            'next_page': self.get_next_link(),
            'previous_page': self.get_previous_link(),
            'last_page': self.get_last_page_link(),
            'results': data,
        })

    def get_last_page_link(self):
        if not self.page.has_next() and not self.page.has_previous():
            return None

        request = self.request
        url = request.build_absolute_uri()
        page_param = self.page_query_param

        return replace_query_param(url, page_param, self.page.paginator.num_pages)
