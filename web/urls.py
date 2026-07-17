from django.contrib.auth import views as auth_views
from django.urls import path, reverse_lazy
from . import views

app_name = "web"

urlpatterns = [
    path("surveys/", views.survey_list, name="survey-list"),
    path("surveys/<int:survey_id>/questions/", views.question_list, name="question-list"),
    path("take-survey/", views.available_surveys, name="available-surveys"),
    path("surveys/<int:survey_id>/take/", views.survey_form, name="survey-form"),
    path("surveys/<int:survey_id>/responses/", views.response_list, name="response-list"),
    path("login/", auth_views.LoginView.as_view(template_name="web/login.html"), name="login"),
    path(
        "logout/",
        auth_views.LogoutView.as_view(next_page=reverse_lazy("web:available-surveys")),
        name="logout",
    ),
]