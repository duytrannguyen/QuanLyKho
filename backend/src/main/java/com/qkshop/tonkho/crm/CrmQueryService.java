package com.qkshop.tonkho.crm;

import com.qkshop.tonkho.crm.CrmDtos.*;
import com.qkshop.tonkho.salesreport.SalesOrder;
import com.qkshop.tonkho.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CrmQueryService {

    private static final Set<String> SORTABLE = Set.of("lastOrderAt", "totalOrders", "totalSpent", "fullName", "firstOrderAt");
    private static final Set<String> CATEGORIES = Set.of("MACHINE", "ACCESSORY", "REPAIR");
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_EXPORT_SIZE = 10000;

    private final CrmCustomerRepository customerRepo;
    private final CrmOrderRepository orderRepo;
    private final CrmCustomerLinkService linkService;
    private final CrmCareNoteRepository careNoteRepo;
    private final com.qkshop.tonkho.machine.SerialRegistryRepository serialRegistryRepo;
    private final com.qkshop.tonkho.inventory.ActiveInventoryRepository activeInventoryRepo;
    private final com.qkshop.tonkho.inventory.ClosedCycleRepository closedCycleRepo;

    @Transactional(readOnly = true)
    public PageResult<CustomerItem> searchCustomers(String keyword, String sortBy, String direction, int page, int size) {
        return searchCustomers(keyword, "", sortBy, direction, page, size);
    }

    @Transactional(readOnly = true)
    public PageResult<CustomerItem> searchCustomers(String keyword, String filterType, String sortBy, String direction, int page, int size) {
        return searchCustomersInternal(keyword, filterType, sortBy, direction, page, size, MAX_PAGE_SIZE);
    }

    private PageResult<CustomerItem> searchCustomersInternal(String keyword, String filterType, String sortBy, String direction, int page, int size, int maxLimit) {
        String kw = normalizeKeyword(keyword);
        String ft = filterType == null ? "" : filterType.trim().toUpperCase(Locale.ROOT);
        String sortProp = SORTABLE.contains(sortBy) ? sortBy : "lastOrderAt";
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        PageRequest pageable = PageRequest.of(Math.max(page, 0), clampSize(size, maxLimit),
                Sort.by(dir, sortProp).and(Sort.by(Sort.Direction.DESC, "id")));

        LocalDate expiringBefore = LocalDate.now().plusDays(30);
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime fourteenDaysAgo = LocalDateTime.now().minusDays(14);

        Page<CrmCustomer> result = customerRepo.searchWithFilter(
                kw, ft, expiringBefore, sixMonthsAgo, twelveMonthsAgo, sevenDaysAgo, fourteenDaysAgo, pageable);

        List<Long> customerIds = result.getContent().stream().map(CrmCustomer::getId).toList();
        Map<Long, List<SalesOrder>> orderMap = Collections.emptyMap();
        MachineRepurchaseBatchContext batchCtx = MachineRepurchaseBatchContext.empty();
        if (!customerIds.isEmpty()) {
            List<SalesOrder> orders = orderRepo.findByCrmCustomerIdInOrderBySaleDateDescIdDesc(customerIds);
            orderMap = orders.stream().collect(java.util.stream.Collectors.groupingBy(SalesOrder::getCrmCustomerId));
            batchCtx = buildBatchContext(orders);
        }

        final Map<Long, List<SalesOrder>> finalOrderMap = orderMap;
        final MachineRepurchaseBatchContext finalBatchCtx = batchCtx;
        List<CustomerItem> items = result.getContent().stream().map(c -> {
            List<SalesOrder> customerOrders = finalOrderMap.getOrDefault(c.getId(), Collections.emptyList());
            CareStatusEvaluation eval = evaluateCareStatus(customerOrders, sixMonthsAgo, twelveMonthsAgo, sevenDaysAgo, fourteenDaysAgo, finalBatchCtx);
            return CustomerItem.from(c, eval.tag, eval.label, eval.appointmentDate);
        }).toList();

        return new PageResult<>(items, result.getTotalElements(), result.getTotalPages(), result.getNumber(), result.getSize());
    }

    public record MachineRepurchaseBatchContext(
            Set<String> activeSerialKeys,
            Map<String, com.qkshop.tonkho.machine.SerialRegistry> registryMap,
            Map<String, List<com.qkshop.tonkho.inventory.ClosedCycle>> closedCyclesMap
    ) {
        public static MachineRepurchaseBatchContext empty() {
            return new MachineRepurchaseBatchContext(Collections.emptySet(), Collections.emptyMap(), Collections.emptyMap());
        }
    }

    public MachineRepurchaseBatchContext buildBatchContext(Collection<SalesOrder> orders) {
        if (orders == null || orders.isEmpty()) {
            return MachineRepurchaseBatchContext.empty();
        }

        Set<String> serials = new HashSet<>();
        for (SalesOrder o : orders) {
            String serial = extractSerialKey(o);
            if (serial != null && !serial.isBlank()) {
                serials.add(com.qkshop.tonkho.machine.SerialRegistry.normalizeSerialKey(serial));
            }
            if (o.getTransactionId() != null && o.getTransactionId().startsWith("PK-KEM-")) {
                String cycleKey = o.getTransactionId().substring("PK-KEM-".length()).trim();
                String s = cycleKey.contains("::") ? cycleKey.split("::")[0].trim() : cycleKey;
                if (!s.isBlank()) {
                    serials.add(com.qkshop.tonkho.machine.SerialRegistry.normalizeSerialKey(s));
                }
            }
        }

        if (serials.isEmpty()) {
            return MachineRepurchaseBatchContext.empty();
        }

        Set<String> activeSerials = activeInventoryRepo.findExistingSerialKeysIn(serials);
        List<com.qkshop.tonkho.machine.SerialRegistry> regs = serialRegistryRepo.findBySerialKeyIn(new ArrayList<>(serials));
        Map<String, com.qkshop.tonkho.machine.SerialRegistry> regMap = regs.stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.qkshop.tonkho.machine.SerialRegistry::getSerialKey,
                        r -> r,
                        (a, b) -> a));

        List<com.qkshop.tonkho.inventory.ClosedCycle> cycles = closedCycleRepo.findBySerialKeyInOrderByClosedAtDesc(serials);
        Map<String, List<com.qkshop.tonkho.inventory.ClosedCycle>> cycleMap = cycles.stream()
                .collect(java.util.stream.Collectors.groupingBy(com.qkshop.tonkho.inventory.ClosedCycle::getSerialKey));

        return new MachineRepurchaseBatchContext(activeSerials, regMap, cycleMap);
    }

    private record CareStatusEvaluation(String tag, String label, LocalDate appointmentDate) {}

    public boolean isMachineRepurchased(SalesOrder order) {
        return isMachineRepurchased(order, null);
    }

    /**
     * Kiểm tra xem máy trong đơn hàng này đã được bán lại cho shop (hoặc thu hồi) hay chưa.
     * Sử dụng Batch Context để tra cứu in-memory (O(1)), tránh triệt để N+1 query.
     */
    public boolean isMachineRepurchased(SalesOrder order, MachineRepurchaseBatchContext ctx) {
        if (order == null) return false;

        if ("DA_BAN_LAI".equalsIgnoreCase(order.getCareStatus()) || "VOIDED".equalsIgnoreCase(order.getCareStatus())) {
            return true;
        }
        if (isOrderCancelledOrReturned(order.getOrderStatus())) {
            return true;
        }

        if (order.getTransactionId() != null && order.getTransactionId().startsWith("PK-KEM-")) {
            String cycleKey = order.getTransactionId().substring("PK-KEM-".length()).trim();
            String serial = cycleKey.contains("::") ? cycleKey.split("::")[0].trim() : cycleKey;
            if (!serial.isBlank()) {
                String normSerial = com.qkshop.tonkho.machine.SerialRegistry.normalizeSerialKey(serial);
                if (ctx != null) {
                    if (ctx.activeSerialKeys().contains(normSerial)) return true;
                    var reg = ctx.registryMap().get(normSerial);
                    if (reg != null && reg.getCurrentState() != com.qkshop.tonkho.inventory.CycleState.CLOSED) {
                        return true;
                    }
                } else {
                    if (activeInventoryRepo.existsBySerialKey(normSerial)) return true;
                    var regOpt = serialRegistryRepo.findBySerialKey(normSerial);
                    if (regOpt.isPresent() && regOpt.get().getCurrentState() != com.qkshop.tonkho.inventory.CycleState.CLOSED) {
                        return true;
                    }
                }
            }
        }

        boolean isMachine = "MACHINE".equalsIgnoreCase(order.getOrderCategory()) || order.getOrderCategory() == null;
        if (!isMachine) return false;

        String serial = extractSerialKey(order);
        if (serial != null && !serial.isBlank()) {
            String normSerial = com.qkshop.tonkho.machine.SerialRegistry.normalizeSerialKey(serial);

            if (ctx != null) {
                if (ctx.activeSerialKeys().contains(normSerial)) {
                    return true;
                }
                var reg = ctx.registryMap().get(normSerial);
                if (reg != null) {
                    if (reg.getCurrentState() != com.qkshop.tonkho.inventory.CycleState.CLOSED) {
                        return true;
                    }
                    String currentCycle = reg.getCurrentCycleId();
                    if (currentCycle != null && !currentCycle.isBlank()) {
                        String matched = order.getMatchedCycleId();
                        if (matched != null && !matched.isBlank()) {
                            String cleanMatched = matched.replace("CYC-", "").replace("CYCLE-", "").trim();
                            String cleanCurrent = currentCycle.replace("CYC-", "").replace("CYCLE-", "").trim();
                            if (!cleanCurrent.equalsIgnoreCase(cleanMatched)) {
                                return true;
                            }
                        }
                    }
                }
                if (order.getSaleDate() != null) {
                    var cycles = ctx.closedCyclesMap().get(normSerial);
                    if (cycles != null && cycles.size() > 1) {
                        var latest = cycles.get(0);
                        if (latest.getClosedAt() != null && latest.getClosedAt().isAfter(order.getSaleDate().plusDays(1))) {
                            return true;
                        }
                    }
                }
            } else {
                if (activeInventoryRepo.existsBySerialKey(normSerial)) {
                    return true;
                }
                var regOpt = serialRegistryRepo.findBySerialKey(normSerial);
                if (regOpt.isPresent()) {
                    var reg = regOpt.get();
                    if (reg.getCurrentState() != com.qkshop.tonkho.inventory.CycleState.CLOSED) {
                        return true;
                    }
                    String currentCycle = reg.getCurrentCycleId();
                    if (currentCycle != null && !currentCycle.isBlank()) {
                        String matched = order.getMatchedCycleId();
                        if (matched != null && !matched.isBlank()) {
                            String cleanMatched = matched.replace("CYC-", "").replace("CYCLE-", "").trim();
                            String cleanCurrent = currentCycle.replace("CYC-", "").replace("CYCLE-", "").trim();
                            if (!cleanCurrent.equalsIgnoreCase(cleanMatched)) {
                                return true;
                            }
                        }
                    }
                }
                if (order.getSaleDate() != null) {
                    var cycles = closedCycleRepo.findBySerialKeyOrderByClosedAtDesc(normSerial);
                    if (cycles != null && cycles.size() > 1) {
                        var latest = cycles.get(0);
                        if (latest.getClosedAt() != null && latest.getClosedAt().isAfter(order.getSaleDate().plusDays(1))) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    private String extractSerialKey(SalesOrder order) {
        if (order.getSerialKeys() != null && !order.getSerialKeys().isBlank()) {
            String s = order.getSerialKeys().trim();
            if (s.contains(",")) s = s.split(",")[0].trim();
            if (s.contains(";")) s = s.split(";")[0].trim();
            return s;
        }
        if (order.getMatchedCycleId() != null && !order.getMatchedCycleId().isBlank()) {
            var ccOpt = closedCycleRepo.findByCycleId(order.getMatchedCycleId());
            if (ccOpt.isPresent() && ccOpt.get().getSerialKey() != null) {
                return ccOpt.get().getSerialKey();
            }
        }
        return null;
    }

    public static boolean isOfficeSegment(String segment) {
        if (segment == null || segment.isBlank()) return false;
        String lower = segment.toLowerCase(Locale.ROOT);
        return lower.contains("văn phòng") || lower.contains("van phong") || lower.contains("office");
    }

    private CareStatusEvaluation evaluateCareStatus(
            List<SalesOrder> orders,
            LocalDateTime sixMonthsAgo,
            LocalDateTime twelveMonthsAgo,
            LocalDateTime sevenDaysAgo,
            LocalDateTime fourteenDaysAgo) {
        return evaluateCareStatus(orders, sixMonthsAgo, twelveMonthsAgo, sevenDaysAgo, fourteenDaysAgo, null);
    }

    private CareStatusEvaluation evaluateCareStatus(
            List<SalesOrder> orders,
            LocalDateTime sixMonthsAgo,
            LocalDateTime twelveMonthsAgo,
            LocalDateTime sevenDaysAgo,
            LocalDateTime fourteenDaysAgo,
            MachineRepurchaseBatchContext ctx) {

        if (orders == null || orders.isEmpty()) {
            return new CareStatusEvaluation("NORMAL", "Chưa có giao dịch", null);
        }

        List<SalesOrder> primaryOrders = orders.stream()
                .filter(o -> o.getTransactionId() == null || !o.getTransactionId().startsWith("PK-KEM-"))
                .toList();

        List<SalesOrder> evalOrders = primaryOrders.isEmpty() ? orders : primaryOrders;

        LocalDate today = LocalDate.now();
        java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");

        int activeOrderCount = 0;
        int repurchasedCount = 0;
        for (SalesOrder o : evalOrders) {
            if (isOrderCancelledOrReturned(o.getOrderStatus())) continue;
            if (isMachineRepurchased(o, ctx)) {
                repurchasedCount++;
            } else {
                activeOrderCount++;
            }
        }

        if (activeOrderCount == 0 && repurchasedCount > 0) {
            return new CareStatusEvaluation("VOIDED", "Đã bán lại cho shop", null);
        }

        // 1. Kiểm tra có đơn ĐANG HẸN KHÁCH không
        for (SalesOrder o : evalOrders) {
            if (isOrderCancelledOrReturned(o.getOrderStatus())) continue;
            if (isMachineRepurchased(o, ctx)) continue;
            if ("DANG_HEN".equalsIgnoreCase(o.getCareStatus())) {
                String dateStr = o.getNextCareDate() != null ? ": " + o.getNextCareDate().format(dtf) : "";
                return new CareStatusEvaluation("APPOINTMENT", "Đang hẹn khách" + dateStr, o.getNextCareDate());
            }
        }

        // 2. Kiểm tra có đơn ĐẾN HẠN CHĂM SÓC (CARE_DUE) không
        for (SalesOrder o : evalOrders) {
            if (isOrderCancelledOrReturned(o.getOrderStatus())) continue;
            if (isMachineRepurchased(o, ctx)) continue;
            boolean isMachine = "MACHINE".equalsIgnoreCase(o.getOrderCategory()) || o.getOrderCategory() == null;

            if (isMachine) {
                if (o.getNextCareDate() != null && !o.getNextCareDate().isAfter(today)) {
                    return new CareStatusEvaluation("CARE_DUE", "Đến hạn vệ sinh máy", o.getNextCareDate());
                }
                if (o.getNextCareDate() == null && o.getSaleDate() != null
                        && !"HOAN_TAT_1_LAN".equalsIgnoreCase(o.getCareStatus())
                        && !"DA_VE_SINH".equalsIgnoreCase(o.getCareStatus())) {
                    boolean isOffice = isOfficeSegment(o.getSegment());
                    if (isOffice && !o.getSaleDate().isAfter(twelveMonthsAgo)) {
                        return new CareStatusEvaluation("CARE_DUE", "Đến hạn vệ sinh (12 tháng)", null);
                    }
                    if (!isOffice && !o.getSaleDate().isAfter(sixMonthsAgo)) {
                        return new CareStatusEvaluation("CARE_DUE", "Đến hạn vệ sinh (6 tháng)", null);
                    }
                }
            } else {
                if (!"HOAN_TAT_1_LAN".equalsIgnoreCase(o.getCareStatus()) && o.getSaleDate() != null) {
                    if (!o.getSaleDate().isAfter(sevenDaysAgo) && !o.getSaleDate().isBefore(fourteenDaysAgo)) {
                        return new CareStatusEvaluation("CARE_DUE", "Cần thăm hỏi sau mua (7-14 ngày)", null);
                    }
                }
            }
        }

        // 3. Kiểm tra có đơn ĐÃ HOÀN TẤT không
        boolean hasCompleted = false;
        for (SalesOrder o : evalOrders) {
            if (isOrderCancelledOrReturned(o.getOrderStatus())) continue;
            if (isMachineRepurchased(o, ctx)) continue;
            if ("DA_VE_SINH".equalsIgnoreCase(o.getCareStatus()) || "HOAN_TAT_1_LAN".equalsIgnoreCase(o.getCareStatus())) {
                hasCompleted = true;
                break;
            }
        }
        if (hasCompleted) {
            return new CareStatusEvaluation("COMPLETED", "Đã chăm sóc hoàn tất", null);
        }

        return new CareStatusEvaluation("NORMAL", "Đang dùng tốt", null);
    }

    private boolean isOrderCancelledOrReturned(String status) {
        if (status == null) return false;
        String s = status.toLowerCase(Locale.ROOT);
        return s.contains("hủy") || s.contains("huỷ") || s.contains("trả") || s.contains("cancel");
    }

    @Transactional(readOnly = true)
    public CustomerItem getCustomer(Long id) {
        CrmCustomer c = customerRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + id));

        List<SalesOrder> orders = orderRepo.findByCrmCustomerIdOrderBySaleDateDescIdDesc(id);
        MachineRepurchaseBatchContext batchCtx = buildBatchContext(orders);
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime fourteenDaysAgo = LocalDateTime.now().minusDays(14);
        CareStatusEvaluation eval = evaluateCareStatus(orders, sixMonthsAgo, twelveMonthsAgo, sevenDaysAgo, fourteenDaysAgo, batchCtx);
        return CustomerItem.from(c, eval.tag, eval.label, eval.appointmentDate);
    }

    @Transactional(readOnly = true)
    public PageResult<OrderItem> getCustomerOrders(Long customerId, String category, int page, int size) {
        if (!customerRepo.existsById(customerId)) {
            throw new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + customerId);
        }
        String cat = category == null ? "" : category.trim().toUpperCase(Locale.ROOT);
        if (!cat.isEmpty() && !CATEGORIES.contains(cat)) cat = "";

        List<SalesOrder> allCustomerOrders = orderRepo.findByCrmCustomerIdOrderBySaleDateDescIdDesc(customerId);
        MachineRepurchaseBatchContext batchCtx = buildBatchContext(allCustomerOrders);

        List<SalesOrder> accompanyingOrders = new ArrayList<>();
        List<SalesOrder> primaryOrders = new ArrayList<>();

        for (SalesOrder o : allCustomerOrders) {
            if (o.getTransactionId() != null && o.getTransactionId().startsWith("PK-KEM-")) {
                accompanyingOrders.add(o);
            } else {
                primaryOrders.add(o);
            }
        }

        Map<Long, OrderItem> accompanyingMap = new HashMap<>();
        Set<Long> matchedAccIds = new HashSet<>();

        for (SalesOrder acc : accompanyingOrders) {
            String accTxn = acc.getTransactionId();
            String cycleKey = accTxn.substring("PK-KEM-".length()).trim();

            SalesOrder matchedMachine = null;
            for (SalesOrder m : primaryOrders) {
                if ("MACHINE".equalsIgnoreCase(m.getOrderCategory()) || m.getOrderCategory() == null) {
                    String mCycle = m.getMatchedCycleId() != null ? m.getMatchedCycleId().replace("CYC-", "").trim() : "";
                    if (!mCycle.isEmpty() && mCycle.equalsIgnoreCase(cycleKey)) {
                        matchedMachine = m;
                        break;
                    }
                    if (m.getSerialKeys() != null && !m.getSerialKeys().isBlank()) {
                        String serial = m.getSerialKeys().trim();
                        if (cycleKey.startsWith(serial) || cycleKey.contains(serial)) {
                            matchedMachine = m;
                            break;
                        }
                    }
                }
            }

            if (matchedMachine != null) {
                accompanyingMap.put(matchedMachine.getId(), OrderItem.from(acc, null));
                matchedAccIds.add(acc.getId());
            }
        }

        List<OrderItem> combinedList = new ArrayList<>();

        for (SalesOrder o : primaryOrders) {
            OrderItem accItem = accompanyingMap.get(o.getId());
            boolean voided = isMachineRepurchased(o, batchCtx);
            combinedList.add(OrderItem.from(o, accItem, voided));
        }

        for (SalesOrder acc : accompanyingOrders) {
            if (!matchedAccIds.contains(acc.getId())) {
                combinedList.add(OrderItem.from(acc, null, false));
            }
        }

        List<OrderItem> filteredList;
        if (cat.isEmpty()) {
            filteredList = combinedList;
        } else if ("MACHINE".equals(cat)) {
            filteredList = combinedList.stream()
                    .filter(i -> "MACHINE".equalsIgnoreCase(i.orderCategory()))
                    .toList();
        } else if ("ACCESSORY".equals(cat)) {
            filteredList = combinedList.stream()
                    .filter(i -> "ACCESSORY".equalsIgnoreCase(i.orderCategory()))
                    .toList();
        } else if ("REPAIR".equals(cat)) {
            filteredList = combinedList.stream()
                    .filter(i -> "REPAIR".equalsIgnoreCase(i.orderCategory()))
                    .toList();
        } else {
            filteredList = combinedList;
        }

        int totalElements = filteredList.size();
        int pageSize = clampSize(size);
        int totalPages = (int) Math.ceil((double) totalElements / pageSize);
        int fromIndex = Math.min(Math.max(page, 0) * pageSize, totalElements);
        int toIndex = Math.min(fromIndex + pageSize, totalElements);
        List<OrderItem> pageContent = filteredList.subList(fromIndex, toIndex);

        return new PageResult<>(pageContent, totalElements, totalPages, page, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResult<OrderItem> getUnlinkedOrders(int page, int size) {
        Page<SalesOrder> result = orderRepo.findUnlinkedOrders(PageRequest.of(Math.max(page, 0), clampSize(size)));
        return new PageResult<>(
                result.getContent().stream().map(OrderItem::from).toList(),
                result.getTotalElements(), result.getTotalPages(), result.getNumber(), result.getSize());
    }

    @Transactional(readOnly = true)
    public OrderItem getOrder(Long orderId) {
        SalesOrder order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với mã " + orderId));
        OrderItem accItem = null;
        if ("MACHINE".equalsIgnoreCase(order.getOrderCategory()) || order.getOrderCategory() == null) {
            String mCycle = order.getMatchedCycleId() != null ? order.getMatchedCycleId().replace("CYC-", "").trim() : "";
            String serial = order.getSerialKeys() != null ? order.getSerialKeys().trim() : "";
            if (order.getCrmCustomerId() != null && (!mCycle.isEmpty() || !serial.isEmpty())) {
                List<SalesOrder> candidates = orderRepo.findByCrmCustomerIdOrderBySaleDateDescIdDesc(order.getCrmCustomerId());
                for (SalesOrder c : candidates) {
                    if (c.getTransactionId() != null && c.getTransactionId().startsWith("PK-KEM-")) {
                        String cycleKey = c.getTransactionId().substring("PK-KEM-".length()).trim();
                        if ((!mCycle.isEmpty() && mCycle.equalsIgnoreCase(cycleKey)) ||
                            (!serial.isEmpty() && (cycleKey.startsWith(serial) || cycleKey.contains(serial)))) {
                            accItem = OrderItem.from(c, null);
                            break;
                        }
                    }
                }
            }
        }
        return OrderItem.from(order, accItem);
    }

    @Transactional(readOnly = true)
    public CrmSummary getSummary() {
        CachedData<CrmSummary> cached = summaryCache;
        if (cached != null && cached.isValid()) {
            return cached.data();
        }

        LocalDate expiringBefore = LocalDate.now().plusDays(30);
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime fourteenDaysAgo = LocalDateTime.now().minusDays(14);

        long total = customerRepo.count();
        long unlinked = orderRepo.countByCrmCustomerIdIsNull();
        long expiring = customerRepo.countWarrantyExpiring(expiringBefore);
        long expired = customerRepo.countWarrantyExpired();
        long careDue = customerRepo.countCareDue(sixMonthsAgo, twelveMonthsAgo, sevenDaysAgo, fourteenDaysAgo);
        long appointments = customerRepo.countAppointments();
        long completed = customerRepo.countCareCompleted(sixMonthsAgo, twelveMonthsAgo, sevenDaysAgo, fourteenDaysAgo);

        CrmSummary res = new CrmSummary(total, unlinked, expiring, expired, careDue, careDue, appointments, completed);
        summaryCache = new CachedData<>(res, System.currentTimeMillis() + 15_000);
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public CustomerItem updateCustomer(Long id, UpdateCustomerRequest req) {
        CrmCustomer c = customerRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + id));

        if (req.fullName() != null && !req.fullName().isBlank()) {
            c.setFullName(req.fullName().trim());
        }
        c.setAddress(req.address() != null ? req.address().trim() : null);
        c.setBirthDate(req.birthDate());
        c.setEmail(req.email() != null ? req.email().trim() : null);
        c.setPreferenceNote(req.preferenceNote() != null ? req.preferenceNote().trim() : null);

        customerRepo.save(c);
        invalidateCache();
        return CustomerItem.from(c);
    }

    @Transactional(rollbackFor = Exception.class)
    public void assignOrder(AssignOrderRequest request) {
        String phone = PhoneNormalizer.normalize(request.phone());
        if (phone == null) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ. Vui lòng nhập số gồm 10 chữ số, bắt đầu bằng 0.");
        }
        SalesOrder order = orderRepo.findById(request.orderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với mã " + request.orderId()));

        order.setCustomerPhone(phone);
        String name = request.customerName() == null ? "" : request.customerName().trim();
        if (!name.isEmpty()) {
            order.setCustomerName(name);
        }
        orderRepo.save(order);
        invalidateCache();
    }

    @Transactional(readOnly = true)
    public List<CareNoteItem> getCareNotes(Long customerId) {
        return getCareNotes(customerId, null);
    }

    @Transactional(readOnly = true)
    public List<CareNoteItem> getCareNotes(Long customerId, Long orderId) {
        if (!customerRepo.existsById(customerId)) {
            throw new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + customerId);
        }
        List<CrmCareNote> list;
        if (orderId != null && orderId > 0) {
            list = careNoteRepo.findByCustomer_IdAndOrderIdOrderByCreatedAtDesc(customerId, orderId);
        } else {
            list = careNoteRepo.findByCustomer_IdOrderByCreatedAtDesc(customerId);
        }
        return list.stream()
                .map(CareNoteItem::from)
                .toList();
    }

    @Transactional(rollbackFor = Exception.class)
    public CareNoteItem addCareNote(Long customerId, CreateCareNoteRequest req, String username) {
        CrmCustomer c = customerRepo.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + customerId));

        if (req.orderId() == null || req.orderId() <= 0) {
            throw new IllegalArgumentException("Mục hóa đơn / thiết bị cần chăm sóc là bắt buộc.");
        }

        Long orderId = req.orderId();
        SalesOrder order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với mã " + orderId));

        String txnId = req.orderTransactionId() != null && !req.orderTransactionId().isBlank()
                ? req.orderTransactionId().trim()
                : order.getTransactionId();
        String prodName = req.orderProductName() != null && !req.orderProductName().isBlank()
                ? req.orderProductName().trim()
                : order.getProductName();

        String outcome = req.careOutcome() != null && !req.careOutcome().isBlank()
                ? req.careOutcome().trim()
                : "GENERAL_NOTE";

        LocalDate nextCycle = req.nextCycleDate();

        order.setLastCareDate(LocalDate.now());
        order.setCareCount((order.getCareCount() == null ? 0 : order.getCareCount()) + 1);

        boolean isMachine = "MACHINE".equalsIgnoreCase(order.getOrderCategory()) || order.getOrderCategory() == null;

        if ("MACHINE_REPURCHASED".equalsIgnoreCase(outcome)) {
            order.setCareStatus("DA_BAN_LAI");
            order.setNextCareDate(null);
            nextCycle = null;
        } else if (isMachine) {
            if ("MAINTENANCE_COMPLETED".equalsIgnoreCase(outcome)) {
                order.setLastMaintenanceDate(LocalDate.now());
                LocalDate cycleDate = nextCycle != null ? nextCycle : LocalDate.now().plusMonths(6);
                order.setNextCareDate(cycleDate);
                order.setCareStatus("DA_VE_SINH");
                nextCycle = cycleDate;
            } else if ("APPOINTMENT_SET".equalsIgnoreCase(outcome) || req.followUpDate() != null) {
                order.setCareStatus("DANG_HEN");
                if (req.followUpDate() != null) {
                    order.setNextCareDate(req.followUpDate());
                }
            } else {
                if (order.getCareStatus() == null) {
                    order.setCareStatus("DANG_CHAM_SOC");
                }
            }
        } else {
            if ("ONE_TIME_COMPLETED".equalsIgnoreCase(outcome)) {
                order.setCareStatus("HOAN_TAT_1_LAN");
                order.setNextCareDate(null);
            } else if ("APPOINTMENT_SET".equalsIgnoreCase(outcome) || req.followUpDate() != null) {
                order.setCareStatus("DANG_HEN");
                if (req.followUpDate() != null) {
                    order.setNextCareDate(req.followUpDate());
                }
            } else {
                if (order.getCareStatus() == null) {
                    order.setCareStatus("DANG_CHAM_SOC");
                }
            }
        }

        orderRepo.save(order);

        CrmCareNote note = CrmCareNote.builder()
                .customer(c)
                .interactionType(req.interactionType().trim())
                .content(req.content().trim())
                .followUpDate(req.followUpDate())
                .createdBy(username != null && !username.isBlank() ? username : "Nhân viên")
                .orderId(orderId)
                .orderTransactionId(txnId)
                .orderProductName(prodName)
                .careOutcome(outcome)
                .nextCycleDate(nextCycle)
                .build();

        CrmCareNote saved = careNoteRepo.save(note);
        invalidateCache();
        return CareNoteItem.from(saved);
    }

    /**
     * Xuất danh sách khách hàng ra file Excel theo bộ lọc hiện tại (không bị giới hạn ở 100 dòng).
     * Sử dụng SXSSFWorkbook (Streaming) giữ tối đa 100 dòng trong RAM để tiết kiệm 95% bộ nhớ và CPU.
     */
    @Transactional(readOnly = true)
    public org.springframework.core.io.ByteArrayResource generateCustomersExcel(String keyword, String filterType, String sortBy, String direction) {
        PageResult<CustomerItem> page = searchCustomersInternal(keyword, filterType, sortBy, direction, 0, MAX_EXPORT_SIZE, MAX_EXPORT_SIZE);
        List<CustomerItem> list = page.items();

        try (org.apache.poi.xssf.streaming.SXSSFWorkbook workbook = new org.apache.poi.xssf.streaming.SXSSFWorkbook(100);
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("KhachHang_CRM");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            String[] headers = {
                    "STT", "Số điện thoại", "Họ tên", "Phân loại", "Địa chỉ",
                    "Email", "Ngày sinh", "Tổng đơn", "Tổng chi tiêu (VNĐ)",
                    "Đơn đầu tiên", "Đơn gần nhất", "Ghi chú sở thích / nhu cầu"
            };
            int[] colWidths = {1800, 4200, 6500, 4800, 8500, 6500, 3800, 3000, 5200, 4800, 4800, 9500};

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, colWidths[i]);
            }

            java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            java.time.format.DateTimeFormatter df = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");

            int rowIdx = 1;
            for (CustomerItem c : list) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(rowIdx - 1);
                row.createCell(1).setCellValue(c.phone() != null ? c.phone() : "");
                row.createCell(2).setCellValue(c.fullName() != null ? c.fullName() : "");
                row.createCell(3).setCellValue(c.customerType() != null ? c.customerType() : "");
                row.createCell(4).setCellValue(c.address() != null ? c.address() : "");
                row.createCell(5).setCellValue(c.email() != null ? c.email() : "");
                row.createCell(6).setCellValue(c.birthDate() != null ? c.birthDate().format(df) : "");
                row.createCell(7).setCellValue(c.totalOrders());
                row.createCell(8).setCellValue(c.totalSpent() != null ? c.totalSpent().doubleValue() : 0.0);
                row.createCell(9).setCellValue(c.firstOrderAt() != null ? c.firstOrderAt().format(dtf) : "");
                row.createCell(10).setCellValue(c.lastOrderAt() != null ? c.lastOrderAt().format(dtf) : "");
                row.createCell(11).setCellValue(c.preferenceNote() != null ? c.preferenceNote() : "");
            }

            workbook.write(out);
            workbook.dispose();
            return new org.springframework.core.io.ByteArrayResource(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xuất danh sách khách hàng ra Excel: " + e.getMessage(), e);
        }
    }

    private record CachedData<T>(T data, long expiresAt) {
        boolean isValid() {
            return System.currentTimeMillis() < expiresAt;
        }
    }

    private volatile CachedData<CrmSummary> summaryCache;
    private volatile CachedData<ExpiredWarrantySummary> expiredSummaryCache;
    private volatile CachedData<List<String>> expiredBrandsCache;

    public void invalidateCache() {
        summaryCache = null;
        expiredSummaryCache = null;
        expiredBrandsCache = null;
    }

    public void clearCache() {
        invalidateCache();
    }

    @Transactional(readOnly = true)
    public ExpiredWarrantySummary getExpiredWarrantySummary() {
        CachedData<ExpiredWarrantySummary> c = expiredSummaryCache;
        if (c != null && c.isValid()) {
            return c.data();
        }

        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysAgo = today.minusDays(30);
        LocalDate threeMonthsAgo = today.minusMonths(3);

        long total = orderRepo.countTotalExpiredWarranty();
        long within30Days = orderRepo.countExpiredWithin30Days(thirtyDaysAgo);
        long oneToThreeMonths = orderRepo.countExpired1To3Months(thirtyDaysAgo, threeMonthsAgo);
        long overThreeMonths = orderRepo.countExpiredOver3Months(threeMonthsAgo);

        ExpiredWarrantySummary res = new ExpiredWarrantySummary(total, within30Days, oneToThreeMonths, overThreeMonths);
        expiredSummaryCache = new CachedData<>(res, System.currentTimeMillis() + 15_000);
        return res;
    }

    @Transactional(readOnly = true)
    public List<String> getExpiredWarrantyBrands() {
        CachedData<List<String>> c = expiredBrandsCache;
        if (c != null && c.isValid()) {
            return c.data();
        }

        List<String> res = orderRepo.findExpiredWarrantyBrands();
        expiredBrandsCache = new CachedData<>(res, System.currentTimeMillis() + 60_000);
        return res;
    }

    @Transactional(readOnly = true)
    public PageResult<ExpiredWarrantyOrderItem> searchExpiredWarrantyOrders(
            String keyword, String brand, String range, int page, int size) {
        String kw = normalizeKeyword(keyword);
        String b = brand == null ? "" : brand.trim();
        String r = range == null ? "" : range.trim().toUpperCase(Locale.ROOT);

        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysAgo = today.minusDays(30);
        LocalDate threeMonthsAgo = today.minusMonths(3);
        LocalDate sixMonthsAgo = today.minusMonths(6);

        PageRequest pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        Page<SalesOrder> result = orderRepo.findExpiredWarrantyOrders(kw, b, r, thirtyDaysAgo, threeMonthsAgo, sixMonthsAgo, pageable);

        MachineRepurchaseBatchContext batchCtx = buildBatchContext(result.getContent());
        List<ExpiredWarrantyOrderItem> items = result.getContent().stream()
                .map(s -> mapToExpiredWarrantyOrderItem(s, today, batchCtx))
                .toList();

        return new PageResult<>(items, result.getTotalElements(), result.getTotalPages(), result.getNumber(), result.getSize());
    }

    private ExpiredWarrantyOrderItem mapToExpiredWarrantyOrderItem(SalesOrder s, LocalDate today, MachineRepurchaseBatchContext ctx) {
        long days = s.getWarrantyExpiry() != null ? java.time.temporal.ChronoUnit.DAYS.between(s.getWarrantyExpiry(), today) : 0;
        boolean isVoided = isMachineRepurchased(s, ctx);
        return new ExpiredWarrantyOrderItem(
                s.getId(),
                s.getTransactionId(),
                s.getSaleDate(),
                s.getCrmCustomerId(),
                s.getCustomerName(),
                s.getCustomerPhone(),
                s.getProductName(),
                s.getBrand(),
                s.getModelName(),
                s.getConfigSummary(),
                s.getSerialKeys(),
                s.getWarrantyPeriod(),
                s.getWarrantyExpiry(),
                Math.max(days, 0),
                s.getNetRevenue(),
                s.getSalesperson(),
                s.getOrderStatus(),
                s.getCareStatus(),
                s.getLastCareDate(),
                isVoided
        );
    }

    @Transactional(readOnly = true)
    public org.springframework.core.io.ByteArrayResource generateExpiredWarrantyExcel(
            String keyword, String brand, String range) {
        String kw = normalizeKeyword(keyword);
        String b = brand == null ? "" : brand.trim();
        String r = range == null ? "" : range.trim().toUpperCase(Locale.ROOT);

        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysAgo = today.minusDays(30);
        LocalDate threeMonthsAgo = today.minusMonths(3);
        LocalDate sixMonthsAgo = today.minusMonths(6);

        List<SalesOrder> orders = orderRepo.findAllExpiredWarrantyOrders(kw, b, r, thirtyDaysAgo, threeMonthsAgo, sixMonthsAgo);

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("May_Het_Han_Bao_Hanh");

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            font.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_RED.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);

            String[] headers = {
                    "STT", "Mã đơn hàng", "Ngày mua", "Tên khách hàng", "Số điện thoại",
                    "Tên thiết bị / Laptop", "Hãng", "Số Serial", "Cấu hình", "Hạn BH gốc",
                    "Ngày hết hạn BH", "Số ngày quá hạn", "Doanh thu (VNĐ)", "Nhân viên bán", "Trạng thái CSKH"
            };

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            java.time.format.DateTimeFormatter df = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");

            int rowIdx = 1;
            for (SalesOrder s : orders) {
                long days = s.getWarrantyExpiry() != null ? java.time.temporal.ChronoUnit.DAYS.between(s.getWarrantyExpiry(), today) : 0;
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(rowIdx - 1);
                row.createCell(1).setCellValue(s.getTransactionId() != null ? s.getTransactionId() : "");
                row.createCell(2).setCellValue(s.getSaleDate() != null ? s.getSaleDate().format(dtf) : "");
                row.createCell(3).setCellValue(s.getCustomerName() != null ? s.getCustomerName() : "");
                row.createCell(4).setCellValue(s.getCustomerPhone() != null ? s.getCustomerPhone() : "");
                row.createCell(5).setCellValue(s.getProductName() != null ? s.getProductName() : "");
                row.createCell(6).setCellValue(s.getBrand() != null ? s.getBrand() : "");
                row.createCell(7).setCellValue(s.getSerialKeys() != null ? s.getSerialKeys() : "");
                row.createCell(8).setCellValue(s.getConfigSummary() != null ? s.getConfigSummary() : "");
                row.createCell(9).setCellValue(s.getWarrantyPeriod() != null ? s.getWarrantyPeriod() : "");
                row.createCell(10).setCellValue(s.getWarrantyExpiry() != null ? s.getWarrantyExpiry().format(df) : "");
                row.createCell(11).setCellValue(Math.max(days, 0));
                row.createCell(12).setCellValue(s.getNetRevenue() != null ? s.getNetRevenue().doubleValue() : 0.0);
                row.createCell(13).setCellValue(s.getSalesperson() != null ? s.getSalesperson() : "");
                row.createCell(14).setCellValue(s.getCareStatus() != null ? s.getCareStatus() : "Chưa chăm sóc");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new org.springframework.core.io.ByteArrayResource(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xuất danh sách máy hết hạn bảo hành ra Excel: " + e.getMessage(), e);
        }
    }

    private static String normalizeKeyword(String keyword) {
        if (keyword == null) return "";
        String kw = keyword.trim();
        String digits = kw.replaceAll("[\\s.\\-]", "");
        return digits.matches("\\d+") ? digits : kw;
    }

    private static int clampSize(int size) {
        return clampSize(size, MAX_PAGE_SIZE);
    }

    private static int clampSize(int size, int maxLimit) {
        if (size <= 0) return 20;
        return Math.min(size, maxLimit);
    }
}
