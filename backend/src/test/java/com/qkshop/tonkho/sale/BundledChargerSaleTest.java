package com.qkshop.tonkho.sale;

import com.qkshop.tonkho.accessory.Accessory;
import com.qkshop.tonkho.accessory.AccessoryController;
import com.qkshop.tonkho.accessory.AccessoryHistory;
import com.qkshop.tonkho.accessory.AccessoryHistoryRepository;
import com.qkshop.tonkho.accessory.AccessoryOrder;
import com.qkshop.tonkho.accessory.AccessoryOrderItem;
import com.qkshop.tonkho.accessory.AccessoryOrderRepository;
import com.qkshop.tonkho.accessory.AccessoryRepository;
import com.qkshop.tonkho.crm.CrmCustomer;
import com.qkshop.tonkho.crm.CrmCustomerRepository;
import com.qkshop.tonkho.crm.CrmDtos;
import com.qkshop.tonkho.crm.CrmQueryService;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inspection.InspectionRequestRepository;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.inspection.InspectionRequestType;
import com.qkshop.tonkho.inspection.InspectionService;
import com.qkshop.tonkho.inspection.dto.InspectionRequest;
import com.qkshop.tonkho.log.EventLogRepository;
import com.qkshop.tonkho.machine.MachineService;
import com.qkshop.tonkho.machine.SerialRegistry;
import com.qkshop.tonkho.machine.SerialRegistryRepository;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.salesreport.SalesOrder;
import com.qkshop.tonkho.salesreport.SalesOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
class BundledChargerSaleTest {

    @Autowired
    private MachineService machineService;

    @Autowired
    private AccessoryController accessoryController;

    @Autowired
    private AccessoryRepository accessoryRepository;

    @Autowired
    private AccessoryOrderRepository accessoryOrderRepository;

    @Autowired
    private AccessoryHistoryRepository accessoryHistoryRepository;

    @Autowired
    private SaleController saleController;

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private CrmCustomerRepository crmCustomerRepository;

    @Autowired
    private CrmQueryService crmQueryService;

    @Autowired
    private ActiveInventoryRepository activeInventoryRepository;

    @Autowired
    private InspectionRequestRepository inspectionRequestRepository;

    @Autowired
    private InspectionService inspectionService;

    @Autowired
    private SerialRegistryRepository serialRegistryRepository;

    @Autowired
    private EventLogRepository eventLogRepository;

    @BeforeEach
    void setUpSecurityContext() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin_charger_test", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );
    }

    private String importReadyMachine(String prefix, BigDecimal price) {
        String serial = prefix + System.currentTimeMillis();
        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .brand("Dell")
                .productLine("Latitude")
                .modelFull("Dell Latitude 7420")
                .segment("OFFICE")
                .cpu("i7-1185G7")
                .ram("16GB")
                .ssd("512GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(price)
                .warrantyPeriod("BH phần cứng 6 tháng")
                .build();
        machineService.importSingleMachine(req, "admin_charger_test");
        return serial;
    }

    @Test
    @DisplayName("Bán máy kèm sạc từ kho phụ kiện: 0đ, trừ 1 tồn kho, BH đồng bộ theo máy và hoàn kho khi trả hàng")
    void testSaleWithWarehouseChargerSyncsWarrantyAndRestoresOnReturn() {
        String serial = importReadyMachine("SN-CHG-WH-", new BigDecimal("14000000"));
        Accessory charger = accessoryController.submitAccessory(Map.of(
                "name", "Sạc Laptop Dell 65W Type-C Test",
                "category", "SAC",
                "quantity", 5,
                "price", "420000",
                "defaultWarrantyMonths", 3
        )).getBody().getData();

        String phone = "0988112233";
        Map<String, Object> payload = new HashMap<>();
        payload.put("serial", serial);
        payload.put("customerName", "Nguyễn Văn Sạc Kho");
        payload.put("customerPhone", phone);
        payload.put("salesperson", "nv_sale");
        payload.put("saleDate", "2026-11-10");
        payload.put("warrantyPeriod", "BH phần cứng 6 tháng");
        payload.put("discount", "0");
        payload.put("finalPrice", "14000000");
        payload.put("isShipping", false);
        payload.put("chargerName", charger.getName());
        payload.put("chargerSku", charger.getSku());

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), payload).getBody().getData();
        assertNotNull(soldCycle);
        assertEquals(charger.getName(), soldCycle.getChargerName());
        assertEquals(charger.getSku(), soldCycle.getChargerSku());
        assertEquals(0, new BigDecimal("14000000").compareTo(soldCycle.getSalePriceSnapshot()));

        // Kiểm tra tồn kho sạc đã trừ 1 (5 -> 4)
        Accessory afterSale = accessoryRepository.findBySku(charger.getSku()).orElseThrow();
        assertEquals(4, afterSale.getQuantity());

        // Kiểm tra lịch sử xuất phụ kiện giá 0đ
        List<AccessoryHistory> histories = accessoryHistoryRepository.findBySkuOrderByCreatedAtDesc(charger.getSku());
        assertTrue(histories.stream().anyMatch(h ->
                "SELL".equals(h.getAction())
                        && h.getPrice() != null && h.getPrice().compareTo(BigDecimal.ZERO) == 0
                        && h.getNote() != null && h.getNote().contains("Sạc kèm theo máy")
        ));

        // Kiểm tra bảo hành sạc đồng bộ theo máy (6 tháng từ 2026-11-10 -> 2027-05-10, không lấy 3 tháng mặc định của sạc)
        String pkKemCode = "PK-KEM-" + soldCycle.getCycleId().replace("CYC-", "");
        AccessoryOrder pkOrder = accessoryOrderRepository.findByOrderCode(pkKemCode).orElseThrow();
        assertEquals(0, BigDecimal.ZERO.compareTo(pkOrder.getTotalAmount()));
        assertEquals(1, pkOrder.getItems().size());
        AccessoryOrderItem chargerItem = pkOrder.getItems().get(0);
        assertEquals(charger.getSku(), chargerItem.getSku());
        assertEquals(0, BigDecimal.ZERO.compareTo(chargerItem.getPrice()));
        assertEquals("BH phần cứng 6 tháng", chargerItem.getWarrantyPeriod());
        assertEquals(LocalDate.of(2027, 5, 10), chargerItem.getWarrantyExpiry());

        // Kiểm tra đồng bộ SalesOrder + CRM
        SalesOrder so = salesOrderRepository.findByMatchedCycleId(soldCycle.getCycleId()).orElseThrow();
        assertEquals(charger.getName(), so.getChargerName());
        assertEquals(charger.getSku(), so.getChargerSku());

        CrmCustomer crmCustomer = crmCustomerRepository.findByPhoneNormalized(phone).orElseThrow();
        CrmDtos.PageResult<CrmDtos.OrderItem> crmOrders = crmQueryService.getCustomerOrders(crmCustomer.getId(), "", 0, 10);
        CrmDtos.OrderItem crmOrder = crmOrders.items().stream()
                .filter(o -> soldCycle.getCycleId().equals(o.matchedCycleId()))
                .findFirst().orElseThrow();
        assertEquals(charger.getName(), crmOrder.chargerName());
        assertEquals(charger.getSku(), crmOrder.chargerSku());

        // Kiểm tra hoàn đơn -> hoàn lại +1 sạc về kho
        saleController.returnShippingOrder(soldCycle.getCycleId(), Map.of("reason", "Test hoàn đơn có sạc kèm"));
        Accessory afterReturn = accessoryRepository.findBySku(charger.getSku()).orElseThrow();
        assertEquals(5, afterReturn.getQuantity());
    }

    @Test
    @DisplayName("Bán máy kèm sạc tự nhập ngoài kho: Lưu thông tin sạc, không trừ tồn kho")
    void testSaleWithCustomExternalCharger() {
        String serial = importReadyMachine("SN-CHG-EXT-", new BigDecimal("12500000"));

        Map<String, Object> payload = new HashMap<>();
        payload.put("serial", serial);
        payload.put("customerName", "Trần Thị Sạc Ngoài");
        payload.put("customerPhone", "0977223344");
        payload.put("salesperson", "nv_sale");
        payload.put("warrantyPeriod", "BH phần cứng 6 tháng");
        payload.put("finalPrice", "12500000");
        payload.put("isShipping", false);
        payload.put("chargerName", "Sạc Dell 130W Oval Ngoài Kho");

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), payload).getBody().getData();
        assertNotNull(soldCycle);
        assertEquals("Sạc Dell 130W Oval Ngoài Kho", soldCycle.getChargerName());
        assertNull(soldCycle.getChargerSku());
        assertTrue(soldCycle.getSaleNote().contains("Sạc kèm theo máy: Sạc Dell 130W Oval Ngoài Kho"));

        SalesOrder so = salesOrderRepository.findByMatchedCycleId(soldCycle.getCycleId()).orElseThrow();
        assertEquals("Sạc Dell 130W Oval Ngoài Kho", so.getChargerName());
        assertNull(so.getChargerSku());
    }

    @Test
    @DisplayName("Đơn ship xa có sạc kèm từ kho: Kích hoạt bảo hành sạc đồng bộ theo ngày khách nhận hàng")
    void testShippingSaleWithChargerActivatesWarrantyOnDelivery() {
        String serial = importReadyMachine("SN-CHG-SHIP-", new BigDecimal("16000000"));
        Accessory charger = accessoryController.submitAccessory(Map.of(
                "name", "Sạc Lenovo 65W Type-C Test",
                "category", "SAC",
                "quantity", 3,
                "price", "390000",
                "defaultWarrantyMonths", 1
        )).getBody().getData();

        Map<String, Object> payload = new HashMap<>();
        payload.put("serial", serial);
        payload.put("customerName", "Lê Văn Ship Sạc");
        payload.put("customerPhone", "0966334455");
        payload.put("salesperson", "nv_ship");
        payload.put("warrantyPeriod", "BH phần cứng 12 tháng");
        payload.put("finalPrice", "16000000");
        payload.put("isShipping", true);
        payload.put("isDelivered", false);
        payload.put("chargerName", charger.getName());
        payload.put("chargerSku", charger.getSku());

        ClosedCycle shipCycle = saleController.submitSale(UUID.randomUUID().toString(), payload).getBody().getData();
        String pkKemCode = "PK-KEM-" + shipCycle.getCycleId().replace("CYC-", "");
        AccessoryOrder pendingOrder = accessoryOrderRepository.findByOrderCode(pkKemCode).orElseThrow();
        assertNull(pendingOrder.getItems().get(0).getWarrantyExpiry(), "Chưa giao hàng thì hạn BH sạc phải để trống");

        LocalDate deliveryDate = LocalDate.of(2026, 11, 20);
        saleController.confirmDelivery(shipCycle.getCycleId(), Map.of("deliveryDate", deliveryDate.toString()));

        AccessoryOrder deliveredOrder = accessoryOrderRepository.findByOrderCode(pkKemCode).orElseThrow();
        assertEquals("COMPLETED", deliveredOrder.getStatus());
        assertEquals("BH phần cứng 12 tháng", deliveredOrder.getItems().get(0).getWarrantyPeriod());
        assertEquals(LocalDate.of(2027, 11, 20), deliveredOrder.getItems().get(0).getWarrantyExpiry());
    }

    @Test
    @DisplayName("Bán máy không chọn sạc kèm theo (trường tùy chọn): Giao dịch thành công bình thường")
    void testSaleWithoutChargerSucceeds() {
        String serial = importReadyMachine("SN-CHG-NONE-", new BigDecimal("11000000"));

        Map<String, Object> payload = new HashMap<>();
        payload.put("serial", serial);
        payload.put("customerName", "Phạm Không Lấy Sạc");
        payload.put("customerPhone", "0933557799");
        payload.put("warrantyPeriod", "BH phần cứng 3 tháng");
        payload.put("finalPrice", "11000000");
        payload.put("isShipping", false);

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), payload).getBody().getData();
        assertNotNull(soldCycle);
        assertNull(soldCycle.getChargerName());
        assertNull(soldCycle.getChargerSku());
    }

    @Test
    @DisplayName("Hoàn trả tách biệt sạc kèm theo máy (restoreCharger=false) vẫn giữ nguyên trừ kho sạc khi hoàn phụ kiện khác")
    void testReturnSelectiveChargerFalseRestoresPaidAccessoriesOnly() {
        String serial = importReadyMachine("SN-RET-CHG1-", new BigDecimal("15000000"));
        Accessory charger = accessoryController.submitAccessory(Map.of(
                "name", "Sạc Dell 90W Hoàn Tách Test",
                "category", "SAC",
                "quantity", 4,
                "price", "450000",
                "defaultWarrantyMonths", 3
        )).getBody().getData();
        Accessory mouse = accessoryController.submitAccessory(Map.of(
                "name", "Chuột Logitech Bán Kèm Test",
                "category", "CHUOT",
                "quantity", 5,
                "price", "250000",
                "defaultWarrantyMonths", 12
        )).getBody().getData();

        Map<String, Object> payload = new HashMap<>();
        payload.put("serial", serial);
        payload.put("customerName", "Nguyễn Văn Hoàn Tách");
        payload.put("customerPhone", "0911223344");
        payload.put("salesperson", "nv_sale");
        payload.put("warrantyPeriod", "BH phần cứng 6 tháng");
        payload.put("finalPrice", "15250000");
        payload.put("isShipping", false);
        payload.put("chargerName", charger.getName());
        payload.put("chargerSku", charger.getSku());
        payload.put("accessories", List.of(Map.of(
                "sku", mouse.getSku(),
                "name", mouse.getName(),
                "quantity", 1,
                "price", "250000",
                "isGift", false
        )));

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), payload).getBody().getData();
        assertEquals(3, accessoryRepository.findBySku(charger.getSku()).orElseThrow().getQuantity());
        assertEquals(4, accessoryRepository.findBySku(mouse.getSku()).orElseThrow().getQuantity());

        // Khách làm mất sạc -> không hoàn kho sạc, nhưng trả lại chuột
        Map<String, Object> retPayload = new HashMap<>();
        retPayload.put("reason", "Khách trả máy nhưng làm mất sạc");
        retPayload.put("restoreCharger", false);
        retPayload.put("restoreAccessories", true);

        Map<String, Object> retRes = saleController.returnShippingOrder(soldCycle.getCycleId(), retPayload).getBody().getData();
        assertEquals(false, retRes.get("chargerRestored"));
        assertEquals(3, accessoryRepository.findBySku(charger.getSku()).orElseThrow().getQuantity());
        assertEquals(5, accessoryRepository.findBySku(mouse.getSku()).orElseThrow().getQuantity());

        String pkKemCode = "PK-KEM-" + soldCycle.getCycleId().replace("CYC-", "");
        AccessoryOrder pkOrder = accessoryOrderRepository.findByOrderCode(pkKemCode).orElseThrow();
        assertEquals("RETURNED", pkOrder.getStatus());
    }

    @Test
    @DisplayName("Hoàn trả chỉ thu lại máy & sạc kèm, giữ phụ kiện mua thêm có thu tiền (bảo toàn doanh thu PK-KEM)")
    void testReturnRestoresChargerWhilePreservingKeptPaidAccessoriesRevenue() {
        String serial = importReadyMachine("SN-RET-CHG2-", new BigDecimal("17000000"));
        Accessory charger = accessoryController.submitAccessory(Map.of(
                "name", "Sạc 100W Thu Lại Test",
                "category", "SAC",
                "quantity", 4,
                "price", "500000",
                "defaultWarrantyMonths", 3
        )).getBody().getData();
        Accessory mouse = accessoryController.submitAccessory(Map.of(
                "name", "Chuột Không Dây Giữ Lại Test",
                "category", "CHUOT",
                "quantity", 5,
                "price", "300000",
                "defaultWarrantyMonths", 12
        )).getBody().getData();

        Map<String, Object> payload = new HashMap<>();
        payload.put("serial", serial);
        payload.put("customerName", "Trần Thị Giữ Chuột");
        payload.put("customerPhone", "0922334455");
        payload.put("salesperson", "nv_sale");
        payload.put("warrantyPeriod", "BH phần cứng 6 tháng");
        payload.put("finalPrice", "17300000");
        payload.put("isShipping", false);
        payload.put("chargerName", charger.getName());
        payload.put("chargerSku", charger.getSku());
        payload.put("accessories", List.of(Map.of(
                "sku", mouse.getSku(),
                "name", mouse.getName(),
                "quantity", 1,
                "price", "300000",
                "isGift", false
        )));

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), payload).getBody().getData();

        Map<String, Object> retPayload = new HashMap<>();
        retPayload.put("reason", "Trả máy + sạc, khách giữ chuột đã mua");
        retPayload.put("restoreCharger", true);
        retPayload.put("restoreAccessories", false);

        Map<String, Object> retRes = saleController.returnShippingOrder(soldCycle.getCycleId(), retPayload).getBody().getData();
        assertEquals(true, retRes.get("chargerRestored"));
        assertEquals(4, accessoryRepository.findBySku(charger.getSku()).orElseThrow().getQuantity());
        assertEquals(4, accessoryRepository.findBySku(mouse.getSku()).orElseThrow().getQuantity());

        String pkKemCode = "PK-KEM-" + soldCycle.getCycleId().replace("CYC-", "");
        AccessoryOrder pkOrder = accessoryOrderRepository.findByOrderCode(pkKemCode).orElseThrow();
        assertEquals("COMPLETED", pkOrder.getStatus());

        AccessoryOrderItem returnedChargerItem = pkOrder.getItems().stream()
                .filter(it -> charger.getSku().equals(it.getSku()))
                .findFirst().orElseThrow();
        assertNull(returnedChargerItem.getWarrantyExpiry());

        SalesOrder pkSalesOrder = salesOrderRepository.findByTransactionId(pkKemCode).orElseThrow();
        assertEquals(0, new BigDecimal("300000").compareTo(pkSalesOrder.getNetRevenue()));
        assertEquals("Đã thanh toán", pkSalesOrder.getPaymentStatus());
    }

    @Test
    @DisplayName("Hoàn trả về NEEDS_INSPECTION: Tự động tạo phiếu kiểm định CUSTOMER_RETURN, ghi EventLog và duyệt lại READY")
    void testReturnWithNeedsInspectionCreatesInspectionRequestAndCanBeApproved() {
        String serial = importReadyMachine("SN-RET-INSP-", new BigDecimal("18000000"));

        Map<String, Object> payload = new HashMap<>();
        payload.put("serial", serial);
        payload.put("customerName", "Lê Văn Kiểm Định");
        payload.put("customerPhone", "0955667788");
        payload.put("salesperson", "nv_sale");
        payload.put("warrantyPeriod", "BH phần cứng 12 tháng");
        payload.put("finalPrice", "18000000");
        payload.put("isShipping", false);

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), payload).getBody().getData();

        Map<String, Object> retRes = saleController.returnShippingOrder(soldCycle.getCycleId(), Map.of(
                "reason", "Khách phản hồi máy nóng, hoàn về test lại",
                "returnState", "NEEDS_INSPECTION"
        )).getBody().getData();

        String newCycleId = (String) retRes.get("newCycleId");
        assertEquals("NEEDS_INSPECTION", retRes.get("state"));
        assertEquals(true, retRes.get("inspectionCreated"));

        ActiveInventory ai = activeInventoryRepository.findByCycleId(newCycleId).orElseThrow();
        assertEquals(CycleState.NEEDS_INSPECTION, ai.getState());
        assertNotNull(ai.getLastPausedAt());

        List<InspectionRequest> requests = inspectionRequestRepository.findByCycleId(newCycleId);
        assertEquals(1, requests.size());
        InspectionRequest req = requests.get(0);
        assertEquals(InspectionRequestType.CUSTOMER_RETURN, req.getRequestType());
        assertEquals(InspectionRequestStatus.OPEN, req.getStatus());

        SerialRegistry reg = serialRegistryRepository.findBySerialKey(soldCycle.getSerialKey()).orElseThrow();
        assertEquals(newCycleId, reg.getCurrentCycleId());
        assertEquals(CycleState.NEEDS_INSPECTION, reg.getCurrentState());
        assertNotNull(reg.getLastEventId());
        assertTrue(eventLogRepository.findBySerialKey(soldCycle.getSerialKey()).stream()
                .anyMatch(e -> e.getEventId().equals(reg.getLastEventId())));

        // Duyệt kiểm định -> quay về READY thành công
        InspectionRequest approved = inspectionService.approveInspection(req.getInspectionRequestId(), "ktv_test", "Đã test ổn định");
        assertEquals(InspectionRequestStatus.PASSED, approved.getStatus());
        assertEquals(CycleState.READY, activeInventoryRepository.findByCycleId(newCycleId).orElseThrow().getState());
    }
}
