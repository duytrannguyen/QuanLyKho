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
    public ResponseEntity<ApiResponse<RepairOrder>> createOrder(@RequestBody Map<String, Object> payload) {
        RepairOrder created = repairOrderService.createRepairOrder(payload);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lưu đơn dịch vụ sửa chữa thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RepairOrder>> updateOrder(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        RepairOrder updated = repairOrderService.updateRepairOrder(id, payload);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật đơn dịch vụ sửa chữa thành công", updated));
    }

    @GetMapping("/services")
    public ResponseEntity<ApiResponse<List<RepairOrderItem>>> searchServices(
            @RequestParam(required = false) String keyword) {
        List<RepairOrderItem> items = repairOrderService.searchServiceItems(keyword);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Tìm kiếm dịch vụ thành công", items));
    }
}
