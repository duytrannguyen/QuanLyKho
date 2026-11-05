package com.qkshop.tonkho.crm;

import com.qkshop.tonkho.salesreport.SalesOrder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Gắn đơn hàng (sales_orders) vào hồ sơ khách hàng CRM theo SĐT chuẩn hóa
 * và tính lại các chỉ số tổng hợp của khách trực tiếp từ DB.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrmCustomerLinkService {

    private static final int REBUILD_PAGE_SIZE = 500;
    private static final int RECALC_BATCH_SIZE = 50;

    private final CrmCustomerRepository customerRepo;
    private final CrmOrderRepository orderRepo;
    private final CrmCareNoteRepository careNoteRepo;
    private final PlatformTransactionManager transactionManager;

    private final AtomicBoolean rebuilding = new AtomicBoolean(false);

    /**
     * Gắn một đơn vào khách tương ứng. Chạy trong transaction riêng để không ảnh hưởng luồng bán hàng.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void linkOrder(Long orderId) {
        SalesOrder order = orderRepo.findById(orderId).orElse(null);
        if (order == null) return;

        Long oldCustomerId = order.getCrmCustomerId();
        String phone = PhoneNormalizer.normalize(order.getCustomerPhone());
        Long newCustomerId = null;
        if (phone != null) {
            newCustomerId = ensureCustomer(phone, order.getCustomerName()).getId();
        }

        if (!Objects.equals(oldCustomerId, newCustomerId)) {
            if (newCustomerId == null) {
                orderRepo.clearCustomer(List.of(orderId));
            } else {
                orderRepo.assignCustomer(newCustomerId, List.of(orderId));
            }
        }

        if (newCustomerId != null) recalculateCustomer(newCustomerId);
        if (oldCustomerId != null && !oldCustomerId.equals(newCustomerId)) recalculateCustomer(oldCustomerId);
    }

    /**
     * Tính lại chỉ số khách từ DB. Khách không còn đơn nào sẽ bị xóa (xóa kèm ghi chú chăm sóc trước để không lỗi FK).
     * Phải được gọi trong một transaction đang hoạt động.
     */
    @Transactional(rollbackFor = Exception.class)
    public void recalculateCustomer(Long customerId) {
        CrmCustomer customer = customerRepo.findById(customerId).orElse(null);
        if (customer == null) return;

        if (orderRepo.countByCrmCustomerId(customerId) == 0) {
            if (careNoteRepo != null) {
                careNoteRepo.deleteByCustomerId(customerId);
            }
            customerRepo.deleteById(customerId);
            return;
        }

        CrmOrderRepository.OrderAggregate agg = orderRepo.aggregateByCustomer(customerId);
        customer.setTotalOrders(agg.getTotalOrders() == null ? 0 : agg.getTotalOrders().intValue());
        customer.setTotalSpent(agg.getTotalSpent() == null ? BigDecimal.ZERO : agg.getTotalSpent());
        customer.setFirstOrderAt(agg.getFirstOrderAt());
        customer.setLastOrderAt(agg.getLastOrderAt());

        if (customer.getFullName() == null || customer.getFullName().isBlank()) {
            orderRepo.findFirstByCrmCustomerIdAndCustomerNameIsNotNullAndCustomerNameNotOrderBySaleDateDescIdDesc(customerId, "")
                    .map(SalesOrder::getCustomerName)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .ifPresent(customer::setFullName);
        }

        orderRepo.findFirstByCrmCustomerIdAndCustomerTypeIsNotNullAndCustomerTypeNotOrderBySaleDateDescIdDesc(customerId, "")
                .map(SalesOrder::getCustomerType)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .ifPresent(customer::setCustomerType);

        customerRepo.save(customer);
    }

    /**
     * Dựng lại toàn bộ liên kết khách ↔ đơn từ sales_orders (idempotent).
     */
    public Map<String, Object> rebuildAll() {
        if (!rebuilding.compareAndSet(false, true)) {
            throw new IllegalStateException("Hệ thống đang dựng lại dữ liệu khách hàng, vui lòng thử lại sau.");
        }
        try {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            Map<String, Long> phoneCache = new HashMap<>();
            Set<Long> affected = new HashSet<>();
            int linked = 0;
            int unlinked = 0;

            int page = 0;
            boolean hasNext = true;
            while (hasNext) {
                final int currentPage = page;
                int[] counters = new int[3];
                tx.executeWithoutResult(status -> processRebuildPage(currentPage, phoneCache, affected, counters));
                linked += counters[0];
                unlinked += counters[1];
                hasNext = counters[2] == 1;
                page++;
            }

            Set<Long> toRecalc = new LinkedHashSet<>(affected);
            customerRepo.findAll().forEach(c -> toRecalc.add(c.getId()));
            List<Long> ids = new ArrayList<>(toRecalc);
            for (int i = 0; i < ids.size(); i += RECALC_BATCH_SIZE) {
                List<Long> batch = ids.subList(i, Math.min(i + RECALC_BATCH_SIZE, ids.size()));
                tx.executeWithoutResult(status -> batch.forEach(this::recalculateCustomer));
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("linkedOrders", linked);
            result.put("unlinkedOrders", unlinked);
            result.put("totalCustomers", customerRepo.count());
            log.info("[CRM] Dựng lại xong: {} đơn đã gắn khách, {} đơn chưa xác định khách, {} khách.",
                    linked, unlinked, result.get("totalCustomers"));
            return result;
        } finally {
            rebuilding.set(false);
        }
    }

    private void processRebuildPage(int page, Map<String, Long> phoneCache, Set<Long> affected, int[] counters) {
        Page<SalesOrder> orders = orderRepo.findAll(PageRequest.of(page, REBUILD_PAGE_SIZE, Sort.by("id")));
        Map<Long, List<Long>> toAssign = new HashMap<>();
        List<Long> toClear = new ArrayList<>();

        for (SalesOrder order : orders.getContent()) {
            Long oldId = order.getCrmCustomerId();
            String phone = PhoneNormalizer.normalize(order.getCustomerPhone());
            Long newId = null;
            if (phone != null) {
                newId = phoneCache.get(phone);
                if (newId == null) {
                    newId = ensureCustomer(phone, order.getCustomerName()).getId();
                    phoneCache.put(phone, newId);
                }
            }

            if (newId == null) {
                counters[1]++;
                if (oldId != null) {
                    toClear.add(order.getId());
                    affected.add(oldId);
                }
            } else {
                counters[0]++;
                affected.add(newId);
                if (!newId.equals(oldId)) {
                    toAssign.computeIfAbsent(newId, k -> new ArrayList<>()).add(order.getId());
                    if (oldId != null) affected.add(oldId);
                }
            }
        }

        if (!toClear.isEmpty()) orderRepo.clearCustomer(toClear);
        toAssign.forEach((customerId, ids) -> orderRepo.assignCustomer(customerId, ids));
        counters[2] = orders.hasNext() ? 1 : 0;
    }

    private CrmCustomer ensureCustomer(String phone, String name) {
        return customerRepo.findByPhoneNormalized(phone).orElseGet(() ->
                customerRepo.saveAndFlush(CrmCustomer.builder()
                        .phoneNormalized(phone)
                        .fullName(cleanName(name))
                        .build()));
    }

    private static String cleanName(String name) {
        if (name == null) return null;
        String trimmed = name.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
