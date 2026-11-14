# BlueTrail: Tour and Event Management System

**Group 5 — Software Requirements Analysis and Specification**  
**School of Applied Digital Technology, Mae Fah Luang University**

## 1. Project Overview

BlueTrail is a web-based Tour and Event Management System designed to support reservations for published tours and events and the coordination of customized event services. The system provides a centralized platform through which customers can browse services, create bookings, upload payment evidence, submit customized event requirements, review quotations, and track changes to their requests. Administrators manage tours and events, booking records, payment verification, quotations, customer requests, and organizer assignments. Assigned organizers can access their event information and record work progress. The project uses a Java Spring Boot backend, a MySQL database, and a web frontend.

## 2. Group Members — Group 5

| Student ID | Full Name |
|---|---|
| 6831503068 | Rapkhuan Supawan |
| 6831503075 | Suthada Sirinaphaphen |
| 6831503100 | Patchaporn Chuangchotchanalai |
| 6831503102 | Yosita Prabpala |
| 6831503105 | Sayamol Aenpanya |

## 3. Individual Contributions

The following responsibilities reflect the group's allocation of work. Frontend development, backend development, system integration, and the main implementation tasks were undertaken collaboratively by the three development contributors. Detailed authorship of commits is available in the repository's Git history.

| Student ID | Full Name | Responsibilities |
|---|---|---|
| 6831503068 | Rapkhuan Supawan | Preparation, editing, and review of the Software Requirements Specification (SRS) documentation. |
| 6831503075 | Suthada Sirinaphaphen | Collaborative frontend and backend development; integration of application components; implementation of core project functionality; and preparation and review of project documentation, including the SRS. |
| 6831503100 | Patchaporn Chuangchotchanalai | Collaborative frontend and backend development; integration of application components; implementation of core project functionality; and preparation and review of project documentation, including the SRS. |
| 6831503102 | Yosita Prabpala | Collaborative frontend and backend development; integration of application components; implementation of core project functionality; and preparation and review of project documentation, including the SRS. |
| 6831503105 | Sayamol Aenpanya | Preparation, editing, and review of the Software Requirements Specification (SRS) documentation. |

## 4. Main Features

### Visitor and Customer
- Browse and search published tours and events.
- Register, sign in, and view service details.
- Make reservations and monitor booking and payment status.
- Upload payment evidence for administrator review.
- Submit requirements for customized events.
- Review and respond to quotations.
- Submit event change requests and review change history.

### Administrator
- Create and maintain published tour and event listings.
- Review bookings and approve or reject payment evidence.
- Review customized event requests and manage quotations.
- Review event change requests and retain change records.
- Assign eligible customized events to organizers.
- Send supported customer notifications through the configured email service.

### Organizer
- View assigned events and associated requirements.
- Report work status, completion percentage, and progress notes.

## 5. Technology Stack

| Component | Technology |
|---|---|
| Backend | Java, Spring Boot, Spring Data JPA |
| Build Tool | Apache Maven |
| Database | MySQL |
| Frontend | Web application in `frontend/` |
| Version Control | Git and GitHub |

## 6. Repository Structure

The following layout reflects the project's previously documented separation of frontend and backend components. Confirm the current contents of the repository before submission.

```text
Bluetrail/
├── README.md
├── backend/                # Spring Boot application and pom.xml
│   ├── pom.xml
│   └── src/
├── frontend/               # Web frontend
└── legacy/                 # Earlier project files, if retained
```

**Maven project location:** The Spring Boot `pom.xml` is located in `backend/`, rather than at the repository root. Therefore, Maven commands must be executed from `backend/` as shown below.

## 7. Prerequisites

Install and configure the following tools as applicable to the project:

- Java Development Kit compatible with the version specified in `backend/pom.xml` (the earlier project configuration targeted Java 17).
- Apache Maven, or the included Maven Wrapper if present.
- MySQL Server.
- Git.
- Node.js and npm, if required by `frontend/package.json`.

## 8. Installation and Execution

### Step 1 — Clone the repository

```bash
git clone https://github.com/6831503102yosita/Bluetrail.git
cd Bluetrail
```

### Step 2 — Configure MySQL

Start MySQL and create the application database if it has not already been created:

```sql
CREATE DATABASE IF NOT EXISTS bluetrail_db;
```

Configure database connectivity according to `backend/src/main/resources/application.properties` or the applicable application configuration. For example, Spring Boot can read the following environment variables:

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/bluetrail_db'
export SPRING_DATASOURCE_USERNAME='YOUR_MYSQL_USERNAME'
export SPRING_DATASOURCE_PASSWORD='YOUR_MYSQL_PASSWORD'
```

Replace the placeholders with credentials for your own local database. Additional environment variables or initial data may be required by the current configuration. **Never commit real database passwords, tokens, or other secrets.**

### Step 3 — Start the Spring Boot backend

From the repository root:

```bash
cd backend
mvn spring-boot:run
```

If Maven is not installed and the repository contains the Maven Wrapper, use `./mvnw spring-boot:run` on macOS/Linux or `mvnw.cmd spring-boot:run` on Windows.

The backend typically uses `http://localhost:8080` unless another port is specified. Confirm its actual port in the startup output.

### Step 4 — Start the frontend

Open a **separate terminal** at the repository root. If `frontend/package.json` provides an npm development script, run:

```bash
cd frontend
npm install
npm run dev
```

Open the address reported by the frontend server. If the frontend does not have an npm development script, follow its actual build or launch configuration instead. Ensure the frontend is configured to communicate with the backend.

### Step 5 — Access the application

Customers may create an account through the registration interface. Administrator and organizer accounts depend on the project's role assignment and account setup. Test credentials are intentionally not published in this document; the lecturer should be provided with safe, non-production test access separately if required.

## 9. Build and Verification

Run the following commands from `backend/` to compile and test the Spring Boot application:

```bash
mvn test
mvn clean package
```

A successful command should report `BUILD SUCCESS`. These commands document the intended verification procedure and do not constitute a claim that the latest repository version has already passed testing. Ensure the required database and environment configuration are available when executing integration tests or starting the application.

## 10. Booking and Payment Workflow

Customers can attach payment evidence when creating a booking or upload it within 30 minutes after booking creation. The documented supported file formats are JPEG and PNG, with a maximum size of 5,000,000 bytes. Evidence submitted within the allowed period remains pending manual administrator verification. Payment gateway integration and automatic bank-payment verification are outside the scope of this release.

## 11. Security and Configuration

Do not store real passwords, access tokens, API keys, or SMTP credentials in the repository. Use environment variables or local configuration that is excluded from version control. Before submission, review both tracked files and Git history for exposed secrets.

## 12. Submission Information

**Group:** Group 5  
**Repository URL:** https://github.com/6831503102yosita/Bluetrail

Every Group 5 member must submit **the same repository URL** through the course assignment and select **Turn in** individually. The repository must be accessible to the lecturer, either as a public repository or by providing the lecturer (`cnacha-mfu`) with collaborator access. The assessed version is the latest commit on the `main` branch before the deadline. Each member's contributions should be supported by genuine Git history, including documentation commits where applicable.
