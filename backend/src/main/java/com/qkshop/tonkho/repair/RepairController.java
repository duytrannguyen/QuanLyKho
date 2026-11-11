package com.qkshop.tonkho.repair;

import com.qkshop.tonkho.core.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/repair")
@RequiredArgsConstructor
public class RepairController {

    private final RepairOrderService repairOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RepairOrder>>> getOrders(
            @RequestParam(required = false) String keyword) {
        List<RepairOrder> orders = repairOrderService.getAllOrders(keyword);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lấy danh sách đơn dịch vụ sửa chữa thành công", orders));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepairOrder>> getOrderById(@PathVariable Long id) {
        RepairOrder order = repairOrderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Chi tiết đơn dịch vụ sửa chữa", order));
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('SERVICE_REPAIR')")
    public ResponseEntity<ApiResponse<RepairOrder>> createOrder(@RequestBody Map<String, Object> payload) {
        RepairOrder created = repairOrderService.createRepairOrder(payload);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lưu đơn dịch vụ sửa chữa thành công", created));
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('SERVICE_REPAIR', 'ORDER_EDIT')")
    public ResponseEntity<ApiResponse<RepairOrder>> updateOrder(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        RepairOrder updated = repairOrderService.updateRepairOrder(id, payload);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật đơn dịch vụ sửa chữa thành công", updated));
    }

    @PutMapping("/{id}/status")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('SERVICE_REPAIR')")
    public ResponseEntity<ApiResponse<RepairOrder>> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        RepairOrder updated = repairOrderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật trạng thái đơn sửa chữa thành công", updated));
    }

    @GetMapping("/by-serial")
    public ResponseEntity<ApiResponse<List<RepairOrder>>> getOrdersBySerial(
            @RequestParam(required = false, defaultValue = "") String serial) {
        if (serial == null || serial.trim().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.okWithMessage("Lịch sử sửa chữa theo serial", java.util.Collections.emptyList()));
        }
        List<RepairOrder> orders = repairOrderService.getOrdersBySerial(serial.trim());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lịch sử sửa chữa theo serial", orders));
    }

    @GetMapping("/services")
    public ResponseEntity<ApiResponse<List<RepairOrderItem>>> searchServices(
            @RequestParam(required = false) String keyword) {
        List<RepairOrderItem> items = repairOrderService.searchServiceItems(keyword);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Tìm kiếm dịch vụ thành công", items));
    }
}
