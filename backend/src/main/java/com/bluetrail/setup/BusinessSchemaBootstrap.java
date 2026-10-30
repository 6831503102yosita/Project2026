package com.bluetrail.setup;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class BusinessSchemaBootstrap {
  @Bean
  ApplicationRunner ensureBusinessTables(JdbcTemplate db) {
    return args -> {
      db.execute("CREATE TABLE IF NOT EXISTS event_change_history (id BIGINT AUTO_INCREMENT PRIMARY KEY, event_id BIGINT NOT NULL, changed_by VARCHAR(255), field_name VARCHAR(90) NOT NULL, old_value TEXT, new_value TEXT, changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX (event_id)) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS organizer_assignments (id BIGINT AUTO_INCREMENT PRIMARY KEY, request_id BIGINT NOT NULL, organizer_id BIGINT NOT NULL, note TEXT, status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED', created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX (request_id), INDEX (organizer_id)) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS quotations (id BIGINT AUTO_INCREMENT PRIMARY KEY, event_request_id BIGINT NOT NULL, quotation_number VARCHAR(60), revision INT NOT NULL DEFAULT 0, status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', subtotal DECIMAL(12,2) NOT NULL DEFAULT 0, discount DECIMAL(12,2) NOT NULL DEFAULT 0, tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0, total_amount DECIMAL(12,2) NOT NULL DEFAULT 0, admin_note TEXT, customer_note TEXT, created_by VARCHAR(255), created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), sent_at DATETIME(6), responded_at DATETIME(6), INDEX(event_request_id)) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS quotation_items (id BIGINT AUTO_INCREMENT PRIMARY KEY, quotation_id BIGINT NOT NULL, description VARCHAR(500) NOT NULL, quantity DECIMAL(12,2) NOT NULL, unit_price DECIMAL(12,2) NOT NULL, line_total DECIMAL(12,2) NOT NULL, sort_order INT NOT NULL DEFAULT 0, INDEX(quotation_id)) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS quotation_revisions (id BIGINT AUTO_INCREMENT PRIMARY KEY, quotation_id BIGINT NOT NULL, revision INT NOT NULL, snapshot_json LONGTEXT, created_by VARCHAR(255), created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE KEY uq_quotation_revision(quotation_id, revision)) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS quotation_documents (quotation_id BIGINT PRIMARY KEY, document_json LONGTEXT NOT NULL, CONSTRAINT fk_quotation_documents_quote FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS quotation_templates (id BIGINT PRIMARY KEY, template_json LONGTEXT, updated_by VARCHAR(255), updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS site_settings (setting_key VARCHAR(40) PRIMARY KEY, setting_value TEXT) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS legacy_event_imports (event_id BIGINT PRIMARY KEY, source_data LONGTEXT) ENGINE=InnoDB");
      db.execute("CREATE TABLE IF NOT EXISTS bluetrail_uploads (id BIGINT AUTO_INCREMENT PRIMARY KEY, owner_email VARCHAR(255) NOT NULL, event_request_id BIGINT, event_id BIGINT, file_name VARCHAR(255) NOT NULL, content_type VARCHAR(80) NOT NULL, file_data MEDIUMBLOB NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX(event_request_id), INDEX(event_id)) ENGINE=InnoDB");
      db.update("INSERT IGNORE INTO site_settings(setting_key,setting_value) VALUES ('hold','24')");
    };
  }
}
