# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Publicly view activity rosters
- Staff-only student signup and unregister controls
- Staff login using environment-configured credentials

## Getting Started

1. From the repository root, install the dependencies:

   ```
   pip install -r requirements.txt
   ```

2. From the repository root, configure staff credentials and a session secret in the environment. Do not commit credentials to the repository:

   ```
   export STAFF_USERNAME=teacher
   export STAFF_PASSWORD='choose-a-strong-password'
   export SESSION_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
   ```

   Set `COOKIE_SECURE=true` when serving the application over HTTPS.

3. From the repository root, run the application:

   ```
   uvicorn app:app --app-dir src --reload
   ```

4. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| GET    | `/auth/me`                                                        | Check whether the current browser session is staff-authenticated    |
| POST   | `/auth/login`                                                     | Start a staff session                                               |
| POST   | `/auth/logout`                                                    | End the current session                                             |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Staff-only student signup                                          |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Staff-only student unregister                                    |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
