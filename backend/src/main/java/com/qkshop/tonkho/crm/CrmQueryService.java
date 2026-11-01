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

import java.util.*;

@Service
@RequiredArgsConstructor
public class CrmQueryService {

    private static final Set<String> SORTABLE = Set.of("lastOrderAt", "totalOrders", "totalSpent", "fullName", "firstOrderAt");
    private static final Set<String> CATEGORIES = Set.of("MACHINE", "ACCESSORY", "REPAIR");
    private static final int MAX_PAGE_SIZE = 100;

    private final CrmCustomerRepository customerRepo;
    private final CrmOrderRepository orderRepo;
    private final CrmCustomerLinkService linkService;

    @Transactional(readOnly = true)
    public PageResult<CustomerItem> searchCustomers(String keyword, String sortBy, String direction, int page, int size) {
        String kw = normalizeKeyword(keyword);
        String sortProp = SORTABLE.contains(sortBy) ? sortBy : "lastOrderAt";
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        PageRequest pageable = PageRequest.of(Math.max(page, 0), clampSize(size),
                Sort.by(dir, sortProp).and(Sort.by(Sort.Direction.DESC, "id")));

        Page<CrmCustomer> result = customerRepo.search(kw, pageable);
        return new PageResult<>(
                result.getContent().stream().map(CustomerItem::from).toList(),
                result.getTotalElements(), result.getTotalPages(), result.getNumber(), result.getSize());
    }

    @Transactional(readOnly = true)
    public CustomerItem getCustomer(Long id) {
        return customerRepo.findById(id)
                .map(CustomerItem::from)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + id));
    }

    @Transactional(readOnly = true)
    public PageResult<OrderItem> getCustomerOrders(Long customerId, String category, int page, int size) {
        if (!customerRepo.existsById(customerId)) {
            throw new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + customerId);
        }
        String cat = category == null ? "" : category.trim().toUpperCase(Locale.ROOT);
        if (!cat.isEmpty() && !CATEGORIES.contains(cat)) cat = "";

        List<SalesOrder> allCustomerOrders = orderRepo.findByCrmCustomerIdOrderBySaleDateDescIdDesc(customerId);

        // 1. Phân loại các đơn phụ kiện bán kèm (bắt đầu bằng PK-KEM-) và đơn chính
        List<SalesOrder> accompanyingOrders = new ArrayList<>();
        List<SalesOrder> primaryOrders = new ArrayList<>();

        for (SalesOrder o : allCustomerOrders) {
            if (o.getTransactionId() != null && o.getTransactionId().startsWith("PK-KEM-")) {
                accompanyingOrders.add(o);
            } else {
                primaryOrders.add(o);
            }
        }

        // 2. Ghép từng đơn phụ kiện bán kèm vào đơn bán máy tương ứng
        Map<Long, OrderItem> accompanyingMap = new HashMap<>(); // key: machine order id -> accompanying OrderItem
        Set<Long> matchedAccIds = new HashSet<>();

        for (SalesOrder acc : accompanyingOrders) {
            String accTxn = acc.getTransactionId();
            String cycleKey = accTxn.substring("PK-KEM-".length()).trim(); // ví dụ: MP2SATYL::1

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

        // 3. Xây dựng danh sách OrderItem đã ghép
        List<OrderItem> combinedList = new ArrayList<>();

        for (SalesOrder o : primaryOrders) {
            OrderItem accItem = accompanyingMap.get(o.getId());
            combinedList.add(OrderItem.from(o, accItem));
        }

        // Nếu có đơn PK-KEM nào mồ côi (không tìm thấy máy), giữ lại để không mất
        for (SalesOrder acc : accompanyingOrders) {
            if (!matchedAccIds.contains(acc.getId())) {
                combinedList.add(OrderItem.from(acc, null));
            }
        }

        // 4. Lọc theo danh mục nếu người dùng chọn
        List<OrderItem> filteredList;
        if (cat.isEmpty()) {
            filteredList = combinedList;
        } else if ("MACHINE".equals(cat)) {
            filteredList = combinedList.stream()
                    .filter(i -> "MACHINE".equalsIgnoreCase(i.orderCategory()))
                    .toList();
        } else if ("ACCESSORY".equals(cat)) {
            // Danh mục phụ kiện: hiển thị đơn phụ kiện độc lập hoặc phụ kiện mồ côi
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

        // 5. Phân trang
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
        return new CrmSummary(customerRepo.count(), orderRepo.countByCrmCustomerIdIsNull());
    }

    /**
     * Gán thủ công một đơn chưa xác định khách bằng cách bổ sung SĐT (và tên) cho đơn đó.
     * Việc gắn khách được thực hiện tự động sau khi lưu.
     */
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
    }

    private static String normalizeKeyword(String keyword) {
        if (keyword == null) return "";
        String kw = keyword.trim();
        String digits = kw.replaceAll("[\\s.\\-]", "");
        // Nếu người dùng nhập toàn số (SĐT) thì bỏ khoảng trắng/dấu chấm để khớp phone_normalized
        return digits.matches("\\d+") ? digits : kw;
    }

    private static int clampSize(int size) {
        if (size <= 0) return 20;
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
