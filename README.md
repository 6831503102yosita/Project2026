# BlueTrail

## Tour and Event Management System

BlueTrail is a web application for booking tours and events and requesting customized event services. It brings service information, customer requirements, bookings, payment evidence, quotations and change records into one system.

This academic project is developed for **Software Requirements Analysis and Specification** and **Database Systems** at **Mae Fah Luang University**.

**Application URL:** https://bluetrail-494909691136.us-east1.run.app/

## Background

The project addresses a service provider's reliance on LINE Official Account for customer communication. Collecting customized event requirements takes approximately 1–2 days, and later changes can be difficult to trace across chat messages. Booking information and payment evidence also require manual coordination.

BlueTrail provides structured forms and centralized records to improve access to tour information, reduce repeated requirement collection and retain evidence of proposed changes and review decisions.

## User Roles and Features

### Visitor

- Browse published tours and events.
- Search services and filter categories.
- View descriptions, dates, locations, prices and available places.
- Register a customer account.

### Customer

- Log in and access their profile.
- Book available tours and events.
- Provide booking contact details and select a payment bank.
- View company bank account details and upload a payment slip.
- Track their booking and payment statuses.
- Submit customized event requirements.
- Review issued quotations and submit available responses.
- Submit event change requests and view change history.

### Administrator

- Create, view, update and manage tours and events.
- Review customer bookings and payment evidence.
- Approve or reject payment slips.
- Review customized event requests and proposed changes.
- Prepare and issue quotations.
- Assign event work to organizers.
- Use customer email notification actions for eligible decisions.

### Organizer

- View assigned work and agreed event requirements.
- Update work progress.
- Submit progress and completion reports.

## Main Workflows

### Published Tour or Event

1. Browse and select a service.
2. Log in, choose the number of participants and enter contact details.
3. Create a pending booking and review the payment details.
4. Transfer payment outside the application and upload a slip.
5. An administrator reviews the evidence and approves or rejects it.
6. The customer checks the updated booking and payment status.

New unpaid bookings use a **30-minute payment window**. Reservation expiry and payment review follow the booking's eligibility rules.

### Customized Event

1. The customer submits event requirements.
2. An administrator reviews the request and prepares a quotation.
3. The customer reviews the quotation and responds.
4. Proposed requirement changes are recorded for administrator review.
5. Agreed event work is assigned to an organizer.
6. The organizer views the requirements and reports progress.

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | HTML, CSS and JavaScript |
| Backend | Java and Spring Boot |
| Web API | Spring Web MVC |
| Authentication and authorization | Spring Security |
| Database access | Spring Data JPA and JDBC |
| Database | MySQL |
| Session persistence | Spring Session JDBC |
| Email | Spring Mail with SMTP |
| Application hosting | Google Cloud Run |
| Managed database | Google Cloud SQL for MySQL |
| Container build and storage | Cloud Build and Artifact Registry |

The Maven project configuration specifies Java 17. Use a JDK and Maven installation compatible with the committed `pom.xml`.

## Database Overview

The main business records include:

| Group | Main tables |
| --- | --- |
| Accounts and services | `users`, `events` |
| Bookings and payments | `bookings`, `payments`, `payment_slips` |
| Customized event requirements | `event_requests`, `event_request_changes`, `event_request_change_items` |
| Quotations | `quotations`, `quotation_items`, `quotation_revisions`, `quotation_documents`, `quotation_templates` |
| Organizer work | `organizer_assignments`, `organizer_work_reports` |
| Supporting records | `event_change_history`, `booking_email_outbox`, `bluetrail_uploads`, `booking_reviews`, `site_settings` |

Examples of relationships:

- A user can have multiple bookings and customized event requests.
- A booking belongs to one user and one published service.
- A payment belongs to a booking; private slip content is stored separately.
- A quotation belongs to a customized event request and has quotation items.
- An organizer assignment links a request to an organizer; progress reports reference the assignment.

Some supporting tables use application-managed references. Consult the ERD, Data Dictionary and deployed DDL to distinguish logical references from database-enforced foreign keys.

## Running Locally

### Prerequisites

- Git
- A compatible Java JDK
- Maven, or the Maven Wrapper if included in the repository
- A running MySQL server

### 1. Clone the Repository

```bash
git clone https://github.com/6831503102yosita/Project2026.git
cd Project2026
```

### 2. Prepare a Development Database

Create a separate local database and database user. The following SQL creates the database only:

```sql
CREATE DATABASE bluetrail_db
  CHARACTER SET utf8mb4;
```

Grant the development user the permissions required to create and update application tables. Do not use the production database for local development.

### 3. Configure the Backend

Provide connection settings through environment variables or a local configuration file that is excluded from Git.

For Bash or Zsh:

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/bluetrail_db'
export SPRING_DATASOURCE_USERNAME='your_local_database_user'
export SPRING_DATASOURCE_PASSWORD='your_local_database_password'
```

For a new development database, Hibernate can create or update the JPA-managed tables:

```bash
export SPRING_JPA_HIBERNATE_DDL_AUTO='update'
```

Use this schema setting for local development only. Supporting tables are initialized by the application's schema setup code when that code is present in the checked-out version.

### 4. Start the Application

From the directory containing the backend `pom.xml`:

```bash
cd backend
mvn spring-boot:run
```

If the Maven project is already at the repository root, run the Maven command there instead. The default local Spring Boot address is `http://localhost:8080`, unless the project configuration changes the port.

The production session configuration uses secure cookies. Testing authentication over local HTTP requires a development configuration that permits local cookies; retain secure cookies for HTTPS production hosting.

### 5. Build and Run Tests

From the same Maven project directory:

```bash
mvn test
mvn clean package
```

These commands are provided for contributors. This README does not assert that every test passes in every environment.

## Email Configuration

Email delivery requires valid SMTP settings in the running backend. Supply these through deployment secrets or local environment configuration:

- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH`
- `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE`

Use the SMTP provider's required values and credentials. Sending an email successfully to the provider does not guarantee inbox placement. Verify receipt and duplicate-send behavior as part of acceptance testing.

Do not commit database credentials, SMTP passwords, private keys, customer data or real payment slips.

## Deployment

The application is hosted as a container on Google Cloud Run and connects to MySQL on Cloud SQL. Cloud Build builds the application image, which is stored in Artifact Registry.

Deployment configuration must provide the correct database connection, database access permissions and SMTP secrets. The running Cloud Run revision should be checked after deployment to confirm that the intended version is serving traffic.

## Scope and Limitations

- Payments are made outside BlueTrail and verified manually by an administrator.
- Displaying a bank account does not mean that a bank API or payment gateway is connected.
- Automatic bank verification and automatic refunds are outside the project scope.
- Issuing a quotation makes it available in the application; an emailed PDF attachment is not assumed.
- Thai and English interface options are part of the UI requirements. User-entered text is not automatically translated.
- The SRS describes required behavior. Acceptance testing is still needed to demonstrate compliance of a particular deployed release.

## Project Documentation

The project documentation includes:

- Software Requirements Specification
- Business workflow
- Role-based use case diagram
- Navigation structure and sitemap
- Entity Relationship Diagram
- Data Dictionary
- Functional and non-functional acceptance criteria

Add the finalized documents to a `docs/` directory in this repository so reviewers can access them alongside the source code.

## Team Members

| Student ID | Name |
| --- | --- |
| 6831503068 | Rapkhuan Supawan |
| 6831503075 | Suthada Sirinaphaphen |
| 6831503100 | Patchaporn Chuangchotchanalai |
| 6831503102 | Yosita Prabpala |
| 6831503105 | Sayamol Aenpanya |

**School of Applied Digital Technology, Mae Fah Luang University**

## Contributor Evidence

Each member should commit their own work using an identity linked to their GitHub account. The project submission includes source code, this README and attributable contribution history, as required by the course guidelines.

## Generative AI Usage

ChatGPT was used to assist with requirement wording, documentation, diagram drafting and code-related explanations. The team is responsible for reviewing generated content, verifying implementation behavior and understanding the submitted work.
