package com.qkshop.tonkho.crm;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Gắn khách sau khi transaction ghi đơn đã commit; lỗi CRM chỉ ghi log, không ảnh hưởng bán hàng.
 * Đồng thời tự dựng CRM lần đầu từ dữ liệu đơn hàng hiện có, hoặc chỉ gắn các đơn mới chưa liên kết.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CrmLinkEventListener implements ApplicationRunner {

    private final CrmCustomerLinkService linkService;
    private final CrmCustomerRepository customerRepo;
    private final CrmOrderRepository orderRepo;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onOrderChanged(SalesOrderChangedEvent event) {
        try {
            linkService.linkOrder(event.orderId());
        } catch (DataIntegrityViolationException e) {
            try {
                linkService.linkOrder(event.orderId());
            } catch (Exception retryEx) {
                log.warn("[CRM] Không thể gắn khách cho đơn {} (sau khi thử lại): {}", event.orderId(), retryEx.getMessage());
            }
        } catch (Exception e) {
            log.warn("[CRM] Không thể gắn khách cho đơn {}: {}", event.orderId(), e.getMessage());
        }
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (customerRepo.count() == 0 && orderRepo.count() > 0) {
                log.info("[CRM] Chưa có dữ liệu khách hàng, bắt đầu dựng từ đơn hàng hiện có (chạy nền)...");
                CompletableFuture.runAsync(() -> {
                    try {
                        linkService.rebuildAll();
                    } catch (Exception e) {
                        log.error("[CRM] Dựng dữ liệu khách hàng ban đầu thất bại", e);
                    }
                });
            } else if (customerRepo.count() > 0) {
                // Chỉ gắn các đơn mới chưa có crmCustomerId thay vì tính lại toàn bộ khách hàng mỗi lần khởi động
                CompletableFuture.runAsync(() -> {
                    try {
                        List<Long> unlinkedIds = orderRepo.findUnlinkedCandidateOrders();
                        for (Long orderId : unlinkedIds) {
                            linkService.linkOrder(orderId);
                        }
                    } catch (Exception e) {
                        log.warn("[CRM] Tự động gắn các đơn hàng chưa liên kết khi khởi động: {}", e.getMessage());
                    }
                });
            }
        } catch (Exception e) {
            log.error("[CRM] Không thể kiểm tra dữ liệu CRM khi khởi động", e);
        }
    }
}
