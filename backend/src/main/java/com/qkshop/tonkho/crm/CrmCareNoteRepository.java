package com.qkshop.tonkho.crm;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CrmCareNoteRepository extends JpaRepository<CrmCareNote, Long> {

    List<CrmCareNote> findByCustomer_IdOrderByCreatedAtDesc(Long customerId);

    List<CrmCareNote> findByCustomer_IdAndOrderIdOrderByCreatedAtDesc(Long customerId, Long orderId);

    long countByCustomer_Id(Long customerId);
}
