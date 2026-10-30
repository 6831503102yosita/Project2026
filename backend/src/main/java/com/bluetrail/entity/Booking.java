
package com.bluetrail.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Column(nullable = false, length = 30)
    private String status = "PENDING";

    @Column(nullable = false, updatable = false)
    private LocalDateTime bookingDate;

    // Existing bookings remain untouched. New reservations get a 30-minute deadline.
    @Column(name="payment_due_at")
    private LocalDateTime paymentDueAt;
    @Column(name="contact_name",length=100)
    private String contactName;
    @Column(name="contact_phone",length=30)
    private String contactPhone;
    @Column(name="contact_email",length=160)
    private String contactEmail;

    public Booking() {
    }

    @PrePersist
    public void onCreate() {
        bookingDate = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getBookingDate() {
        return bookingDate;
    }
    public LocalDateTime getPaymentDueAt(){return paymentDueAt;}
    public void setPaymentDueAt(LocalDateTime v){paymentDueAt=v;}
    public String getContactName(){return contactName;}
    public void setContactName(String v){contactName=v;}
    public String getContactPhone(){return contactPhone;}
    public void setContactPhone(String v){contactPhone=v;}
    public String getContactEmail(){return contactEmail;}
    public void setContactEmail(String v){contactEmail=v;}
}
