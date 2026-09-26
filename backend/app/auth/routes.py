import re
from datetime import datetime, timezone

from bson import ObjectId
from flask import jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash

from app.auth import auth_blueprint
from app.database import get_database


EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
)


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "rating": user.get("rating", 1200),
        "online": user.get("online", False),
        "created_at": user["created_at"].isoformat(),
    }


@auth_blueprint.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    errors = {}

    if len(username) < 3 or len(username) > 30:
        errors["username"] = (
            "Username must contain between 3 and 30 characters."
        )

    if not EMAIL_PATTERN.match(email):
        errors["email"] = "Enter a valid email address."

    if len(password) < 8:
        errors["password"] = (
            "Password must contain at least 8 characters."
        )

    if errors:
        return jsonify(
            {
                "success": False,
                "message": "Validation failed",
                "errors": errors,
            }
        ), 400

    database = get_database()

    if database.users.find_one(
        {
            "$or": [
                {"email": email},
                {"username": username},
            ]
        }
    ):
        return jsonify(
            {
                "success": False,
                "message": "Email or username is already registered.",
            }
        ), 409

    user_document = {
        "username": username,
        "email": email,
        "password_hash": generate_password_hash(password),
        "rating": 1200,
        "online": False,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = database.users.insert_one(user_document)
    except DuplicateKeyError:
        return jsonify(
            {
                "success": False,
                "message": "Email or username is already registered.",
            }
        ), 409

    user_document["_id"] = result.inserted_id

    access_token = create_access_token(
        identity=str(result.inserted_id)
    )

    return jsonify(
        {
            "success": True,
            "message": "Registration successful",
            "access_token": access_token,
            "user": serialize_user(user_document),
        }
    ), 201


@auth_blueprint.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify(
            {
                "success": False,
                "message": "Email and password are required.",
            }
        ), 400

    database = get_database()
    user = database.users.find_one({"email": email})

    if user is None or not check_password_hash(
        user["password_hash"],
        password,
    ):
        return jsonify(
            {
                "success": False,
                "message": "Invalid email or password.",
            }
        ), 401

    database.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"online": True}},
    )

    user["online"] = True

    access_token = create_access_token(
        identity=str(user["_id"])
    )

    return jsonify(
        {
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "user": serialize_user(user),
        }
    ), 200


@auth_blueprint.get("/profile")
@jwt_required()
def profile():
    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return jsonify(
            {
                "success": False,
                "message": "Invalid authentication token.",
            }
        ), 401

    database = get_database()
    user = database.users.find_one(
        {"_id": ObjectId(user_id)}
    )

    if user is None:
        return jsonify(
            {
                "success": False,
                "message": "User not found.",
            }
        ), 404

    return jsonify(
        {
            "success": True,
            "user": serialize_user(user),
        }
    ), 200


@auth_blueprint.post("/logout")
@jwt_required()
def logout():
    user_id = get_jwt_identity()

    if ObjectId.is_valid(user_id):
        database = get_database()
        database.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"online": False}},
        )

    return jsonify(
        {
            "success": True,
            "message": "Logout successful. Remove the token from the client.",
        }
    ), 200