package com.qkshop.tonkho.salesreport;

import com.qkshop.tonkho.accessory.Accessory;
import com.qkshop.tonkho.accessory.AccessoryOrder;
import com.qkshop.tonkho.accessory.AccessoryOrderRepository;
import com.qkshop.tonkho.accessory.AccessoryRepository;
import com.qkshop.tonkho.accessory.AccessoryService;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inventory.InventoryCycleService;
import com.qkshop.tonkho.machine.SerialRegistry;
import com.qkshop.tonkho.machine.SerialRegistryRepository;
import com.qkshop.tonkho.repair.RepairOrder;
import com.qkshop.tonkho.repair.RepairOrderRepository;
import com.qkshop.tonkho.repair.RepairOrderService;
import com.qkshop.tonkho.sale.SaleController;
import com.qkshop.tonkho.sync.ReconciliationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
        "gsheet.scheduler.enabled=false"
})
class OrderSyncIntegrationTest {

    @Autowired
    private InventoryCycleService inventoryCycleService;

    @Autowired
    private SaleController saleController;

    @Autowired
    private AccessoryService accessoryService;

    @Autowired
    private RepairOrderService repairOrderService;

    @Autowired
    private SalesOrderRepository salesOrderRepo;

    @Autowired
    private ClosedCycleRepository closedCycleRepo;

    @Autowired
    private ActiveInventoryRepository activeInventoryRepo;

    @Autowired
    private SerialRegistryRepository serialRegistryRepo;

    @Autowired
    private AccessoryRepository accessoryRepo;

    @Autowired
    private AccessoryOrderRepository accessoryOrderRepo;

    @Autowired
    private RepairOrderRepository repairOrderRepo;

    @Test
    void testAccessoryOrderSyncsToSalesOrder() {
        // Tạo phụ kiện trong kho
        String testSku = "PK-TEST-" + System.currentTimeMillis();
        Accessory acc = Accessory.builder()
                .sku(testSku)
                .name("Chuột Không Dây Test")
                .quantity(10)
                .price(new BigDecimal("250000"))
                .defaultWarrantyMonths(12)
                .category("CHUOT")
                .build();
        accessoryRepo.save(acc);

        // Tạo đơn bán phụ kiện lẻ
        Map<String, Object> payload = new HashMap<>();
        payload.put("customerName", "Nguyen Van Test");
        payload.put("customerPhone", "0901234567");
        payload.put("salesperson", "NV_TEST");
        payload.put("saleNote", "Khách mua lẻ chuột test");
        payload.put("discount", "20000");

        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> item = new HashMap<>();
        item.put("sku", testSku);
        item.put("quantity", 1);
        item.put("price", "250000");
        item.put("warrantyMonths", 12);
        items.add(item);
        payload.put("accessories", items);

        AccessoryOrder order = accessoryService.createAccessoryOrder(payload);
        assertNotNull(order);
        assertNotNull(order.getOrderCode());

        // Kiểm tra tồn kho phụ kiện đã giảm
        Accessory updatedAcc = accessoryRepo.findBySku(testSku).orElseThrow();
        assertEquals(9, updatedAcc.getQuantity());

        // Kiểm tra tự động đồng bộ sang SalesOrder
        Optional<SalesOrder> soOpt = salesOrderRepo.findByTransactionId(order.getOrderCode());
        assertTrue(soOpt.isPresent(), "SalesOrder phải được tạo tự động cho đơn phụ kiện");
        SalesOrder so = soOpt.get();
        assertEquals("ACCESSORY", so.getOrderCategory());
        assertEquals("Nguyen Van Test", so.getCustomerName());
        assertEquals("0901234567", so.getCustomerPhone());
        assertEquals(new BigDecimal("230000"), so.getNetRevenue());
        assertEquals("Hoàn tất", so.getOrderStatus());
    }

    @Test
    void testRepairOrderSyncsToSalesOrderAndDeductsAccessory() {
        // Tạo phụ kiện làm linh kiện thay thế
        String testSku = "LK-TEST-" + System.currentTimeMillis();
        Accessory part = Accessory.builder()
                .sku(testSku)
                .name("Pin Dell XPS 9500 Zin")
                .quantity(5)
                .price(new BigDecimal("1200000"))
                .defaultWarrantyMonths(6)
                .category("PIN")
                .build();
        accessoryRepo.save(part);

        // Tạo phiếu dịch vụ sửa chữa có kèm linh kiện
        Map<String, Object> payload = new HashMap<>();
        payload.put("customerName", "Tran Thi Test");
        payload.put("customerPhone", "0987654321");
        payload.put("deviceModel", "Dell XPS 9500");
        payload.put("technicianName", "KT_TEST");
        payload.put("note", "Thay pin và vệ sinh máy");

        List<Map<String, Object>> services = new ArrayList<>();
        Map<String, Object> s1 = new HashMap<>();
        s1.put("serviceName", "Thay pin Dell XPS 9500");
        s1.put("sku", testSku);
        s1.put("quantity", 1);
        s1.put("price", "1200000");
        s1.put("warrantyMonths", 6);
        services.add(s1);

        Map<String, Object> s2 = new HashMap<>();
        s2.put("serviceName", "Vệ sinh tra keo tản nhiệt");
        s2.put("quantity", 1);
        s2.put("price", "150000");
        services.add(s2);

        payload.put("services", services);

        RepairOrder repairOrder = repairOrderService.createRepairOrder(payload);
        assertNotNull(repairOrder);
        assertNotNull(repairOrder.getOrderCode());

        // Kiểm tra linh kiện trong kho đã được trừ
        Accessory updatedPart = accessoryRepo.findBySku(testSku).orElseThrow();
        assertEquals(4, updatedPart.getQuantity(), "Kho phụ kiện phải giảm 1 sau khi thay thế");

        // Kiểm tra tự động đồng bộ sang SalesOrder
        Optional<SalesOrder> soOpt = salesOrderRepo.findByTransactionId(repairOrder.getOrderCode());
        assertTrue(soOpt.isPresent(), "SalesOrder phải được tạo tự động cho đơn sửa chữa");
        SalesOrder so = soOpt.get();
        assertEquals("REPAIR", so.getOrderCategory());
        assertEquals("Tran Thi Test", so.getCustomerName());
        assertEquals("0987654321", so.getCustomerPhone());
        assertEquals(new BigDecimal("1350000"), so.getNetRevenue());
        assertEquals("Hoàn tất", so.getOrderStatus());
    }

    @Test
    void testUpdateMachineOrderSyncsToSalesOrder() {
        String testSerial = "SERIAL-SYNC-TEST-" + System.currentTimeMillis();
        String testCycleId = "CYC-TEST-" + System.currentTimeMillis();

        // Tạo ClosedCycle
        ClosedCycle cc = ClosedCycle.builder()
                .cycleId(testCycleId)
                .serialKey(testSerial)
                .closeEventId("EVT-TEST-" + System.currentTimeMillis())
                .customerName("Khách Hàng Cũ")
                .customerPhone("0911111111")
                .warrantyPeriod("3 Tháng")
                .saleDate(LocalDateTime.now())
                .closeType(CloseType.SALE)
                .build();
        closedCycleRepo.save(cc);

        // Tạo SalesOrder tương ứng
        SalesOrder so = SalesOrder.builder()
                .transactionId("WEB-" + testCycleId)
                .matchedCycleId(testCycleId)
                .serialKeys(testSerial)
                .customerName("Khách Hàng Cũ")
                .customerPhone("0911111111")
                .warrantyPeriod("3 Tháng")
                .orderStatus("Hoàn tất")
                .paymentStatus("Đã thanh toán")
                .netRevenue(new BigDecimal("15000000"))
                .grossRevenue(new BigDecimal("15000000"))
                .origin("WEB_APP")
                .build();
        salesOrderRepo.save(so);

        // Thực hiện cập nhật thông tin đơn hàng qua API PUT /api/sale/order/{cycleId}
        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("customerName", "Khách Hàng Mới Cập Nhật");
        updatePayload.put("customerPhone", "0999999999");
        updatePayload.put("warrantyPeriod", "12 Tháng");
        updatePayload.put("saleNote", "Đã nâng cấp gói bảo hành VIP");

        saleController.updateMachineOrder(testCycleId, updatePayload);

        // Kiểm tra ClosedCycle đã cập nhật
        ClosedCycle updatedCc = closedCycleRepo.findByCycleId(testCycleId).orElseThrow();
        assertEquals("Khách Hàng Mới Cập Nhật", updatedCc.getCustomerName());
        assertEquals("0999999999", updatedCc.getCustomerPhone());
        assertEquals("12 Tháng", updatedCc.getWarrantyPeriod());

        // Kiểm tra SalesOrder ĐÃ TỰ ĐỘNG ĐỒNG BỘ
        SalesOrder updatedSo = salesOrderRepo.findByMatchedCycleId(testCycleId).orElseThrow();
        assertEquals("Khách Hàng Mới Cập Nhật", updatedSo.getCustomerName());
        assertEquals("0999999999", updatedSo.getCustomerPhone());
        assertEquals("12 Tháng", updatedSo.getWarrantyPeriod());
        assertEquals("Đã nâng cấp gói bảo hành VIP", updatedSo.getNote());
    }
}
