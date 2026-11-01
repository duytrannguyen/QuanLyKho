package com.qkshop.tonkho.crm;

import com.qkshop.tonkho.salesreport.SalesOrder;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostUpdate;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * JPA entity listener: chỉ phát sự kiện (không truy vấn DB trong callback).
 * Việc gắn khách thực hiện sau khi transaction ghi đơn đã commit.
 */
@Component
@RequiredArgsConstructor
public class SalesOrderCrmListener {

    private final ApplicationEventPublisher eventPublisher;

    @PostPersist
    @PostUpdate
    public void onOrderSaved(SalesOrder order) {
        if (order != null && order.getId() != null) {
            eventPublisher.publishEvent(new SalesOrderChangedEvent(order.getId()));
        }
    }
}
