"""Main urls."""

from django.contrib import admin
from django.shortcuts import render
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.views.generic.base import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", RedirectView.as_view(url="v1/", permanent=True), name="api_index"),
    path("api/v1/", include("project.urls")),
    # re_path(r".*", TemplateView.as_view(template_name="index.html")),
]
