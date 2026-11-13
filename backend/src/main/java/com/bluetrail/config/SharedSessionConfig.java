package com.bluetrail.config;

import javax.sql.DataSource;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.session.jdbc.config.annotation.web.http.EnableJdbcHttpSession;
import org.springframework.session.web.http.DefaultCookieSerializer;

/** Shared login and CSRF state survives instance replacement and scale-out. */
@Configuration
@EnableJdbcHttpSession(maxInactiveIntervalInSeconds = 3600, tableName = "BT_HTTP_SESSION")
public class SharedSessionConfig {
    @Bean
    public InitializingBean blueTrailSessionSchema(DataSource dataSource) {
        return () -> initializeSchema(new JdbcTemplate(dataSource));
    }

    public static void initializeSchema(JdbcTemplate jdbc) {
        // Add only session tables. Existing bookings, users and payments are untouched.
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS BT_HTTP_SESSION (
              PRIMARY_ID CHAR(36) NOT NULL PRIMARY KEY,
              SESSION_ID CHAR(36) NOT NULL,
              CREATION_TIME BIGINT NOT NULL,
              LAST_ACCESS_TIME BIGINT NOT NULL,
              MAX_INACTIVE_INTERVAL INT NOT NULL,
              EXPIRY_TIME BIGINT NOT NULL,
              PRINCIPAL_NAME VARCHAR(100),
              UNIQUE KEY BT_HTTP_SESSION_IX1 (SESSION_ID),
              KEY BT_HTTP_SESSION_IX2 (EXPIRY_TIME),
              KEY BT_HTTP_SESSION_IX3 (PRINCIPAL_NAME)
            ) ENGINE=InnoDB ROW_FORMAT=DYNAMIC
            """);
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS BT_HTTP_SESSION_ATTRIBUTES (
              SESSION_PRIMARY_ID CHAR(36) NOT NULL,
              ATTRIBUTE_NAME VARCHAR(200) NOT NULL,
              ATTRIBUTE_BYTES BLOB NOT NULL,
              PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
              CONSTRAINT BT_HTTP_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID)
                REFERENCES BT_HTTP_SESSION(PRIMARY_ID) ON DELETE CASCADE
            ) ENGINE=InnoDB ROW_FORMAT=DYNAMIC
            """);
    }

    @Bean
    public DefaultCookieSerializer cookieSerializer() {
        DefaultCookieSerializer cookie = new DefaultCookieSerializer();
        cookie.setCookieName("BTSESSION");
        cookie.setCookiePath("/");
        cookie.setUseHttpOnlyCookie(true);
        cookie.setUseSecureCookie(true);
        cookie.setSameSite("Lax");
        return cookie;
    }
}
