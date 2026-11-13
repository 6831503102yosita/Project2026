package com.bluetrail.entity;

import jakarta.persistence.*;

/** Private slip bytes, loaded only by the authorized slip endpoint. */
@Entity
@Table(name = "payment_slips")
public class PaymentSlip {
    @Id
    private Long id;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Lob
    @Column(name = "file_data", nullable = false, columnDefinition = "MEDIUMBLOB")
    private byte[] data;

    protected PaymentSlip() {}

    public PaymentSlip(Payment payment, byte[] data) {
        this.payment = payment;
        this.data = data;
    }

    public byte[] getData() { return data; }
}
