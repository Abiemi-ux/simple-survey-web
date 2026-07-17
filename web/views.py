from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def survey_list(request):
    return render(request, "web/survey_list.html")


@login_required
def question_list(request, survey_id):
    return render(request, "web/question_list.html", {"survey_id": survey_id})


def available_surveys(request):
    return render(request, "web/available_surveys.html")


def survey_form(request, survey_id):
    return render(request, "web/survey_form.html", {"survey_id": survey_id})


@login_required
def response_list(request, survey_id):
    return render(request, "web/response_list.html", {"survey_id": survey_id})