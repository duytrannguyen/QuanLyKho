package com.qkshop.tonkho.salesreport;

import com.qkshop.tonkho.accessory.Accessory;
import com.qkshop.tonkho.accessory.AccessoryHistory;
import com.qkshop.tonkho.accessory.AccessoryHistoryRepository;
import com.qkshop.tonkho.accessory.AccessoryOrder;
import com.qkshop.tonkho.accessory.AccessoryOrderRepository;
import com.qkshop.tonkho.accessory.AccessoryRepository;
import com.qkshop.tonkho.accessory.AccessoryService;
import com.qkshop.tonkho.analytics.AnalyticsService;
import com.qkshop.tonkho.analytics.dto.AnalyticsFilterRequest;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.crm.CrmCustomer;
import com.qkshop.tonkho.crm.CrmCustomerRepository;
import com.qkshop.tonkho.crm.CrmDtos;
import com.qkshop.tonkho.crm.CrmQueryService;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.InventoryCycleService;
import com.qkshop.tonkho.inventory.dto.ClosedCycleDTO;
import com.qkshop.tonkho.machine.MachineService;
import com.qkshop.tonkho.machine.SerialRegistryRepository;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.part.PartHistory;
import com.qkshop.tonkho.part.PartHistoryRepository;
import com.qkshop.tonkho.repair.RepairOrder;
import com.qkshop.tonkho.repair.RepairOrderRepository;
import com.qkshop.tonkho.repair.RepairOrderService;
import com.qkshop.tonkho.sale.SaleController;
import com.qkshop.tonkho.sale.SalesConfig;
import com.qkshop.tonkho.sale.SalesConfigRepository;
import com.qkshop.tonkho.sync.SyncController;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    @Autowired
    private CrmQueryService crmQueryService;

    @Autowired
    private CrmCustomerRepository crmCustomerRepo;

    @Autowired
    private SalesConfigRepository salesConfigRepo;

    @Autowired
    private MachineService machineService;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private AccessoryHistoryRepository accessoryHistoryRepo;

    @Autowired
    private PartHistoryRepository partHistoryRepo;

    @Autowired
    private SyncController syncController;

    @Autowired
    private OrderDataSyncService orderDataSyncService;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUpSecurityContext() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );
    }

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
        assertEquals(10, order.getOrderCode().length(), "Mã hóa đơn phụ kiện phải đúng 10 ký tự");
        assertTrue(order.getOrderCode().startsWith("PK"), "Mã hóa đơn phụ kiện phải bắt đầu bằng PK");

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
        assertEquals(10, repairOrder.getOrderCode().length(), "Mã hóa đơn sửa chữa phải đúng 10 ký tự");
        assertTrue(repairOrder.getOrderCode().startsWith("SC"), "Mã hóa đơn sửa chữa phải bắt đầu bằng SC");

        // Kiểm tra linh kiện trong kho đã được trừ
        Accessory updatedPart = accessoryRepo.findBySku(testSku).orElseThrow();
        assertEquals(4, updatedPart.getQuantity(), "Kho phụ kiện phải giảm 1 sau khi thay thế");

        // Kiểm tra tự động đồng bộ sang SalesOrder (mới tiếp nhận -> netRevenue = 0)
        Optional<SalesOrder> soOpt = salesOrderRepo.findByTransactionId(repairOrder.getOrderCode());
        assertTrue(soOpt.isPresent(), "SalesOrder phải được tạo tự động cho đơn sửa chữa");
        SalesOrder so = soOpt.get();
        assertEquals("REPAIR", so.getOrderCategory());
        assertEquals("Tran Thi Test", so.getCustomerName());
        assertEquals("0987654321", so.getCustomerPhone());
        assertEquals(BigDecimal.ZERO, so.getNetRevenue(), "Đơn mới tiếp nhận chưa hoàn tất thì netRevenue = 0");
        assertEquals("Đang tiếp nhận/sửa", so.getOrderStatus());

        // Cập nhật trạng thái sang COMPLETED -> ghi nhận doanh thu
        repairOrderService.updateOrderStatus(repairOrder.getId(), "COMPLETED");
        SalesOrder soCompleted = salesOrderRepo.findByTransactionId(repairOrder.getOrderCode()).orElseThrow();
        assertEquals(new BigDecimal("1350000"), soCompleted.getNetRevenue());
        assertEquals("Hoàn tất", soCompleted.getOrderStatus());
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

    @Test
    void testCrmUpdateCustomerPropagatesToAllOrdersAndEnrichesOrderDetails() {
        long ts = System.currentTimeMillis();
        String phone = "098877" + String.format("%04d", Math.abs(ts % 10000));

        // 1. Tạo đơn máy ship có nâng cấp + đồng bộ sang SalesOrder + CRM
        String serial = "SN-CRM-PROP-" + ts;
        String cycleId = "CYC-PROP-" + ts;
        ClosedCycle cc = closedCycleRepo.save(ClosedCycle.builder()
                .cycleId(cycleId)
                .serialKey(serial)
                .closeEventId("EVT-PROP-" + ts)
                .sourceReference("BM-PROP-" + ts)
                .customerName("Tên Cũ Ban Đầu")
                .customerPhone(phone)
                .upgradeNote("Nâng cấp RAM 32GB [+800000đ]")
                .warrantyPeriod("6 Tháng")
                .isShipping(true)
                .isDelivered(true)
                .deliveryDate(LocalDate.now())
                .shippingCarrier("GHTK")
                .trackingCode("TRACK-PROP-99")
                .shippingAddress("Địa chỉ cũ 01")
                .saleDate(LocalDateTime.now())
                .grossRevenue(new BigDecimal("16000000"))
                .salePriceSnapshot(new BigDecimal("15000000"))
                .discount(new BigDecimal("1000000"))
                .closeType(CloseType.SALE)
                .closedBy("NV_CHOT")
                .build());
        orderDataSyncService.syncClosedCycleToSalesOrder(cc);

        // 2. Tạo đơn phụ kiện + đơn sửa chữa cùng SĐT
        String accSku = "PK-PROP-" + ts;
        accessoryRepo.save(Accessory.builder()
                .sku(accSku)
                .name("Túi chống sốc QK")
                .quantity(5)
                .price(new BigDecimal("350000"))
                .defaultWarrantyMonths(3)
                .category("BALO_TUI")
                .build());
        Map<String, Object> accPayload = new HashMap<>();
        accPayload.put("customerName", "Tên Cũ Ban Đầu");
        accPayload.put("customerPhone", phone);
        accPayload.put("salesperson", "NV_PK");
        accPayload.put("accessories", List.of(Map.of(
                "sku", accSku,
                "quantity", 1,
                "price", "350000",
                "warrantyMonths", 3
        )));
        AccessoryOrder accOrder = accessoryService.createAccessoryOrder(accPayload);

        Map<String, Object> repPayload = new HashMap<>();
        repPayload.put("customerName", "Tên Cũ Ban Đầu");
        repPayload.put("customerPhone", phone);
        repPayload.put("deviceModel", "ThinkPad T14s");
        repPayload.put("deviceSerial", "SN-IN-REPAIR-01");
        repPayload.put("intakeCondition", "Vỏ trầy nhẹ góc");
        repPayload.put("accessoriesReceived", "Sạc 65W zin");
        repPayload.put("promisedDate", LocalDate.now().plusDays(2).toString());
        repPayload.put("technicianName", "KT_SC");
        repPayload.put("services", List.of(Map.of(
                "serviceName", "Thay quạt tản nhiệt",
                "quantity", 1,
                "price", "500000",
                "warrantyMonths", 6
        )));
        RepairOrder repairOrder = repairOrderService.createRepairOrder(repPayload);

        entityManager.flush();
        entityManager.clear();

        CrmCustomer crmCustomer = crmCustomerRepo.findByPhoneNormalized(phone).orElseThrow();

        // 3. Cập nhật hồ sơ CRM -> phải lan tỏa tên & địa chỉ về toàn bộ đơn gốc và SalesOrder
        crmQueryService.updateCustomer(crmCustomer.getId(), new CrmDtos.UpdateCustomerRequest(
                "Nguyễn Văn Đồng Bộ",
                "99 Lê Lợi, Quận 1, TP.HCM",
                LocalDate.of(1995, 5, 20),
                "dongbo@qkshop.vn",
                "Khách VIP"
        ));
        entityManager.flush();
        entityManager.clear();

        ClosedCycle syncedCc = closedCycleRepo.findByCycleId(cycleId).orElseThrow();
        assertEquals("Nguyễn Văn Đồng Bộ", syncedCc.getCustomerName());
        assertEquals("99 Lê Lợi, Quận 1, TP.HCM", syncedCc.getShippingAddress());

        AccessoryOrder syncedAcc = accessoryOrderRepo.findByOrderCode(accOrder.getOrderCode()).orElseThrow();
        assertEquals("Nguyễn Văn Đồng Bộ", syncedAcc.getCustomerName());

        RepairOrder syncedRep = repairOrderRepo.findByOrderCode(repairOrder.getOrderCode()).orElseThrow();
        assertEquals("Nguyễn Văn Đồng Bộ", syncedRep.getCustomerName());

        List<SalesOrder> crmOrders = salesOrderRepo.findByCrmCustomerId(crmCustomer.getId());
        assertTrue(crmOrders.size() >= 3);
        assertTrue(crmOrders.stream().allMatch(so -> "Nguyễn Văn Đồng Bộ".equals(so.getCustomerName())));
        SalesOrder machineSo = salesOrderRepo.findByMatchedCycleId(cycleId).orElseThrow();
        assertEquals("99 Lê Lợi, Quận 1, TP.HCM", machineSo.getShippingAddress());

        // 4. Kiểm tra CRM OrderItem được làm giàu đầy đủ upgradeNote, shipping, repair intake và detailItems
        CrmDtos.PageResult<CrmDtos.OrderItem> ordersPage = crmQueryService.getCustomerOrders(crmCustomer.getId(), "", 0, 20);
        CrmDtos.OrderItem machineItem = ordersPage.items().stream()
                .filter(i -> cycleId.equals(i.matchedCycleId()))
                .findFirst().orElseThrow();
        assertEquals("Nâng cấp RAM 32GB [+800000đ]", machineItem.upgradeNote());
        assertEquals("TRACK-PROP-99", machineItem.trackingCode());
        assertEquals("99 Lê Lợi, Quận 1, TP.HCM", machineItem.shippingAddress());

        CrmDtos.OrderItem accItem = ordersPage.items().stream()
                .filter(i -> accOrder.getOrderCode().equals(i.transactionId()))
                .findFirst().orElseThrow();
        assertFalse(accItem.detailItems().isEmpty());
        assertEquals("Túi chống sốc QK", accItem.detailItems().get(0).name());

        CrmDtos.OrderItem repItem = ordersPage.items().stream()
                .filter(i -> repairOrder.getOrderCode().equals(i.transactionId()))
                .findFirst().orElseThrow();
        assertEquals("SN-IN-REPAIR-01", repItem.deviceSerial());
        assertEquals("Vỏ trầy nhẹ góc", repItem.intakeCondition());
        assertEquals("Sạc 65W zin", repItem.accessoriesReceived());
        assertNotNull(repItem.promisedDate());
        assertFalse(repItem.detailItems().isEmpty());
    }

    @Test
    void testSaleControllerUpdatesSyncAndPreserveCustomerReturnStatus() {
        long ts = System.currentTimeMillis();

        // 1. Đơn máy đã hoàn/trả (CUSTOMER_RETURN): sửa thông tin khách không được ghi đè thành Hoàn tất
        String returnCycleId = "CYC-RET-KEEP-" + ts;
        ClosedCycle returnedCc = closedCycleRepo.save(ClosedCycle.builder()
                .cycleId(returnCycleId)
                .serialKey("SN-RET-KEEP-" + ts)
                .closeEventId("EVT-RET-" + ts)
                .customerName("Khách Trả Trước")
                .customerPhone("0912345601")
                .warrantyPeriod("Đã hủy (Khách trả hàng)")
                .saleDate(LocalDateTime.now())
                .salePriceSnapshot(new BigDecimal("14000000"))
                .grossRevenue(new BigDecimal("14000000"))
                .closeType(CloseType.CUSTOMER_RETURN)
                .build());
        orderDataSyncService.syncClosedCycleToSalesOrder(returnedCc);

        saleController.updateMachineOrder(returnCycleId, Map.of(
                "customerName", "Khách Trả Đã Đổi Tên",
                "saleNote", "Bổ sung ghi chú trả hàng"
        ));
        SalesOrder afterUpdateReturnSo = salesOrderRepo.findByMatchedCycleId(returnCycleId).orElseThrow();
        assertEquals("Khách Trả Đã Đổi Tên", afterUpdateReturnSo.getCustomerName());
        assertEquals("Trả hàng", afterUpdateReturnSo.getOrderStatus(),
                "Đơn CUSTOMER_RETURN không được bị ghi đè orderStatus thành Hoàn tất");
        assertEquals(0, BigDecimal.ZERO.compareTo(afterUpdateReturnSo.getNetRevenue()));

        // 2. Cập nhật đơn phụ kiện qua SaleController.updateAccessoryOrder -> đồng bộ SalesOrder
        String accSku = "PK-UPD-" + ts;
        accessoryRepo.save(Accessory.builder()
                .sku(accSku)
                .name("Bàn phím Bluetooth Test")
                .quantity(5)
                .price(new BigDecimal("500000"))
                .defaultWarrantyMonths(6)
                .category("BAN_PHIM")
                .build());
        AccessoryOrder accOrder = accessoryService.createAccessoryOrder(Map.of(
                "customerName", "Khách PK Cũ",
                "customerPhone", "0912345602",
                "accessories", List.of(Map.of("sku", accSku, "quantity", 1, "price", "500000", "warrantyMonths", 6))
        ));
        Long accItemId = accOrder.getItems().get(0).getId();

        saleController.updateAccessoryOrder(accOrder.getId(), Map.of(
                "customerName", "Khách PK Mới",
                "customerPhone", "0933445566",
                "saleNote", "Nâng bảo hành PK",
                "items", List.of(Map.of("id", accItemId, "warrantyPeriod", "12 Tháng", "warrantyMonths", 12))
        ));
        SalesOrder accSo = salesOrderRepo.findByTransactionId(accOrder.getOrderCode()).orElseThrow();
        assertEquals("Khách PK Mới", accSo.getCustomerName());
        assertEquals("0933445566", accSo.getCustomerPhone());
        assertEquals("12 Tháng", accSo.getWarrantyPeriod());
        assertEquals("Nâng bảo hành PK", accSo.getNote());

        // 3. Cập nhật đơn sửa chữa qua SaleController.updateRepairOrderWarranty -> đồng bộ SalesOrder
        RepairOrder repairOrder = repairOrderService.createRepairOrder(Map.of(
                "customerName", "Khách SC Cũ",
                "customerPhone", "0912345603",
                "deviceModel", "Dell Precision 5560",
                "services", List.of(Map.of("serviceName", "Thay màn hình 4K", "quantity", 1, "price", "3500000", "warrantyMonths", 3))
        ));
        Long repItemId = repairOrder.getItems().get(0).getId();

        saleController.updateRepairOrderWarranty(repairOrder.getId(), Map.of(
                "customerName", "Khách SC Mới",
                "customerPhone", "0944556677",
                "note", "Đã cập nhật ghi chú SC",
                "items", List.of(Map.of("id", repItemId, "warrantyPeriod", "6 Tháng", "warrantyMonths", 6))
        ));
        SalesOrder repSo = salesOrderRepo.findByTransactionId(repairOrder.getOrderCode()).orElseThrow();
        assertEquals("Khách SC Mới", repSo.getCustomerName());
        assertEquals("0944556677", repSo.getCustomerPhone());
        assertEquals("6 Tháng", repSo.getWarrantyPeriod());
        assertEquals("Đã cập nhật ghi chú SC", repSo.getNote());
    }

    @Test
    void testReturnShippingOrderPrefersGrossRevenueAndPreservesCompanyWarranty() {
        long ts = System.currentTimeMillis();
        String serial = "SN-GROSS-PREF-" + ts;

        machineService.importSingleMachine(MachineImportRequest.builder()
                .serial(serial)
                .brand("Dell")
                .productLine("Latitude")
                .modelFull("Dell Latitude 7430")
                .segment("OFFICE")
                .cpu("i7-1265U")
                .ram("16GB")
                .ssd("512GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("18000000"))
                .warrantyPeriod("Bảo hành hãng 12 Tháng")
                .build(), "admin");

        Map<String, Object> shipPayload = new HashMap<>();
        shipPayload.put("serial", serial);
        shipPayload.put("customerName", "Khách Ship Hoàn");
        shipPayload.put("customerPhone", "0955667788");
        shipPayload.put("salesperson", "nv_ban");
        shipPayload.put("warrantyPeriod", "Bảo hành hãng 12 Tháng");
        shipPayload.put("grossRevenue", "18000000");
        shipPayload.put("discount", "1500000");
        shipPayload.put("finalPrice", "16500000");
        shipPayload.put("isShipping", true);
        shipPayload.put("isDelivered", false);

        ClosedCycle soldCc = saleController.submitSale(UUID.randomUUID().toString(), shipPayload).getBody().getData();
        SalesConfig cfg = soldCc.getConfig();
        assertNotNull(cfg);

        // Giả lập bảng giá cấu hình bị chỉnh tăng về sau -> hoàn hàng phải ưu tiên grossRevenue (18tr) của đơn gốc
        cfg.setDefaultSalePrice(new BigDecimal("25000000"));
        salesConfigRepo.save(cfg);

        saleController.returnShippingOrder(soldCc.getCycleId(), Map.of("reason", "Khách hủy đơn ship"));

        ActiveInventory reopenedAi = activeInventoryRepo.findBySerialKey(serial).orElseThrow();
        assertEquals(0, new BigDecimal("18000000").compareTo(reopenedAi.getSalePrice()),
                "Giá bán khi hoàn hàng phải ưu tiên grossRevenue lúc bán thay vì defaultSalePrice hiện tại");
        assertEquals("Bảo hành hãng 12 Tháng", reopenedAi.getWarrantyPeriod(),
                "Phải bảo toàn gói bảo hành hãng gốc trên ActiveInventory sau khi hoàn hàng");

        SalesOrder returnedSo = salesOrderRepo.findByMatchedCycleId(soldCc.getCycleId()).orElseThrow();
        assertEquals("Trả hàng", returnedSo.getOrderStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(returnedSo.getNetRevenue()));
    }

    @Test
    void testMachineServiceSearchHistoryPopulatesDtoFromSalesOrderFallback() {
        long ts = System.currentTimeMillis();
        String serial = "SN-HIST-FB-" + ts;
        String cycleId = "CYC-HIST-FB-" + ts;
        String txnId = "BM-HIST-FB-" + ts;

        // ClosedCycle tối giản (config = null, thiếu nhiều trường chi tiết)
        closedCycleRepo.save(ClosedCycle.builder()
                .cycleId(cycleId)
                .serialKey(serial)
                .closeEventId("EVT-HIST-" + ts)
                .sourceReference(txnId)
                .closeType(CloseType.SALE)
                .saleDate(LocalDateTime.now())
                .build());

        // SalesOrder chứa đầy đủ dữ liệu chi tiết
        salesOrderRepo.save(SalesOrder.builder()
                .transactionId(txnId)
                .matchedCycleId(cycleId)
                .serialKeys(serial)
                .customerName("Khách Search Fallback")
                .customerPhone("0977889900")
                .productName("ThinkPad X1 Carbon Test")
                .configSummary("i7 / 16GB / 512GB")
                .grossRevenue(new BigDecimal("19000000"))
                .discount(new BigDecimal("500000"))
                .netRevenue(new BigDecimal("18500000"))
                .paymentStatus("Đã thanh toán")
                .salesperson("NV_FALLBACK")
                .saleDate(LocalDateTime.now())
                .orderCategory("MACHINE")
                .origin("WEB_APP")
                .build());

        Page<ClosedCycleDTO> page = machineService.searchHistory("0977889900", "Tất cả", "Tất cả", "Tất cả", 0, 10);
        ClosedCycleDTO dto = page.getContent().stream()
                .filter(d -> cycleId.equals(d.getCycleId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("searchHistory phải trả về chu kỳ ngay cả khi config == null"));

        assertEquals("Khách Search Fallback", dto.getCustomerName());
        assertEquals("0977889900", dto.getCustomerPhone());
        assertEquals("ThinkPad X1 Carbon Test", dto.getProductFullName());
        assertEquals("i7 / 16GB / 512GB", dto.getProductSummary());
        assertEquals(0, new BigDecimal("19000000").compareTo(dto.getGrossRevenue()));
        assertEquals(0, new BigDecimal("500000").compareTo(dto.getDiscount()));
        assertEquals(0, new BigDecimal("18500000").compareTo(dto.getSalePriceSnapshot()));
        assertEquals("Đã thanh toán", dto.getPaymentStatus());
        assertEquals("NV_FALLBACK", dto.getSalesperson());
        assertNotNull(dto.getSaleDate());
    }

    @Test
    void testAnalyticsServiceSubtractsReturnedAccessoriesAndParts() {
        long ts = System.currentTimeMillis();
        String accCat = "CAT_AN_TEST_" + ts;
        String accSku = "PK-AN-" + ts;

        accessoryRepo.save(Accessory.builder()
                .sku(accSku)
                .name("Cáp Analytics Test")
                .category(accCat)
                .quantity(10)
                .price(new BigDecimal("200000"))
                .build());

        AccessoryHistory sellAcc = new AccessoryHistory();
        sellAcc.setSku(accSku);
        sellAcc.setName("Cáp Analytics Test");
        sellAcc.setAction("SELL");
        sellAcc.setQuantity(3);
        sellAcc.setPrice(new BigDecimal("200000"));
        accessoryHistoryRepo.save(sellAcc);

        AccessoryHistory returnAcc = new AccessoryHistory();
        returnAcc.setSku(accSku);
        returnAcc.setName("Cáp Analytics Test");
        returnAcc.setAction("RETURN");
        returnAcc.setQuantity(1);
        returnAcc.setPrice(new BigDecimal("200000"));
        accessoryHistoryRepo.save(returnAcc);

        AnalyticsFilterRequest accFilter = new AnalyticsFilterRequest();
        accFilter.setPeriod("TODAY");
        accFilter.setProductType("ACCESSORY");
        accFilter.setCategory(accCat);

        Map<String, Object> accSummary = analyticsService.getSummary(accFilter);
        assertEquals(2L, accSummary.get("soldCount"));
        assertEquals(2L, accSummary.get("realSoldCount"));
        assertEquals(400000L, accSummary.get("soldValue"));

        List<Map<String, Object>> accTrend = analyticsService.getTrend(accFilter);
        assertFalse(accTrend.isEmpty());
        assertEquals(2L, accTrend.get(accTrend.size() - 1).get("ban"));

        // Kiểm tra PartHistory Action RETURN phải trừ khỏi soldCount, realSoldCount và soldValue
        AnalyticsFilterRequest partBeforeFilter = new AnalyticsFilterRequest();
        partBeforeFilter.setPeriod("TODAY");
        partBeforeFilter.setProductType("PART");
        partBeforeFilter.setCategory("PART_NONE_A_" + ts);
        Map<String, Object> basePartSummary = analyticsService.getSummary(partBeforeFilter);
        long baseSold = ((Number) basePartSummary.get("soldCount")).longValue();
        long baseReal = ((Number) basePartSummary.get("realSoldCount")).longValue();
        long baseVal = ((Number) basePartSummary.get("soldValue")).longValue();

        partHistoryRepo.save(PartHistory.builder()
                .sku("LK-AN-" + ts)
                .name("RAM Analytics Test")
                .action("UPGRADE_USE")
                .quantity(-2)
                .price(new BigDecimal("500000"))
                .orderCode("CYC-AN-" + ts)
                .build());
        partHistoryRepo.save(PartHistory.builder()
                .sku("LK-AN-" + ts)
                .name("RAM Analytics Test")
                .action("RETURN")
                .quantity(1)
                .price(new BigDecimal("500000"))
                .orderCode("CYC-AN-" + ts)
                .build());

        AnalyticsFilterRequest partAfterFilter = new AnalyticsFilterRequest();
        partAfterFilter.setPeriod("TODAY");
        partAfterFilter.setProductType("PART");
        partAfterFilter.setCategory("PART_NONE_B_" + ts);
        Map<String, Object> afterPartSummary = analyticsService.getSummary(partAfterFilter);

        assertEquals(baseSold + 1L, ((Number) afterPartSummary.get("soldCount")).longValue());
        assertEquals(baseReal + 1L, ((Number) afterPartSummary.get("realSoldCount")).longValue());
        assertEquals(baseVal + 500000L, ((Number) afterPartSummary.get("soldValue")).longValue());
    }

    @Test
    void testSyncControllerRunSyncIsDisabled() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> syncController.runSync(Map.of()));
        assertTrue(ex.getMessage().contains("đã được tắt"));
    }
}
