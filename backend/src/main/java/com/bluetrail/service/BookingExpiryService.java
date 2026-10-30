package com.bluetrail.service;

import com.bluetrail.entity.Booking;
import com.bluetrail.entity.Event;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

/** Releases only unpaid reservations created with a payment deadline. */
@Service
public class BookingExpiryService {
    @PersistenceContext private EntityManager em;
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void expireUnpaid(){
        List<Long> ids=em.createQuery("select b.id from Booking b where b.status='PENDING' and b.paymentDueAt is not null and b.paymentDueAt<=:now",Long.class)
            .setParameter("now", LocalDateTime.now()).getResultList();
        for(Long id:ids){
            Booking booking=em.find(Booking.class,id,LockModeType.PESSIMISTIC_WRITE);
            if(booking==null||!"PENDING".equals(booking.getStatus())||booking.getPaymentDueAt()==null||booking.getPaymentDueAt().isAfter(LocalDateTime.now()))continue;
            Long submitted=em.createQuery("select count(p) from Payment p where p.booking.id=:id and p.status in ('PENDING','APPROVED')",Long.class)
              .setParameter("id",id).getSingleResult();
            if(submitted>0)continue; // Never expire a payment awaiting admin review.
            Event event=em.find(Event.class,booking.getEvent().getId(),LockModeType.PESSIMISTIC_WRITE);
            booking.setStatus("EXPIRED");
            if(event!=null)event.setAvailableSeats(Math.min(event.getTotalSeats(),event.getAvailableSeats()+booking.getQuantity()));
        }
    }
}
