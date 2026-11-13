FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app/backend
COPY backend/pom.xml .
COPY backend/src ./src
COPY frontend /app/frontend
RUN mvn -B -Dmaven.test.skip=true clean package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]