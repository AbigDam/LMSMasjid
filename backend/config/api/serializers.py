import datetime
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import *
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only = True)
    role = serializers.CharField()

    def create(self, validated_data):
        role_name = validated_data.pop("role")
        role_obj, created= Role.objects.get_or_create(role_name = role_name)

        user = User.objects.create_user(username = validated_data["username"],
                            email = validated_data["email"],
                            password = validated_data["password"],
                            role = role_obj)
        if role_obj.role_name == "Teacher":
            Teacher.objects.create(corresponding_user = user)
        
        if role_obj.role_name == "Student":
            Student.objects.create(corresponding_user = user)

        if role_obj.role_name == "Parent":
            Parent.objects.create(corresponding_user = user)

        return user
    
class CreateClassSerializer(serializers.Serializer):
    class_name = serializers.CharField()

    def create(self, validated_data):
        user = self.context["request"].user
        
        classroom = Class.objects.create(teacher = Teacher.objects.get(corresponding_user = user),class_name = validated_data["class_name"])

        return classroom

class ClassSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="class_id", read_only=True)
    title = serializers.CharField(source="class_name", read_only=True)
    program = serializers.CharField(source="prorgram", read_only=True)

    students = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = [
            "id",
            "title",
            "program",
            "students",
            "schedule",
            "room",
            "status",
        ]

    def get_students(self, obj):
        return obj.students.count()

    def get_status(self, obj):
        return "active" if obj.status else "inactive"


class AnnouncementSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="announcement_id", read_only=True)
    date = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ["id", "title", "detail", "date"]

    def get_date(self, obj):
        today = timezone.now().date()
        delta = (obj.date - today).days

        if delta == 0:
            return "Today"
        elif delta == 1:
            return "Tomorrow"
        elif 1 < delta <= 7:
            return obj.date.strftime("%A")  # e.g. "Saturday"
        else:
            return obj.date.strftime("%b %d, %Y")  # fallback: "Jun 14, 2026"


# ── Attendance ────────────────────────────────────────────────────────────────

class LogAttendanceSerializer(serializers.Serializer):
    student_id   = serializers.IntegerField()
    classroom_id = serializers.IntegerField()
    # Matches exactly what the frontend sends: 'Present', 'Absent', 'Excused Absence'
    attendance   = serializers.ChoiceField(choices=['Present', 'Absent', 'Excused Absence'])
    date         = serializers.DateField(default=datetime.date.today)

    def to_representation(self, instance):
        # The saved Attendance_Log model has different field names (`present`
        # instead of `attendance`), so build the response from its actual fields.
        return {
            "attendance_log_id": instance.attendance_log_id,
            "student_id": instance.student_id,
            "classroom_id": instance.classroom_id,
            "present": instance.present,
            "date": instance.date,
        }

    def create(self, validated_data):
        teacher = Teacher.objects.get(corresponding_user=self.context["request"].user)
        student = Student.objects.get(student_id=validated_data["student_id"])
        classroom = Class.objects.get(class_id=validated_data["classroom_id"])
        present = validated_data["attendance"] == "Present"
        log_date = validated_data["date"]

        attendance_log = Attendance_Log.objects.create(
            student=student,
            classroom=classroom,
            present=present,
            date=log_date,
        )

        # If the student was present yesterday but no behavior log was recorded,
        # auto-create one with a perfect score — assume good behavior if teacher
        # didn't flag anything.
        yesterday = log_date - datetime.timedelta(days=1)
        was_present_yesterday = Attendance_Log.objects.filter(
            student=student, date=yesterday, present=True
        ).exists()
        if was_present_yesterday:
            behavior_logged = Behavior_Log.objects.filter(
                student=student, date=yesterday
            ).exists()
            if not behavior_logged:
                Behavior_Log.objects.create(
                    student=student,
                    logged_by=teacher,
                    score=5,
                    comments="",
                    date=yesterday,
                )

        return attendance_log


class AttendanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance_Log
        fields = "__all__"


# ── Behavior ──────────────────────────────────────────────────────────────────

class LogBehaviorSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    score      = serializers.IntegerField(min_value=1, max_value=5)
    comments   = serializers.CharField(required=False, allow_blank=True, default="")
    date       = serializers.DateField(default=datetime.date.today)

    def create(self, validated_data):
        teacher = Teacher.objects.get(corresponding_user=self.context["request"].user)
        student = Student.objects.get(student_id=validated_data["student_id"])

        behavior_log = Behavior_Log.objects.create(
            student=student,
            logged_by=teacher,
            score=validated_data["score"],
            comments=validated_data.get("comments", ""),
            date=validated_data["date"],
        )
        return behavior_log


class BehaviorLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Behavior_Log
        fields = "__all__"

class CreateLogSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    class_id = serializers.IntegerField()
    surah = serializers.IntegerField(required=False)
    starting_ayah = serializers.IntegerField(required=False)
    ending_ayah = serializers.IntegerField(required=False)
    passed = serializers.BooleanField(required=False)
    behavior = serializers.IntegerField(min_value=1, max_value=5, default=5)
    attendance = serializers.IntegerField(min_value=0, max_value=2, default=0) #0 - Present   1-Absent    2- Excused Absence
    comments = serializers.CharField(required=False, allow_blank=True, default="")
    date = serializers.DateField(default=datetime.date.today)
    log_type = serializers.IntegerField(required=False) # 0 - "Reading Log"   1 - "Memorization Log"   2 - "Review Log"

    def create(self, validated_data):
        student = Student.objects.get(student_id=validated_data["student_id"])
        classroom = Class.objects.get(class_id=validated_data["class_id"])

        log = Log.objects.create(
            student=student,
            logged_by=classroom,
            surah=validated_data.get("surah", None),
            ayah_init=validated_data.get("starting_ayah", None),
            ayah_final=validated_data.get("ending_ayah", None),
            passed=validated_data.get("passed", None),
            comments=validated_data.get("comments", ""),
            date=validated_data["date"],
            behavior=validated_data.get("behavior", None),
            log_type=validated_data.get("log_type", None),
            attendance=validated_data.get("attendance", 0),
        )
        return log
        
# ── Student ──────────────────────────────────────────────────────────────────
class StudentSerializer(serializers.ModelSerializer):
    # Check work???????
    id = serializers.IntegerField(source="student_id", read_only=True)
    first_name = serializers.CharField(source="corresponding_user.first_name", read_only=True)
    last_name = serializers.CharField(source="corresponding_user.last_name", read_only=True)

    class Meta:
        model = Student
        fields = ["id", "first_name", "last_name"]


## Report Card ##
SCORE_FIELDS = (
    "behavior_score",
    "reading_score",
    "review_score",
    "memorization_score",
    "attendance_score",
)

class CreateReportCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report_Card
        fields = [
            "student",
            "classroom",
            "behavior_score",
            "reading_score",
            "review_score",
            "memorization_score",
            "attendance_score",
            "trimester",
            "date",
        ]

    def validate(self, data):
        errors = {}

        for field in SCORE_FIELDS:
            value = data.get(field)
            if value is not None and not (1 <= value <= 5):
                errors[field] = "Must be between 1 and 5."

        trimester = data.get("trimester")
        if trimester is not None and not (1 <= trimester <= 3):
            errors["trimester"] = "Must be between 1 and 3."

        if errors:
            raise serializers.ValidationError(errors)
        return data


class ReportCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report_Card
        fields = [
            "id",
            "student",
            "classroom",
            "behavior_score",
            "reading_score",
            "review_score",
            "memorization_score",
            "attendance_score",
            "trimester",
            "date",
        ]