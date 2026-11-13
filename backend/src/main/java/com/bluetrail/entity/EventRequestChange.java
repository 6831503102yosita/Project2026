package com.bluetrail.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_request_changes")
public class EventRequestChange {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Version
    public Long version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_request_id", nullable = false)
    public EventRequest eventRequest;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String details;


    @Embeddable
    public static class ChangeItem {
        public String fieldName;
        @Column(columnDefinition = "TEXT")
        public String oldValue;
        @Column(columnDefinition = "TEXT")
        public String newValue;
        public ChangeItem() {}
    }

    @ElementCollection
    @CollectionTable(name = "event_request_change_items",
        joinColumns = @JoinColumn(name = "change_id"))
    @OrderColumn(name = "item_order")
    public java.util.List<ChangeItem> items = new java.util.ArrayList<>();

    public String fieldName;

    @Column(columnDefinition = "TEXT")
    public String oldValue;

    @Column(columnDefinition = "TEXT")
    public String newValue;

    @Column(nullable = false, length = 20)
    public String status = "PENDING";

    @Column(columnDefinition = "TEXT")
    public String adminNote;

    public String reviewedBy;

    @Column(nullable = false)
    public LocalDateTime createdAt;

    public LocalDateTime reviewedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneOffset.UTC);
    }
}
