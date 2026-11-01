package com.qkshop.tonkho.crm;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.crm.CrmDtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * API tra cứu khách hàng (CRM): danh sách khách + tổng giao dịch, và toàn bộ hóa đơn của từng khách.
 */
@Slf4j
@RestController
@RequestMapping("/api/crm")
@RequiredArgsConstructor
public class CrmController {

    private final CrmQueryService queryService;
    private final CrmCustomerLinkService linkService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<CrmSummary>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok(queryService.getSummary()));
    }

    @GetMapping("/customers")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<PageResult<CustomerItem>>> searchCustomers(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "") String filterType,
            @RequestParam(defaultValue = "lastOrderAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                queryService.searchCustomers(keyword, filterType, sortBy, direction, page, size)));
    }

    @GetMapping("/customers/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<CustomerItem>> getCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(queryService.getCustomer(id)));
    }

    @PutMapping("/customers/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_MANAGE')")
    public ResponseEntity<ApiResponse<CustomerItem>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        CustomerItem updated = queryService.updateCustomer(id, request);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thông tin khách hàng thành công.", updated));
    }

    @GetMapping("/customers/{id}/orders")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<PageResult<OrderItem>>> getCustomerOrders(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.ok(queryService.getCustomerOrders(id, category, page, size)));
    }

    @GetMapping("/orders/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<OrderItem>> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(queryService.getOrder(id)));
    }

    @GetMapping("/unlinked-orders")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<PageResult<OrderItem>>> getUnlinkedOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(queryService.getUnlinkedOrders(page, size)));
    }

    @PostMapping("/orders/assign")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> assignOrder(@Valid @RequestBody AssignOrderRequest request) {
        try {
            queryService.assignOrder(request);
            log.info("[CRM] Đã gán đơn {} cho khách có SĐT {}", request.orderId(), request.phone());
            return ResponseEntity.ok(ApiResponse.okWithMessage("Đã gán đơn hàng cho khách hàng thành công.", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_PHONE", e.getMessage()));
        }
    }

    @GetMapping("/customers/{id}/care-notes")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<java.util.List<CareNoteItem>>> getCareNotes(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(queryService.getCareNotes(id)));
    }

    @PostMapping("/customers/{id}/care-notes")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_MANAGE')")
    public ResponseEntity<ApiResponse<CareNoteItem>> addCareNote(
            @PathVariable Long id,
            @Valid @RequestBody CreateCareNoteRequest request,
            java.security.Principal principal) {
        String username = principal != null ? principal.getName() : "Nhân viên";
        CareNoteItem item = queryService.addCareNote(id, request, username);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Thêm ghi chú chăm sóc khách hàng thành công.", item));
    }

    @GetMapping("/customers/export-excel")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<org.springframework.core.io.Resource> exportCustomersExcel(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "") String filterType,
            @RequestParam(defaultValue = "lastOrderAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        org.springframework.core.io.ByteArrayResource resource =
                queryService.generateCustomersExcel(keyword, filterType, sortBy, direction);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Danh_Sach_Khach_Hang_CRM.xlsx")
                .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(resource);
    }

    @PostMapping("/rebuild")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_MANAGE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rebuild() {
        log.info("[CRM] Yêu cầu dựng lại dữ liệu khách hàng từ đơn hàng.");
        try {
            Map<String, Object> result = linkService.rebuildAll();
            return ResponseEntity.ok(ApiResponse.okWithMessage(
                    "Đã dựng lại dữ liệu khách hàng: " + result.get("totalCustomers") + " khách, "
                            + result.get("unlinkedOrders") + " đơn chưa xác định khách.",
                    result));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ApiResponse.error("REBUILD_IN_PROGRESS", e.getMessage()));
        }
    }
}
