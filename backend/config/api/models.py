from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class Role(models.Model):
    role_id = models.BigAutoField(primary_key=True)
    role_name = models.CharField(max_length=255)

class User(AbstractUser):
    #AbstractUser includes username, email, password, first/last name, date joined, last_login, etc.
    id = models.BigAutoField(primary_key=True)
    role_id = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="users")

class Teacher(models.Model):
    teacher_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="teachers")

class Notification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=255)
    message = models.CharField(max_length=1000)
    is_read = models.BooleanField()
    created_at = models.DateTimeField()

class Log(models.Model):
    log_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="audit_log")
    action_type = models.CharField(max_length=1000)
    affected_table = models.CharField(max_length=1000)
    record_id = models.CharField(max_length=1000)
    timestamp = models.DateTimeField()

class Class(models.Model):
    class_id = models.BigAutoField(primary_key=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="teacher")
    class_name = models.CharField(max_length=255)
    schedule_days = models.CharField(max_length=255)
    start_time = models.TimeField()
    end_time = models.TimeField()

class Parent(models.Model):
    parent_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="parents")
    phone_number = models.CharField(max_length=15)

class Student(models.Model):
    student_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="students")
    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name="child")
    classroom = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="students")
    program_type = models.CharField(max_length=255)
    enrollment_type = models.CharField(max_length=255)
