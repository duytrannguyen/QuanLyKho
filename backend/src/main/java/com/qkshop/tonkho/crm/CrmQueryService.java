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
    private final CrmCareNoteRepository careNoteRepo;

    @Transactional(readOnly = true)
    public PageResult<CustomerItem> searchCustomers(String keyword, String sortBy, String direction, int page, int size) {
        return searchCustomers(keyword, "", sortBy, direction, page, size);
    }

    @Transactional(readOnly = true)
    public PageResult<CustomerItem> searchCustomers(String keyword, String filterType, String sortBy, String direction, int page, int size) {
        String kw = normalizeKeyword(keyword);
        String ft = filterType == null ? "" : filterType.trim().toUpperCase(Locale.ROOT);
        String sortProp = SORTABLE.contains(sortBy) ? sortBy : "lastOrderAt";
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        PageRequest pageable = PageRequest.of(Math.max(page, 0), clampSize(size),
                Sort.by(dir, sortProp).and(Sort.by(Sort.Direction.DESC, "id")));

        java.time.LocalDate expiringBefore = java.time.LocalDate.now().plusDays(30);
        java.time.LocalDateTime sixMonthsAgo = java.time.LocalDateTime.now().minusMonths(6);
        java.time.LocalDateTime twelveMonthsAgo = java.time.LocalDateTime.now().minusMonths(12);

        Page<CrmCustomer> result = customerRepo.searchWithFilter(kw, ft, expiringBefore, sixMonthsAgo, twelveMonthsAgo, pageable);
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
        java.time.LocalDate expiringBefore = java.time.LocalDate.now().plusDays(30);
        java.time.LocalDateTime sixMonthsAgo = java.time.LocalDateTime.now().minusMonths(6);
        java.time.LocalDateTime twelveMonthsAgo = java.time.LocalDateTime.now().minusMonths(12);
        long total = customerRepo.count();
        long unlinked = orderRepo.countByCrmCustomerIdIsNull();
        long expiring = customerRepo.countWarrantyExpiring(expiringBefore);
        long maintenance = customerRepo.countMaintenanceDue(sixMonthsAgo, twelveMonthsAgo);
        return new CrmSummary(total, unlinked, expiring, maintenance);
    }

    /**
     * Cập nhật thông tin hồ sơ khách hàng.
     */
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
        return CustomerItem.from(c);
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

    /**
     * Lấy danh sách lịch sử tương tác chăm sóc khách hàng.
     */
    @Transactional(readOnly = true)
    public List<CareNoteItem> getCareNotes(Long customerId) {
        if (!customerRepo.existsById(customerId)) {
            throw new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + customerId);
        }
        return careNoteRepo.findByCustomer_IdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(CareNoteItem::from)
                .toList();
    }

    /**
     * Thêm một ghi chú chăm sóc khách hàng mới.
     */
    @Transactional(rollbackFor = Exception.class)
    public CareNoteItem addCareNote(Long customerId, CreateCareNoteRequest req, String username) {
        CrmCustomer c = customerRepo.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng với mã " + customerId));

        CrmCareNote note = CrmCareNote.builder()
                .customer(c)
                .interactionType(req.interactionType().trim())
                .content(req.content().trim())
                .followUpDate(req.followUpDate())
                .createdBy(username != null && !username.isBlank() ? username : "Hệ thống")
                .build();

        CrmCareNote saved = careNoteRepo.save(note);
        return CareNoteItem.from(saved);
    }

    /**
     * Xuất danh sách khách hàng ra file Excel theo bộ lọc hiện tại.
     */
    @Transactional(readOnly = true)
    public org.springframework.core.io.ByteArrayResource generateCustomersExcel(String keyword, String filterType, String sortBy, String direction) {
        PageResult<CustomerItem> page = searchCustomers(keyword, filterType, sortBy, direction, 0, 3000);
        List<CustomerItem> list = page.items();

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("KhachHang_CRM");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            String[] headers = {
                    "STT", "Số điện thoại", "Họ tên", "Phân loại", "Địa chỉ",
                    "Email", "Ngày sinh", "Tổng đơn", "Tổng chi tiêu (VNĐ)",
                    "Đơn đầu tiên", "Đơn gần nhất", "Ghi chú sở thích / nhu cầu"
            };

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
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

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new org.springframework.core.io.ByteArrayResource(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xuất danh sách khách hàng ra Excel: " + e.getMessage(), e);
        }
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
