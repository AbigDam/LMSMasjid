from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import *

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

class ClassSerializer(serializers.Serializer):
    class Meta:
        model = Class
        fields = "__all__"