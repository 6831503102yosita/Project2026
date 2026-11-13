# BlueTrail: Tour and Event Management System

## Project Overview

BlueTrail is a web-based Tour and Event Management System developed to support the booking of published tours and events and the coordination of customized event services. The system provides customers with a centralized platform to browse available services, make reservations, submit payment evidence, request customized events, review quotations, and track changes to event requirements. Administrators manage service information, bookings, payment verification, quotations, event requests, and organizer assignments. Assigned organizers can access event details and report work progress. The project comprises a Java Spring Boot backend, a MySQL database, and a separate web frontend.

## Group Members

| Student ID | Full Name |
|---|---|
| 6831503068 | Rapkhuan Supawan |
| 6831503075 | Suthada Sirinaphaphen |
| 6831503100 | Patchaporn Chuangchotchanalai |
| 6831503102 | Yosita Prabpala |
| 6831503105 | Sayamol Aenpanya |

## Individual Contributions

The following responsibilities reflect the group's stated allocation of work. Software development activities were undertaken collaboratively by the three members indicated below; contributions to individual files can be examined in the Git commit history.

| Student ID | Full Name | Responsibilities |
|---|---|---|
| 6831503068 | Rapkhuan Supawan | Preparation and review of the Software Requirements Specification (SRS) documentation. |
| 6831503075 | Suthada Sirinaphaphen | Collaborative frontend and backend development, integration of application components, implementation of core project functionality, and preparation and review of project documentation, including the SRS. |
| 6831503100 | Patchaporn Chuangchotchanalai | Collaborative frontend and backend development, integration of application components, implementation of core project functionality, and preparation and review of project documentation, including the SRS. |
| 6831503102 | Yosita Prabpala | Collaborative frontend and backend development, integration of application components, implementation of core project functionality, and preparation and review of project documentation, including the SRS. |
| 6831503105 | Sayamol Aenpanya | Preparation and review of the Software Requirements Specification (SRS) documentation. |

## Main Features

### Visitor and Customer

- Browse and search available tours and events.
- Register, sign in, and view service details.
- Create bookings and view booking and payment statuses.
- Upload payment evidence for administrator verification.
- Submit requirements for customized events.
- Review and respond to event quotations.
- Submit event change requests and view change history.

### Administrator

- Create and manage tour and event listings.
- Review bookings and verify submitted payment evidence.
- Review customized event requests and manage quotations.
- Review event change requests and maintain change records.
- Assign confirmed customized events to organizers.
- Send relevant customer notifications through the configured email service.

### Organizer

- View assigned events and their requirements.
- Record work status, completion percentage, and progress notes.

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Java, Spring Boot, Spring Data JPA |
| Build Tool | Apache Maven |
| Database | MySQL |
| Frontend | Web application located in `frontend/` |
| Version Control | Git and GitHub |

## Repository Structure

```text
Project2026/
├── README.md
├── backend/                 # Spring Boot project; contains pom.xml
├── frontend/                # Frontend application
└── legacy/                  # Earlier project files, if retained
```

**Important:** The Maven project file, `pom.xml`, is located in `backend/`, not at the repository root. Run all Maven commands from the `backend/` directory.

## Prerequisites

Before running the project, install and configure:

1. A Java Development Kit compatible with `backend/pom.xml` (Java 17 source compatibility).
2. Apache Maven.
3. MySQL Server.
4. Node.js and npm if the frontend requires them (refer to `frontend/package.json`).

## Installation and Execution

### Step 1 — Clone the repository

```bash
git clone https://github.com/6831503102yosita/Project2026.git
cd Project2026
```

### Step 2 — Set up the database

Start MySQL and create the application database:

```sql
CREATE DATABASE IF NOT EXISTS bluetrail_db;
```

Configure the database connection for the Spring Boot application. The following environment variables provide an example for a local MySQL installation:

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/bluetrail_db'
export SPRING_DATASOURCE_USERNAME='YOUR_MYSQL_USERNAME'
export SPRING_DATASOURCE_PASSWORD='YOUR_MYSQL_PASSWORD'
```

Replace the placeholder values with credentials from your own environment. Review `backend/src/main/resources/application.properties` or the corresponding YAML configuration for any additional project-specific requirements. **Do not commit database credentials or other secrets.**

### Step 3 — Run the Spring Boot backend

From the repository root:

```bash
cd backend
mvn spring-boot:run
```

The default Spring Boot address is `http://localhost:8080`, unless the application configuration specifies a different port. Confirm the actual address in the startup output.

### Step 4 — Run the frontend

Open a second terminal in the repository root. If the frontend is configured as an npm project, run:

```bash
cd frontend
npm install
npm run dev
```

Open the address displayed by the frontend development server. If the frontend uses a different start command, follow the scripts in `frontend/package.json`. Ensure that the frontend's API configuration points to the running backend.

### Step 5 — Access the system

Customer accounts may be created through the registration interface. Administrator and organizer access depends on role assignment and any accounts configured for the project. No usernames or passwords are published in this README.

## Build and Verification

To compile and test the backend, open a terminal in `backend/` and execute:

```bash
mvn test
mvn clean package
```

These commands describe the intended verification procedure; they do not, by themselves, certify a successful build. The application should be tested using the documented database and environment configuration before submission.

## Booking and Payment Workflow

Customers may provide payment evidence when creating a booking or within 30 minutes of booking creation. Supported payment-slip formats are JPEG and PNG, with a maximum file size of 5,000,000 bytes. Evidence submitted within the permitted time remains pending manual administrator verification. The current project scope does not include an integrated payment gateway or automatic bank-payment verification.

## Security and Configuration

Application passwords, database credentials, API tokens, and SMTP credentials must not be committed to this repository. Use environment variables or appropriately ignored local configuration files. Review both the current files and Git history to ensure that sensitive information has not been exposed.

## Submission Information

**Repository URL:** https://github.com/6831503102yosita/Project2026

Each group member must submit the same repository URL individually through the course assignment. The repository must be accessible to the lecturer, either publicly or through collaborator access. The version assessed is the latest commit on the `main` branch before the submission deadline. Individual contributions must be represented by genuine Git commits made under each member's own account, including commits for documentation work where applicable.
