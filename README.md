# BlueTrail: Tour and Event Management System

## Project Overview

BlueTrail is a web-based Tour and Event Management System supporting published tour and event bookings and customized event coordination.

Customers can browse services, make reservations, submit payment evidence, request customized events, review quotations, and track requirement changes.

Administrators manage services, bookings, payment verification, quotations, event requests, change requests, and organizer assignments. Assigned organizers can view event requirements and report work progress.

The application uses a Java Spring Boot backend, MySQL, and an HTML, CSS, and JavaScript frontend served by Spring Boot.

## Group Members

| Student ID | Full Name |
|---|---|
| 6831503068 | Rapkhuan Supawan |
| 6831503075 | Suthada Sirinaphaphen |
| 6831503100 | Patchaporn Chuangchotchanalai |
| 6831503102 | Yosita Prabpala |
| 6831503105 | Sayamol Aenpanya |

## Individual Contributions

The responsibilities below reflect the group's stated allocation of work. File changes and commit authors can be reviewed in the Git history.

| Student ID | Full Name | Responsibilities |
|---|---|---|
| 6831503068 | Rapkhuan Supawan | Preparation and review of the Software Requirements Specification (SRS). |
| 6831503075 | Suthada Sirinaphaphen | Collaborative frontend and backend development, integration, core functionality, and project documentation, including the SRS. |
| 6831503100 | Patchaporn Chuangchotchanalai | Collaborative frontend and backend development, integration, core functionality, and project documentation, including the SRS. |
| 6831503102 | Yosita Prabpala | Collaborative frontend and backend development, integration, core functionality, and project documentation, including the SRS. |
| 6831503105 | Sayamol Aenpanya | Preparation and review of the Software Requirements Specification (SRS). |

## Main Features

### Visitors and Customers

- Browse and search tours and events.
- Register and sign in.
- View service details.
- Create bookings and track payment deadlines and statuses.
- Upload payment evidence for administrator verification.
- Submit customized event requirements.
- Review and respond to quotations.
- Submit event change requests and view change history.
- View booking email delivery status and request a resend.

### Administrators

- Create and edit tour and event listings.
- Open or close bookings.
- View listing change history.
- Delete eligible listings without linked records.
- Review bookings and approve or reject payment evidence.
- Manage customized event requests and quotations.
- Review change requests.
- Assign confirmed customized events to organizers.
- Send payment confirmation notifications through the configured email service.

### Organizers

- View assigned events and requirements.
- Record work status, completion percentage, and progress notes.

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Java 17, Spring Boot, Spring Data JPA |
| Build | Maven Wrapper |
| Database | MySQL 8.4 for local Docker setup |
| Frontend | HTML, CSS, JavaScript |
| Local Containers | Docker Compose |
| Deployment | Google Cloud Build, Artifact Registry, Cloud Run |
| Version Control | Git and GitHub |

## Repository Structure

```text
Project2026/
├── README.md
├── compose.local.yaml
├── .dockerignore
├── backend/
│   ├── pom.xml
│   ├── mvnw
│   ├── Dockerfile
│   └── src/
│       ├── main/
│       └── test/
├── frontend/
│   ├── index.html
│   ├── assets/
│   ├── css/
│   └── js/
└── legacy/
```

The Maven project is located in `backend/`.

The commands below run from the repository root and use:

```bash
./backend/mvnw -f backend/pom.xml
```

The canonical frontend source is `frontend/`. Maven copies its contents into the application's static resources during the build. Spring Boot serves the frontend and API together; a separate npm development server is not required.

## Prerequisites

- JDK 17.
- Docker with Docker Compose v2.
- Git.
- Internet access for downloading Maven dependencies and container images.

A separate Maven installation is unnecessary when using the Maven Wrapper.

The commands below use Bash, as available in GitHub Codespaces and Linux.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/6831503102yosita/Project2026.git
cd Project2026
```

If the Maven Wrapper is not executable:

```bash
chmod +x backend/mvnw
```

### 2. Set local database passwords

Run these commands in the terminal where you will start the database and application:

```bash
read -rsp "Local DB password: " BT_LOCAL_DB_PASSWORD
echo
export BT_LOCAL_DB_PASSWORD

read -rsp "Local root password: " BT_LOCAL_ROOT_PASSWORD
echo
export BT_LOCAL_ROOT_PASSWORD
```

These are credentials for the local Docker database, separate from Google Cloud credentials.

For a new database volume, choose your own passwords. For an existing volume, use the passwords originally used to initialize it. Changing environment variables does not reset an existing MySQL user's password.

Do not commit passwords to Git.

### 3. Start MySQL

```bash
docker compose -f compose.local.yaml up -d --wait db
```

Check its status:

```bash
docker compose -f compose.local.yaml ps
```

The database should report `healthy`.

Docker initializes the `bluetrail_db` database and the `bluetrail` database user when creating a new database volume.

MySQL is exposed locally at `127.0.0.1:3306`.

## Run Locally

Choose either the Maven method or the Docker Compose method.

### Option A: Run with Maven

After starting MySQL, set these variables in the same terminal:

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://127.0.0.1:3306/bluetrail_db?allowPublicKeyRetrieval=true&useSSL=false'
export SPRING_DATASOURCE_USERNAME=bluetrail
export SPRING_DATASOURCE_PASSWORD="$BT_LOCAL_DB_PASSWORD"
```

Build and test:

```bash
./backend/mvnw -f backend/pom.xml clean package
```

Start the application:

```bash
./backend/mvnw -f backend/pom.xml spring-boot:run
```

Open:

```text
http://localhost:8080
```

In Codespaces, use the Ports panel to open port `8080`.

Confirm the actual application port in the startup logs if configuration overrides the default.

### Option B: Run with Docker Compose

With the local database password variables set:

```bash
docker compose -f compose.local.yaml up -d --build --wait
```

Open:

```text
http://localhost:8082
```

In Codespaces, use the Ports panel to open port `8082`.

View application logs:

```bash
docker compose -f compose.local.yaml logs -f app
```

Stop the containers:

```bash
docker compose -f compose.local.yaml down
```

Named volumes retain database and uploaded-file data after this command. Removing volumes deletes their stored data.

## Build and Tests

Run the complete test suite and build the executable JAR:

```bash
./backend/mvnw -f backend/pom.xml clean package
```

The application context test requires an accessible database and the datasource variables documented above.

The generated JAR is located at:

```text
backend/target/backend-0.0.1-SNAPSHOT.jar
```

Run the packaged application with the datasource variables still set:

```bash
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
```

For test failures, inspect the reports in:

```text
backend/target/surefire-reports/
```

Example:

```bash
grep -nE -A 35 'FAILURE|ERROR|Caused by:' backend/target/surefire-reports/*.txt
```

A successful build verifies the configured automated tests and packaging. Browser workflows and external email delivery require separate verification.

## Accounts and Roles

Customers can register through the website.

Administrator and organizer access requires the corresponding role to be assigned through the project's account-management process.

No account passwords are published in this README.

## Booking and Payment Workflow

1. The customer signs in and selects a service open for booking.
2. The customer enters quantity, contact details, and the receiving bank.
3. The server checks availability and calculates the total using the stored event price.
4. A pending booking reserves the requested seats and receives a 30-minute payment deadline.
5. The customer uploads payment evidence before the deadline.
6. An administrator reviews the evidence and approves or rejects it.
7. Approved payments confirm the booking.
8. Eligible unpaid bookings expire and release their reserved seats.

Payment-slip uploads support JPEG, PNG, and WebP, with a maximum size of 5,000,000 bytes.

Submitted evidence awaiting administrator review prevents automatic expiry under the current expiry rules.

The system uses manual payment verification. It does not include a payment gateway or automatic verification with a bank.

The expiry task runs inside the application. Deployment CPU allocation and instance availability must be considered when verifying expiry timing on Cloud Run.

## Booking Email Notifications

Booking notifications use the contact email supplied for the booking.

Notifications are queued in a database outbox. Delivery requires an enabled and correctly configured SMTP service.

| Environment Variable | Purpose |
|---|---|
| `BLUETRAIL_MAIL_ENABLED` | Set to `true` to enable delivery |
| `BLUETRAIL_SMTP_HOST` | SMTP server hostname |
| `BLUETRAIL_SMTP_PORT` | SMTP port; default `587` |
| `BLUETRAIL_SMTP_USERNAME` | SMTP authentication username |
| `BLUETRAIL_SMTP_PASSWORD` | SMTP authentication password |
| `BLUETRAIL_MAIL_FROM` | Sender email address |
| `BLUETRAIL_SMTP_SSL` | Enable implicit TLS when required; default `false` |

When implicit TLS is disabled, the sender requires STARTTLS.

Delivery failures are retried by the outbox process. Request-driven delivery is also available through the booking email endpoints.

A `SENT` outbox status means the SMTP send operation succeeded; it does not guarantee placement in the recipient's inbox. Check spam folders and provider delivery information when investigating missing messages.

## Security and Configuration

- Keep database passwords, SMTP credentials, API tokens, and other secrets out of Git.
- Supply credentials through environment variables or a secret-management service.
- Role and ownership checks restrict access to protected application functions.
- State-changing requests use the application's CSRF protection.
- Payment evidence is restricted to authorized users.
- Verify access control and important workflows before submission.

The `useSSL=false` datasource examples are for the local Docker setup. Production database connections require configuration appropriate to the deployed environment.

## Google Cloud Deployment

The application is deployed using Cloud Build, Artifact Registry, and Cloud Run.

**Application URL:**

https://bluetrail-494909691136.us-east1.run.app

The backend Dockerfile builds both the backend and the frontend resources. Its build context must be the repository root.

Deployments must retain the required database, session, upload-storage, and SMTP configuration.

Updating GitHub does not update a manually deployed Cloud Run service automatically. Build a new container image and deploy it to publish changes.

## Manual Verification

Before submission, verify:

- Thai and English display text.
- Customer registration and sign-in.
- Listing creation, editing, and opening or closing bookings.
- Booking creation and seat availability.
- Payment-slip upload.
- Administrator payment approval and rejection.
- Booking notifications sent to the booking contact email.
- Duplicate confirmation handling.
- Customized event requests and quotation responses.
- Event change history.
- Organizer assignment and progress reporting.
- Access restrictions between users and roles.

Use clearly marked test payment images rather than real financial information.

## Submission Information

**Repository URL:**

https://github.com/6831503102yosita/Project2026

Each group member must submit the required repository URL individually according to the course instructions.

Ensure the repository is accessible to the lecturer.

Contributions should reflect genuine work. Documentation contributions can be committed under the relevant member's own account.

Confirm the submission deadline and required branch with the assignment instructions.