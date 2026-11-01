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
 * Đồng thời tự dựng CRM lần đầu từ dữ liệu đơn hàng hiện có.
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
            // Hai đơn cùng SĐT mới được ghi đồng thời: thử lại 1 lần, lúc này khách đã tồn tại
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
                // Tự động rà soát lại chỉ số các khách hàng để loại bỏ đơn bán kèm PK-KEM khỏi totalOrders
                CompletableFuture.runAsync(() -> {
                    try {
                        List<CrmCustomer> all = customerRepo.findAll();
                        for (CrmCustomer c : all) {
                            linkService.recalculateCustomer(c.getId());
                        }
                    } catch (Exception e) {
                        log.warn("[CRM] Tự động cập nhật lại chỉ số khách hàng: {}", e.getMessage());
                    }
                });
            }
        } catch (Exception e) {
            log.error("[CRM] Không thể kiểm tra dữ liệu CRM khi khởi động", e);
        }
    }
}
