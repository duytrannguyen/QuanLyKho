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
            @RequestParam(defaultValue = "lastOrderAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                queryService.searchCustomers(keyword, sortBy, direction, page, size)));
    }

    @GetMapping("/customers/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CRM_VIEW')")
    public ResponseEntity<ApiResponse<CustomerItem>> getCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(queryService.getCustomer(id)));
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
