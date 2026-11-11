package com.qkshop.tonkho;

import com.qkshop.tonkho.accessory.Accessory;
import com.qkshop.tonkho.accessory.AccessoryController;
import com.qkshop.tonkho.accessory.AccessoryHistory;
import com.qkshop.tonkho.accessory.AccessoryRepository;
import com.qkshop.tonkho.accessory.AccessoryService;
import com.qkshop.tonkho.intake.IntakeType;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.machine.MachineService;
import com.qkshop.tonkho.part.Part;
import com.qkshop.tonkho.part.PartRepository;
import com.qkshop.tonkho.repair.RepairOrder;
import com.qkshop.tonkho.repair.RepairOrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.task.scheduling.enabled=false",
        "gsheet.enabled=false",
        "gsheet.cron-enabled=false",
        "gsheet.scheduler.enabled=false",
        "crm.startup-sync.enabled=false"
})
@Transactional
class BackendAuditRemediationTest {

    @Autowired
    private AccessoryService accessoryService;

    @Autowired
    private AccessoryController accessoryController;

    @Autowired
    private AccessoryRepository accessoryRepository;

    @Autowired
    private PartRepository partRepository;

    @Autowired
    private RepairOrderService repairOrderService;

    @Autowired
    private MachineService machineService;

    @Autowired
    private ActiveInventoryRepository activeInventoryRepository;

    @BeforeEach
    void setUpSecurityContext() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );
    }

    @Test
    void testAccessorySkuGenerationAndCrud() {
        String nextSku = accessoryService.generateNextSku("CHUOT");
        assertTrue(nextSku.startsWith("PK-CHUOT-"));

        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("name", "Chuột Logitech G304 Test");
        submitPayload.put("category", "CHUOT");
        submitPayload.put("quantity", 12);
        submitPayload.put("price", "750000");
        submitPayload.put("defaultWarrantyMonths", 12);
        submitPayload.put("note", "Nhập test SKU tự động");

        Accessory created = accessoryController.submitAccessory(submitPayload).getBody().getData();
        assertNotNull(created);
        assertNotNull(created.getId());
        assertEquals(nextSku, created.getSku());
        assertEquals(12, created.getDefaultWarrantyMonths());

        // Kiểm tra lọc LOW_STOCK / IN_STOCK
        List<Accessory> inStock = accessoryService.getAllAccessories("G304 Test", "CHUOT", "IN_STOCK");
        assertTrue(inStock.stream().anyMatch(a -> a.getId().equals(created.getId())));

        // Cập nhật phụ kiện và điều chỉnh tồn kho
        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("name", "Chuột Logitech G304 Lightspeed");
        updatePayload.put("price", "790000");
        updatePayload.put("quantity", 4);
        updatePayload.put("defaultWarrantyMonths", 24);

        Accessory updated = accessoryService.updateAccessory(created.getId(), updatePayload);
        assertEquals("Chuột Logitech G304 Lightspeed", updated.getName());
        assertEquals(new BigDecimal("790000"), updated.getPrice());
        assertEquals(4, updated.getQuantity());
        assertEquals(24, updated.getDefaultWarrantyMonths());

        List<Accessory> lowStock = accessoryService.getAllAccessories("G304 Lightspeed", "CHUOT", "LOW_STOCK");
        assertTrue(lowStock.stream().anyMatch(a -> a.getId().equals(created.getId())));

        List<AccessoryHistory> history = accessoryController.getAccessoryHistory(created.getSku()).getBody().getData();
        assertNotNull(history);
        assertTrue(history.size() >= 2, "Phải ghi nhận lịch sử IMPORT và ADJUST");

        // Xóa phụ kiện
        accessoryService.deleteAccessory(created.getId());
        assertFalse(accessoryRepository.findById(created.getId()).isPresent());
    }

    @Test
    void testRepairOrderUpdateAndCancelRestoresStock() {
        String partSku = "LK-RAM-AUDIT-" + System.currentTimeMillis();
        Part part = Part.builder()
                .sku(partSku)
                .name("RAM DDR4 16GB Bus 3200")
                .category("RAM")
                .quantity(10)
                .importPrice(new BigDecimal("600000"))
                .retailPrice(new BigDecimal("850000"))
                .warrantyMonths(12)
                .build();
        partRepository.save(part);

        Map<String, Object> createPayload = new HashMap<>();
        createPayload.put("customerName", "Khách Sửa Máy");
        createPayload.put("customerPhone", "0912345678");
        createPayload.put("deviceModel", "ThinkPad T14");
        createPayload.put("technicianName", "KTV_A");

        Map<String, Object> item1 = new HashMap<>();
        item1.put("serviceName", "Nâng cấp RAM 16GB");
        item1.put("sku", partSku);
        item1.put("quantity", 2);
        item1.put("price", "850000");
        createPayload.put("services", List.of(item1));

        RepairOrder order = repairOrderService.createRepairOrder(createPayload);
        assertEquals(8, partRepository.findBySku(partSku).orElseThrow().getQuantity(),
                "Tạo đơn sửa chữa với 2 thanh RAM phải trừ tồn kho từ 10 xuống 8");

        // Cập nhật phiếu sửa chữa giảm từ 2 thanh xuống 1 thanh
        Map<String, Object> updatePayload = new HashMap<>();
        Map<String, Object> itemUpdated = new HashMap<>();
        itemUpdated.put("serviceName", "Nâng cấp RAM 16GB");
        itemUpdated.put("sku", partSku);
        itemUpdated.put("quantity", 1);
        itemUpdated.put("price", "850000");
        updatePayload.put("services", List.of(itemUpdated));

        repairOrderService.updateRepairOrder(order.getId(), updatePayload);
        assertEquals(9, partRepository.findBySku(partSku).orElseThrow().getQuantity(),
                "Cập nhật phiếu sửa chữa từ 2 xuống 1 thanh phải hoàn 2 và trừ 1 -> tồn kho còn 9");

        // Hủy phiếu sửa chữa -> hoàn lại 1 thanh về kho -> tồn kho = 10
        repairOrderService.updateOrderStatus(order.getId(), "CANCELLED");
        assertEquals(10, partRepository.findBySku(partSku).orElseThrow().getQuantity(),
                "Hủy phiếu sửa chữa phải hoàn trả linh kiện về kho (10)");

        // Khôi phục lại từ CANCELLED sang COMPLETED -> trừ lại 1 thanh -> tồn kho = 9
        repairOrderService.updateOrderStatus(order.getId(), "COMPLETED");
        assertEquals(9, partRepository.findBySku(partSku).orElseThrow().getQuantity(),
                "Khôi phục phiếu sửa chữa từ CANCELLED phải trừ lại linh kiện (9)");
    }

    @Test
    void testMachineBulkPriceAndDirectDaBanBlocked() {
        String testSerial = "SN-AUDIT-" + System.currentTimeMillis();
        ActiveInventory ai = ActiveInventory.builder()
                .cycleId("CYC-AUDIT-" + System.currentTimeMillis())
                .serialKey(testSerial)
                .state(CycleState.READY)
                .intakeType(IntakeType.PURCHASE)
                .intakeAt(LocalDateTime.now())
                .sourceModelText("Dell Latitude 7420")
                .salePrice(new BigDecimal("12000000"))
                .build();
        activeInventoryRepository.save(ai);

        Map<String, Object> bulkPayload = new HashMap<>();
        bulkPayload.put("serials", List.of(testSerial));
        bulkPayload.put("price", "13500000");

        int updated = machineService.updateBulkPrice(bulkPayload);
        assertEquals(1, updated);
        assertEquals(new BigDecimal("13500000"),
                activeInventoryRepository.findBySerialKey(testSerial).orElseThrow().getSalePrice());

        Map<String, Object> updates = Map.of("status", "DA_BAN");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> machineService.updateMachine(testSerial, updates, "admin"));
        assertTrue(ex.getMessage().contains("Bán Hàng"));
    }
}
