from django.urls import path
from . import views
from .views import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.views import TokenRefreshView
urlpatterns = [
    path('test/', views.test, name = "test"),
    path('register/', RegisterView.as_view(), name = "register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    path("create_class/", CreateClassView.as_view(), name="create_class"),
    path("select_classes/", FilterClasses.as_view(), name="filter_class"),
    path("current_user/", CurrentUser.as_view(), name="current_user"),
    path("announcements/", AnnouncementListView.as_view(), name="announcements"),
    path("select_students/<int:class_id>/", StudentListView.as_view(), name="student_list"),
    path("create_log/", CreateLogView.as_view(), name="create_log"),
    path("update_log/", UpdateLogView.as_view(), name='update_log'),
    path("get_logs/", GetLogsView.as_view(), name='get_logs'),
    path("report-card/", ReportCardListCreateView.as_view(), name="report-card-list-create"),
    
    # Attendance
    path("log_attendance/", LogAttendanceView.as_view(), name="log_attendance"),
    path("get_attendance/", GetAttendanceView.as_view(), name="get_attendance"),

    # Behavior
    path("log_behavior/", LogBehaviorView.as_view(), name="log_behavior"),
    path("get_behavior_log/", GetBehaviorLogView.as_view(), name="get_behavior_log"),
    path("get_behavior_issues/", GetBehaviorIssuesView.as_view(), name="get_behavior_issues"),
]