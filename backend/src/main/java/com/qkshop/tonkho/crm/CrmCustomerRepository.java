package com.qkshop.tonkho.crm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CrmCustomerRepository extends JpaRepository<CrmCustomer, Long> {

    Optional<CrmCustomer> findByPhoneNormalized(String phoneNormalized);

    List<CrmCustomer> findByPhoneNormalizedIn(Collection<String> phones);

    /** Tìm theo SĐT hoặc tên; kw rỗng nghĩa là lấy tất cả. */
    @Query("""
        SELECT c FROM CrmCustomer c
        WHERE :kw = ''
           OR c.phoneNormalized LIKE CONCAT('%', :kw, '%')
           OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :kw, '%'))
        """)
    Page<CrmCustomer> search(@Param("kw") String kw, Pageable pageable);
}
