from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import *
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only = True)
    role = serializers.CharField()

    def create(self, validated_data):
        role_name = validated_data.pop("role")
        role_obj, created= Role.objects.get_or_create(role_name = role_name)

        user = User.objects.create_user(username = validated_data["first_name"] + validated_data["last_name"],
                            first_name = validated_data["first_name"],
                            last_name = validated_data["last_name"],
                            email = validated_data["email"],
                            password = validated_data["password"],
                            role = role_obj)
        if role_obj.role_name == "Teacher":
            Teacher.objects.create(corresponding_user = user)

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