from django.urls import path
from . import views
from .views import *
from . import adminViews
from .adminViews import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.views import TokenRefreshView
urlpatterns = [
    path('test/', views.test, name = "test"),
    path('register/', RegisterView.as_view(), name = "register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path('token/refresh/', TokenRefreshView.as_view()),

    path("create_class/", CreateClassView.as_view(), name="create_class"),
    path("create_class_accounts/", CreateClassAccounts.as_view(), name="create_class_accounts"),
    path("select_classes/", FilterClasses.as_view(), name="filter_class"),
    path("current_user/", CurrentUser.as_view(), name="current_user"),
    path("announcements/", AnnouncementListView.as_view(), name="announcements"),
    path("select_students/<int:class_id>/", StudentListView.as_view(), name="student_list"),
    path("create_log/", CreateLogView.as_view(), name="create_log"),
    path("update_log/", UpdateLogView.as_view(), name='update_log'),
    path("delete_log/", DeleteLogView.as_view(), name='delete_log'),

    path("get_logs/", GetLogsView.as_view(), name='get_logs'),
    path("report-card/", ReportCardListCreateView.as_view(), name="report-card-list-create"),
    
    # Attendance
    path("log_attendance/", LogAttendanceView.as_view(), name="log_attendance"),
    path("get_attendance/", GetAttendanceView.as_view(), name="get_attendance"),

    # Behavior
    path("log_behavior/", LogBehaviorView.as_view(), name="log_behavior"),
    path("get_behavior_log/", GetBehaviorLogView.as_view(), name="get_behavior_log"),
    path("get_behavior_issues/", GetBehaviorIssuesView.as_view(), name="get_behavior_issues"),

    # Admin Views
    path("admin/classes/", ClassesList.as_view(), name="admin_classes"),
    path("admin/update_class/<int:id>/", UpdateClassView.as_view(), name="admin_update_class"),

    path("admin/teacher/<int:id>/", TeacherDetailView.as_view(), name="admin_teacher_detail"),
    path("admin/teachers/", TeachersListView.as_view(), name="admin_teachers_list"),
    
    path('admin/available_students/<int:class_id>/', AvailableStudentsView.as_view(), name="available_students"),
    path('admin/add_students_to_class/', AddStudentsToClassView.as_view(), name="add_students_to_class"),
    path('admin/remove_student_from_class/', RemoveStudentFromClassView.as_view(), name="remove_student_from_class"),

    path('admin/users/', AllUsersView.as_view(), name="admin_all_users"),
    path('admin/users/create/', CreateUserView.as_view(), name="admin_create_user"),
    path('admin/users/<int:id>/', AdminUserDetailView.as_view(), name="admin_user_detail"),
]