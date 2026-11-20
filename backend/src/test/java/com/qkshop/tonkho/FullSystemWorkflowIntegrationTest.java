package com.qkshop.tonkho;

import com.qkshop.tonkho.accessory.Accessory;
import com.qkshop.tonkho.accessory.AccessoryController;
import com.qkshop.tonkho.accessory.AccessoryOrder;
import com.qkshop.tonkho.accessory.AccessoryOrderRepository;
import com.qkshop.tonkho.accessory.AccessoryRepository;
import com.qkshop.tonkho.accessory.AccessoryService;
import com.qkshop.tonkho.analytics.AnalyticsController;
import com.qkshop.tonkho.analytics.dto.AnalyticsFilterRequest;
import com.qkshop.tonkho.auth.AuthController;
import com.qkshop.tonkho.auth.JwtTokenProvider;
import com.qkshop.tonkho.catalog.CatalogController;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.crm.CrmCustomer;
import com.qkshop.tonkho.crm.CrmCustomerLinkService;
import com.qkshop.tonkho.crm.CrmCustomerRepository;
import com.qkshop.tonkho.crm.CrmDtos;
import com.qkshop.tonkho.crm.CrmOrderRepository;
import com.qkshop.tonkho.crm.CrmQueryService;
import com.qkshop.tonkho.exception.DuplicateSerialException;
import com.qkshop.tonkho.inspection.InspectionRequestRepository;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.inspection.InspectionService;
import com.qkshop.tonkho.inspection.dto.InspectionRequest;
import com.qkshop.tonkho.intake.IntakeType;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inventory.InventoryCycleService;
import com.qkshop.tonkho.inventory.dto.ClosedCycleDTO;
import com.qkshop.tonkho.issue.DataIssue;
import com.qkshop.tonkho.issue.DataIssueRepository;
import com.qkshop.tonkho.issue.IssueSeverity;
import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.machine.MachineService;
import com.qkshop.tonkho.machine.SerialRegistry;
import com.qkshop.tonkho.machine.SerialRegistryRepository;
import com.qkshop.tonkho.machine.dto.BulkMachineImportRequest;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.part.Part;
import com.qkshop.tonkho.part.PartHistory;
import com.qkshop.tonkho.part.PartHistoryRepository;
import com.qkshop.tonkho.part.PartRepository;
import com.qkshop.tonkho.part.PartService;
import com.qkshop.tonkho.pricelist.JasperReportService;
import com.qkshop.tonkho.pricelist.PlatformPriceListDTO;
import com.qkshop.tonkho.pricelist.PriceListController;
import com.qkshop.tonkho.pricelist.PriceListItemDTO;
import com.qkshop.tonkho.repair.RepairOrder;
import com.qkshop.tonkho.repair.RepairOrderItem;
import com.qkshop.tonkho.repair.RepairOrderRepository;
import com.qkshop.tonkho.repair.RepairOrderService;
import com.qkshop.tonkho.sale.SaleController;
import com.qkshop.tonkho.salesreport.SalesOrder;
import com.qkshop.tonkho.salesreport.SalesOrderRepository;
import com.qkshop.tonkho.salesreport.SalesReportService;
import com.qkshop.tonkho.salesreport.dto.SalesDashboardResponse;
import com.qkshop.tonkho.sync.ReconciliationService;
import com.qkshop.tonkho.user.AppPermission;
import com.qkshop.tonkho.user.User;
import com.qkshop.tonkho.user.UserRepository;
import com.qkshop.tonkho.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bộ kiểm thử tích hợp toàn diện (End-to-End Integration Test) cho toàn bộ 12 luồng xử lý
 * nghiệp vụ của hệ thống Quản Lý Kho QKShop.
 * Sử dụng @Transactional để tự động rollback sau mỗi bài test, đảm bảo an toàn tuyệt đối cho CSDL.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.task.scheduling.enabled=false",
        "gsheet.enabled=false",
        "gsheet.cron-enabled=false",
        "gsheet.scheduler.enabled=false",
        "crm.startup-sync.enabled=false"
})
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FullSystemWorkflowIntegrationTest {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    @Autowired
    private AuthController authController;
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CatalogController catalogController;
    @Autowired
    private PriceListController priceListController;
    @Autowired
    private JasperReportService jasperReportService;

    @Autowired
    private MachineService machineService;
    @Autowired
    private ActiveInventoryRepository activeInventoryRepository;
    @Autowired
    private ClosedCycleRepository closedCycleRepository;
    @Autowired
    private SerialRegistryRepository serialRegistryRepository;
    @Autowired
    private InventoryCycleService inventoryCycleService;

    @Autowired
    private InspectionService inspectionService;
    @Autowired
    private InspectionRequestRepository inspectionRequestRepository;

    @Autowired
    private AccessoryService accessoryService;
    @Autowired
    private AccessoryController accessoryController;
    @Autowired
    private AccessoryRepository accessoryRepository;
    @Autowired
    private AccessoryOrderRepository accessoryOrderRepository;

    @Autowired
    private PartService partService;
    @Autowired
    private PartRepository partRepository;
    @Autowired
    private PartHistoryRepository partHistoryRepository;

    @Autowired
    private SaleController saleController;
    @Autowired
    private RepairOrderService repairOrderService;
    @Autowired
    private RepairOrderRepository repairOrderRepository;

    @Autowired
    private SalesOrderRepository salesOrderRepository;
    @Autowired
    private SalesReportService salesReportService;
    @Autowired
    private AnalyticsController analyticsController;

    @Autowired
    private CrmCustomerLinkService crmCustomerLinkService;
    @Autowired
    private CrmCustomerRepository crmCustomerRepository;
    @Autowired
    private CrmOrderRepository crmOrderRepository;
    @Autowired
    private CrmQueryService crmQueryService;

    @Autowired
    private ReconciliationService reconciliationService;
    @Autowired
    private DataIssueRepository dataIssueRepository;

    @BeforeEach
    void setUpAdminSecurityContext() {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        for (String code : AppPermission.allCodes()) {
            authorities.add(new SimpleGrantedAuthority(code));
        }
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin_test", null, authorities)
        );
    }

    // =========================================================================
    // LUỒNG 1: XÁC THỰC JWT, REFRESH TOKEN & PHÂN QUYỀN RBAC
    // =========================================================================
    @Test
    @Order(1)
    @DisplayName("Luồng 01: Xác thực JWT Access/Refresh Token và Phân quyền RBAC")
    void testFlow01_AuthJwtAndPermissions() {
        String testUser = "nv_banhang_" + System.currentTimeMillis();
        User user = User.builder()
                .username(testUser)
                .passwordHash("$2a$10$dummyHashForIntegrationTestingOnly1234567890123456")
                .fullName("Nhân Viên Bán Hàng Test")
                .email(testUser + "@qkshop.vn")
                .role(UserRole.STAFF)
                .isActive(true)
                .permissions(Set.of("SALE_MACHINE", "WARRANTY_CHECK", "SERVICE_REPAIR"))
                .build();
        userRepository.save(user);

        // 1. Sinh và kiểm tra Access Token
        String accessToken = jwtTokenProvider.generateToken(testUser, UserRole.STAFF.name());
        assertNotNull(accessToken);
        assertTrue(jwtTokenProvider.validateToken(accessToken));
        assertEquals(testUser, jwtTokenProvider.getUsernameFromToken(accessToken));
        assertEquals(JwtTokenProvider.TYPE_ACCESS, jwtTokenProvider.getTokenType(accessToken));

        // 2. Sinh và kiểm tra Refresh Token
        String refreshToken = jwtTokenProvider.generateRefreshToken(testUser);
        assertNotNull(refreshToken);
        assertTrue(jwtTokenProvider.validateRefreshToken(refreshToken));
        assertFalse(jwtTokenProvider.validateToken(refreshToken), "Refresh token không được dùng trực tiếp như Access token");

        // 3. Kiểm tra endpoint /api/auth/me với SecurityContext của user
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(testUser, null, List.of(
                        new SimpleGrantedAuthority("ROLE_STAFF"),
                        new SimpleGrantedAuthority("SALE_MACHINE"),
                        new SimpleGrantedAuthority("SERVICE_REPAIR")
                ))
        );
        var meRes = authController.getCurrentUser();
        assertNotNull(meRes.getBody());
        assertTrue(meRes.getBody().isSuccess());
        assertEquals(testUser, meRes.getBody().getData().getUsername());
        assertTrue(meRes.getBody().getData().getPermissions().contains("SERVICE_REPAIR"));
    }

    // =========================================================================
    // LUỒNG 2: DANH MỤC CẤU HÌNH (CATALOG), BẢNG GIÁ & XUẤT PDF A4 / A5
    // =========================================================================
    @Test
    @Order(2)
    @DisplayName("Luồng 02: Quản lý Danh mục Catalog, Bảng giá và Xuất PDF khổ A4 & A5")
    void testFlow02_CatalogPriceListAndPdfGeneration() throws Exception {
        String serial = "SN-CAT-" + System.currentTimeMillis();
        MachineImportRequest importReq = MachineImportRequest.builder()
                .serial(serial)
                .brand("Dell")
                .productLine("Latitude")
                .modelFull("Dell Latitude 7430")
                .segment("Văn phòng (Office)")
                .cpu("i7-1265U")
                .gpu("Intel Iris Xe")
                .ram("16GB")
                .ssd("512GB")
                .touchscreen("Không cảm ứng")
                .screenSize("14.0\" FHD")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("14500000"))
                .warrantyPeriod("BH phần cứng 6 tháng")
                .build();

        ActiveInventory ai = machineService.importSingleMachine(importReq, "admin_test");
        assertNotNull(ai.getConfig());
        String platformId = ai.getConfig().getVariant().getPlatform().getPlatformId();

        // 1. Kiểm tra các API Catalog
        assertFalse(catalogController.getBrands().getBody().getData().isEmpty());
        assertFalse(catalogController.getModelLines(null).getBody().getData().isEmpty());
        assertFalse(catalogController.getPlatforms(null).getBody().getData().isEmpty());
        assertFalse(catalogController.getVariants(platformId).getBody().getData().isEmpty());
        assertFalse(catalogController.getConfigs(ai.getConfig().getVariant().getVariantId()).getBody().getData().isEmpty());

        // 2. Kiểm tra API Bảng giá (PriceListController)
        List<PlatformPriceListDTO> platforms = priceListController.getPlatformsByModelLine(null).getBody().getData();
        assertNotNull(platforms);
        assertTrue(platforms.stream().anyMatch(p -> platformId.equals(p.getPlatformId())));

        List<PriceListItemDTO> items = priceListController.getConfigsByGroup(platformId).getBody().getData();
        assertNotNull(items);
        assertFalse(items.isEmpty());
        PriceListItemDTO targetItem = items.stream()
                .filter(it -> ai.getConfig().getConfigId().equals(it.getConfigId()))
                .findFirst()
                .orElseThrow();
        assertEquals(0, new BigDecimal("14500000").compareTo(targetItem.getDefaultSalePrice()));
        assertTrue(targetItem.getStockReady() >= 1);

        // 3. Kiểm tra xuất PDF khổ A4 và A5 qua JasperReportService
        targetItem.setWarrantyText("BH phần cứng 6 tháng");
        byte[] pdfA4 = jasperReportService.exportPriceListPdf(List.of(targetItem), null, "A4");
        assertNotNull(pdfA4);
        assertTrue(pdfA4.length > 500, "File PDF A4 phải có dung lượng hợp lệ");
        assertEquals("%PDF", new String(pdfA4, 0, 4));

        byte[] pdfA5 = jasperReportService.exportPriceListPdf(List.of(targetItem), null, "A5");
        assertNotNull(pdfA5);
        assertTrue(pdfA5.length > 500, "File PDF A5 phải có dung lượng hợp lệ");
        assertEquals("%PDF", new String(pdfA5, 0, 4));
    }

    // =========================================================================
    // LUỒNG 3: NHẬP KHO MÁY MÓC (ĐƠN LẺ, HÀNG LOẠT, EXCEL TEMPLATE, RE-LINK)
    // =========================================================================
    @Test
    @Order(3)
    @DisplayName("Luồng 03: Nhập kho máy đơn lẻ, chặn trùng Serial, Re-link cấu hình và Xuất Excel Template")
    void testFlow03_MachineIntakeAndRelinkConfig() {
        String s1 = "SN-INTAKE-A-" + System.currentTimeMillis();
        String s2 = "SN-INTAKE-B-" + System.currentTimeMillis();

        MachineImportRequest req1 = MachineImportRequest.builder()
                .serial(s1)
                .brand("Lenovo")
                .productLine("ThinkPad")
                .modelFull("ThinkPad T14 Gen 3")
                .segment("Văn phòng (Office)")
                .cpu("i5-1235U")
                .gpu("Onboard")
                .ram("16GB")
                .ssd("512GB")
                .touchscreen("Không")
                .screenSize("14.0\"")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("13000000"))
                .warrantyPeriod("BH phần cứng 6 tháng")
                .build();

        MachineImportRequest req2 = MachineImportRequest.builder()
                .serial(s2)
                .brand("Lenovo")
                .productLine("ThinkPad")
                .modelFull("ThinkPad T14 Gen 3")
                .segment("Văn phòng (Office)")
                .cpu("i5-1235U")
                .gpu("Onboard")
                .ram("16GB")
                .ssd("512GB")
                .touchscreen("Không")
                .screenSize("14.0\"")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("13000000"))
                .warrantyPeriod("BH phần cứng 6 tháng")
                .build();

        ActiveInventory ai1 = machineService.importSingleMachine(req1, "admin_test");
        ActiveInventory ai2 = machineService.importSingleMachine(req2, "admin_test");
        assertEquals(ai1.getConfig().getConfigId(), ai2.getConfig().getConfigId(), "2 máy cùng cấu hình phải dùng chung SalesConfig");

        // Chặn nhập trùng Serial đang trong kho
        assertThrows(DuplicateSerialException.class, () -> machineService.importSingleMachine(req1, "admin_test"));

        // Cập nhật cấu hình máy s1 sang RAM 32GB (Re-link Pattern): Không được làm biến dạng cấu hình của máy s2
        Map<String, Object> updateS1 = new HashMap<>();
        updateS1.put("brand", "Lenovo");
        updateS1.put("productLine", "ThinkPad");
        updateS1.put("modelFull", "ThinkPad T14 Gen 3");
        updateS1.put("segment", "OFFICE");
        updateS1.put("cpu", "i5-1235U");
        updateS1.put("gpu", "Onboard");
        updateS1.put("ram", "32GB");
        updateS1.put("ssd", "1TB");
        updateS1.put("touchscreen", "Không");
        updateS1.put("screenSize", "14.0\"");
        updateS1.put("price", "15000000");

        ActiveInventory updatedAi1 = machineService.updateMachine(s1, updateS1, "admin_test");
        ActiveInventory unchangedAi2 = activeInventoryRepository.findBySerialKey(s2).orElseThrow();
        assertEquals("32GB", updatedAi1.getConfig().getRamCode());
        assertEquals("1TB", updatedAi1.getConfig().getSsdCode());
        assertEquals("16GB", unchangedAi2.getConfig().getRamCode(), "Máy s2 không được bị biến dạng cấu hình khi sửa máy s1");

        // Kiểm tra tạo file Excel Template
        ByteArrayResource excelTemplate = machineService.generateExcelTemplate(List.of(req1));
        assertNotNull(excelTemplate);
        assertTrue(excelTemplate.contentLength() > 1000);
    }

    // =========================================================================
    // LUỒNG 4: KIỂM ĐỊNH KỸ THUẬT (INSPECTION WORKFLOW: APPROVE & REJECT)
    // =========================================================================
    @Test
    @Order(4)
    @DisplayName("Luồng 04: Quy trình Kiểm định kỹ thuật (Mở phiếu -> Đang test -> Yêu cầu test lại -> Duyệt ĐẠT / HỦY TRẢ)")
    void testFlow04_TechnicalInspectionWorkflow() {
        // 1. Nhánh Kiểm định ĐẠT (PASSED -> READY)
        String sPass = "SN-INSP-PASS-" + System.currentTimeMillis();
        MachineImportRequest reqPass = MachineImportRequest.builder()
                .serial(sPass)
                .brand("HP")
                .productLine("EliteBook")
                .modelFull("HP EliteBook 840 G8")
                .segment("OFFICE")
                .cpu("i5-1145G7")
                .ram("16GB")
                .ssd("256GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("CẦN KIỂM TRA")
                .price(new BigDecimal("10500000"))
                .build();

        ActiveInventory aiPass = machineService.importSingleMachine(reqPass, "admin_test");
        assertEquals(CycleState.NEEDS_INSPECTION, aiPass.getState());

        List<InspectionRequest> openReqs = inspectionRequestRepository.findByCycleId(aiPass.getCycleId());
        assertFalse(openReqs.isEmpty(), "Nhập máy trạng thái CẦN KIỂM TRA phải tự động sinh phiếu InspectionRequest");
        String reqId = openReqs.get(0).getInspectionRequestId();

        InspectionRequest started = inspectionService.startInspection(reqId, "ktv_hieu");
        assertEquals(InspectionRequestStatus.IN_PROGRESS, started.getStatus());

        InspectionRequest progressed = inspectionService.updateProgress(reqId, "Đã test màn hình, phím, pin tốt", true, "ktv_hieu");
        assertTrue(Boolean.TRUE.equals(progressed.getRequiredDataComplete()));

        InspectionRequest recheck = inspectionService.sendToRecheck(reqId, "ktv_hieu");
        assertEquals(InspectionRequestStatus.RECHECK_REQUESTED, recheck.getStatus());

        InspectionRequest approved = inspectionService.approveInspection(reqId, "ktv_truong", "Đạt tiêu chuẩn xuất bán");
        assertEquals(InspectionRequestStatus.PASSED, approved.getStatus());

        ActiveInventory readyAi = activeInventoryRepository.findBySerialKey(sPass).orElseThrow();
        assertEquals(CycleState.READY, readyAi.getState(), "Duyệt ĐẠT phải chuyển máy sang trạng thái Sẵn sàng bán (READY)");
        assertEquals(CycleState.READY, serialRegistryRepository.findBySerialKey(sPass).orElseThrow().getCurrentState());

        // 2. Nhánh Kiểm định LỖI / TRẢ NCC (REJECTED_RETURNED -> CLOSED / CANCEL)
        String sFail = "SN-INSP-FAIL-" + System.currentTimeMillis();
        MachineImportRequest reqFail = MachineImportRequest.builder()
                .serial(sFail)
                .brand("HP")
                .productLine("EliteBook")
                .modelFull("HP EliteBook 840 G8")
                .segment("OFFICE")
                .cpu("i5-1145G7")
                .ram("16GB")
                .ssd("256GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("CẦN KIỂM TRA")
                .price(new BigDecimal("10500000"))
                .build();

        ActiveInventory aiFail = machineService.importSingleMachine(reqFail, "admin_test");
        String failReqId = inspectionRequestRepository.findByCycleId(aiFail.getCycleId()).get(0).getInspectionRequestId();

        InspectionRequest rejected = inspectionService.rejectInspection(failReqId, "ktv_truong", "Lỗi mainboard, trả nhà cung cấp");
        assertEquals(InspectionRequestStatus.REJECTED_RETURNED, rejected.getStatus());
        assertFalse(activeInventoryRepository.findBySerialKey(sFail).isPresent(), "Máy bị từ chối kiểm định phải rút khỏi ActiveInventory");

        ClosedCycle canceledCycle = closedCycleRepository.findByCycleId(aiFail.getCycleId()).orElseThrow();
        assertEquals(CloseType.CANCEL, canceledCycle.getCloseType());
    }

    // =========================================================================
    // LUỒNG 5: KHO PHỤ KIỆN & BÁN LẺ PHỤ KIỆN ĐỒNG BỘ DOANH SỐ
    // =========================================================================
    @Test
    @Order(5)
    @DisplayName("Luồng 05: Quản lý Kho Phụ kiện, Bán lẻ Phụ kiện (PK...) và Cập nhật bảo hành phụ kiện")
    void testFlow05_AccessoryInventoryAndRetailSaleWorkflow() {
        Map<String, Object> accPayload = new HashMap<>();
        accPayload.put("name", "Bàn phím cơ Keychron K2 Test");
        accPayload.put("category", "BAN_PHIM");
        accPayload.put("quantity", 10);
        accPayload.put("price", "1600000");
        accPayload.put("defaultWarrantyMonths", 12);
        Accessory acc = accessoryController.submitAccessory(accPayload).getBody().getData();
        assertNotNull(acc);
        assertTrue(acc.getSku().startsWith("PK-BANPHIM-"));

        // Bán lẻ 2 bàn phím với chiết khấu 100.000đ
        Map<String, Object> orderPayload = new HashMap<>();
        orderPayload.put("customerName", "Lê Hoàng Phúc");
        orderPayload.put("customerPhone", "0933445566");
        orderPayload.put("salesperson", "nv_sale_1");
        orderPayload.put("discount", "100000");
        orderPayload.put("saleNote", "Khách mua lẻ bàn phím cơ");
        orderPayload.put("accessories", List.of(Map.of(
                "sku", acc.getSku(),
                "quantity", 2,
                "price", "1600000",
                "warrantyValue", 12,
                "warrantyUnit", "THANG",
                "serialNumber", "SN-KEY-001"
        )));

        AccessoryOrder order = accessoryService.createAccessoryOrder(orderPayload);
        assertNotNull(order.getId());
        assertTrue(order.getOrderCode().startsWith("PK") && order.getOrderCode().length() == 10);
        assertEquals(0, new BigDecimal("3200000").compareTo(order.getTotalAmount()));
        assertEquals(0, new BigDecimal("3100000").compareTo(order.getFinalAmount()));
        assertEquals(8, accessoryRepository.findBySku(acc.getSku()).orElseThrow().getQuantity());

        // Kiểm tra đồng bộ SalesOrder
        SalesOrder so = salesOrderRepository.findByTransactionId(order.getOrderCode()).orElseThrow();
        assertEquals("ACCESSORY", so.getOrderCategory());
        assertEquals(0, new BigDecimal("3100000").compareTo(so.getNetRevenue()));

        // Cập nhật hạn bảo hành hóa đơn phụ kiện qua SaleController
        Long itemId = order.getItems().get(0).getId();
        Map<String, Object> updateOrderPayload = new HashMap<>();
        updateOrderPayload.put("customerName", "Lê Hoàng Phúc VIP");
        updateOrderPayload.put("items", List.of(Map.of(
                "id", itemId,
                "warrantyPeriod", "24 Tháng",
                "warrantyMonths", 24
        )));
        saleController.updateAccessoryOrder(order.getId(), updateOrderPayload);

        AccessoryOrder updatedOrder = accessoryOrderRepository.findById(order.getId()).orElseThrow();
        assertEquals("Lê Hoàng Phúc VIP", updatedOrder.getCustomerName());
        assertEquals("24 Tháng", updatedOrder.getItems().get(0).getWarrantyPeriod());
        assertEquals("Lê Hoàng Phúc VIP", salesOrderRepository.findByTransactionId(order.getOrderCode()).orElseThrow().getCustomerName());
    }

    // =========================================================================
    // LUỒNG 6: KHO LINH KIỆN & THU HỒI SWAP LINH KIỆN NÂNG CẤP
    // =========================================================================
    @Test
    @Order(6)
    @DisplayName("Luồng 06: Quản lý Kho Linh kiện (Nhập mới, Cộng dồn SKU, Điều chỉnh tồn, Swap-in linh kiện tháo máy)")
    void testFlow06_PartInventoryAndUpgradeSwapWorkflow() {
        Map<String, Object> partPayload = new HashMap<>();
        partPayload.put("name", "SSD NVMe Samsung PM9A1 512GB");
        partPayload.put("category", "SSD");
        partPayload.put("quantity", 5);
        partPayload.put("importPrice", "850000");
        partPayload.put("upgradePrice", "1000000");
        partPayload.put("retailPrice", "1200000");
        partPayload.put("warrantyMonths", 12);

        Part part = partService.importPart(partPayload, "admin_test");
        assertNotNull(part.getId());
        assertTrue(part.getSku().startsWith("LK-SSD-"));
        assertEquals(5, part.getQuantity());

        // Nhập cộng dồn cùng SKU
        partPayload.put("sku", part.getSku());
        partPayload.put("quantity", 3);
        Part accumulated = partService.importPart(partPayload, "admin_test");
        assertEquals(8, accumulated.getQuantity());

        // Thu hồi linh kiện tháo máy khách nâng cấp (swapInPart)
        boolean swappedIn = partService.swapInPart(
                part.getSku(), 1, "CYC-SWAP-TEST", "Khách Nâng Cấp", "0911223344", "nv_sale", "Thu hồi ổ cứng zin theo máy"
        );
        assertTrue(swappedIn);
        assertEquals(9, partRepository.findBySku(part.getSku()).orElseThrow().getQuantity());

        List<PartHistory> histories = partHistoryRepository.findBySkuOrderByCreatedAtDesc(part.getSku());
        assertTrue(histories.stream().anyMatch(h -> "SWAP_IN".equals(h.getAction())));
    }

    // =========================================================================
    // LUỒNG 7: BÁN MÁY TẠI QUẦY POS (KÈM NÂNG CẤP RAM/SSD + QUÀ TẶNG + PHỤ KIỆN MUA THÊM)
    // =========================================================================
    @Test
    @Order(7)
    @DisplayName("Luồng 07: Bán máy tại quầy POS kèm nâng cấp linh kiện, quà tặng 0đ và phụ kiện mua thêm (Tách bạch doanh thu)")
    void testFlow07_InStoreMachineSaleWithUpgradeAndAccessories() {
        // 1. Chuẩn bị máy READY giá niêm yết 15.000.000đ
        String serial = "SN-POS-SALE-" + System.currentTimeMillis();
        MachineImportRequest machineReq = MachineImportRequest.builder()
                .serial(serial)
                .brand("Asus")
                .productLine("ROG")
                .modelFull("Asus ROG Strix G15")
                .segment("GAMING")
                .cpu("Ryzen 7 6800H")
                .gpu("RTX 3060")
                .ram("8GB")
                .ssd("512GB")
                .screenSize("15.6\" 144Hz")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("15000000"))
                .warrantyPeriod("6 Tháng")
                .build();
        machineService.importSingleMachine(machineReq, "admin_test");

        // 2. Chuẩn bị linh kiện RAM nâng cấp (tồn kho = 5, giá nâng cấp = 500.000đ)
        Part ramPart = partService.importPart(Map.of(
                "name", "RAM DDR5 8GB 4800MHz",
                "category", "RAM",
                "quantity", 5,
                "upgradePrice", "500000",
                "retailPrice", "650000"
        ), "admin_test");

        // 3. Chuẩn bị 1 phụ kiện quà tặng (Chuột) và 1 phụ kiện bán kèm tính phí (Balo 300.000đ)
        Accessory giftMouse = accessoryController.submitAccessory(Map.of(
                "name", "Chuột Gaming Tặng Kèm",
                "category", "CHUOT",
                "quantity", 10,
                "price", "150000",
                "defaultWarrantyMonths", 3
        )).getBody().getData();

        Accessory paidBag = accessoryController.submitAccessory(Map.of(
                "name", "Balo Chống Sốc Cao Cấp",
                "category", "BALO",
                "quantity", 10,
                "price", "300000",
                "defaultWarrantyMonths", 6
        )).getBody().getData();

        // 4. Tra cứu máy tại quầy POS
        var lookupRes = saleController.lookupSaleCandidate(Map.of("keyword", serial)).getBody().getData();
        assertEquals(serial.toUpperCase(), lookupRes.get("serialKey"));

        // 5. Thực hiện thanh toán đơn bán máy tại quầy:
        // Giá máy niêm yết: 15.000.000 + Nâng cấp RAM: 500.000 + Balo mua thêm: 300.000 - Giảm giá: 200.000 = Tổng thu 15.600.000đ
        Map<String, Object> salePayload = new HashMap<>();
        salePayload.put("serial", serial);
        salePayload.put("customerName", "Trần Quốc Tuấn");
        salePayload.put("customerPhone", "0977889900");
        salePayload.put("salesperson", "nv_pos_01");
        salePayload.put("warrantyPeriod", "6 Tháng");
        salePayload.put("discount", "200000");
        salePayload.put("finalPrice", "15600000");
        salePayload.put("isShipping", false);
        salePayload.put("firstSource", "Facebook");
        salePayload.put("lastSource", "Cửa hàng");
        salePayload.put("accessories", List.of(
                Map.of("sku", ramPart.getSku(), "name", ramPart.getName(), "quantity", 1, "isUpgrade", true, "price", "500000"),
                Map.of("sku", giftMouse.getSku(), "name", giftMouse.getName(), "quantity", 1, "isGift", true, "price", "0"),
                Map.of("sku", paidBag.getSku(), "name", paidBag.getName(), "quantity", 1, "isGift", false, "price", "300000")
        ));

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), salePayload).getBody().getData();
        assertNotNull(soldCycle);
        assertTrue(soldCycle.getSourceReference().startsWith("BM") && soldCycle.getSourceReference().length() == 10);

        // Kiểm tra tồn kho đã trừ chính xác
        assertFalse(activeInventoryRepository.findBySerialKey(serial).isPresent(), "Máy đã bán phải rời khỏi ActiveInventory");
        assertEquals(4, partRepository.findBySku(ramPart.getSku()).orElseThrow().getQuantity(), "RAM nâng cấp phải trừ 1");
        assertEquals(9, accessoryRepository.findBySku(giftMouse.getSku()).orElseThrow().getQuantity(), "Chuột tặng kèm phải trừ 1");
        assertEquals(9, accessoryRepository.findBySku(paidBag.getSku()).orElseThrow().getQuantity(), "Balo mua thêm phải trừ 1");

        // Kiểm tra tách bạch doanh thu:
        // Doanh thu thực của máy = 15.600.000 (tổng thu) - 300.000 (balo mua thêm) = 15.300.000đ
        assertEquals(0, new BigDecimal("15300000").compareTo(soldCycle.getSalePriceSnapshot()),
                "salePriceSnapshot của máy phải tách riêng tiền phụ kiện mua thêm để không nhân đôi doanh thu");
        assertEquals(LocalDate.now().plusMonths(6), soldCycle.getWarrantyExpiry(),
                "Đơn bán tại quầy phải kích hoạt hạn bảo hành ngay lập tức");

        SalesOrder machineSo = salesOrderRepository.findByMatchedCycleId(soldCycle.getCycleId()).orElseThrow();
        assertEquals("Hoàn tất", machineSo.getOrderStatus());
        assertEquals(0, new BigDecimal("15300000").compareTo(machineSo.getNetRevenue()));

        String pkKemCode = "PK-KEM-" + soldCycle.getCycleId().replace("CYC-", "");
        SalesOrder accSo = salesOrderRepository.findByTransactionId(pkKemCode).orElseThrow();
        assertEquals("ACCESSORY", accSo.getOrderCategory());
        assertEquals(0, new BigDecimal("300000").compareTo(accSo.getNetRevenue()));
    }

    // =========================================================================
    // LUỒNG 8: ĐƠN SHIP XA & XÁC NHẬN KHÁCH NHẬN HÀNG KÍCH HOẠT BẢO HÀNH
    // =========================================================================
    @Test
    @Order(8)
    @DisplayName("Luồng 08: Đơn Ship COD (Chưa tính hạn BH khi đang giao -> Kích hoạt BH từ ngày nhận hàng thực tế)")
    void testFlow08_ShippingOrderAndConfirmDeliveryActivatesWarranty() {
        String serial = "SN-SHIP-COD-" + System.currentTimeMillis();
        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .brand("Dell")
                .productLine("XPS")
                .modelFull("Dell XPS 9315")
                .segment("OFFICE")
                .cpu("i7-1250U")
                .ram("16GB")
                .ssd("512GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("18000000"))
                .warrantyPeriod("6 Tháng")
                .build();
        machineService.importSingleMachine(req, "admin_test");

        Accessory paidHub = accessoryController.submitAccessory(Map.of(
                "name", "Hub Type-C 8-in-1",
                "category", "CAP_HUB",
                "quantity", 5,
                "price", "400000",
                "defaultWarrantyMonths", 6
        )).getBody().getData();

        Map<String, Object> shipSalePayload = new HashMap<>();
        shipSalePayload.put("serial", serial);
        shipSalePayload.put("customerName", "Nguyễn Thị Mai (Ship)");
        shipSalePayload.put("customerPhone", "0966554433");
        shipSalePayload.put("salesperson", "nv_ship_01");
        shipSalePayload.put("warrantyPeriod", "6 Tháng");
        shipSalePayload.put("finalPrice", "18400000");
        shipSalePayload.put("isShipping", true);
        shipSalePayload.put("isDelivered", false);
        shipSalePayload.put("shippingCarrier", "GHTK");
        shipSalePayload.put("trackingCode", "GHTK-889900");
        shipSalePayload.put("shippingAddress", "123 Nguyễn Huệ, Quận 1, TP.HCM");
        shipSalePayload.put("depositAmount", "500000");
        shipSalePayload.put("codAmount", "17900000");
        shipSalePayload.put("accessories", List.of(
                Map.of("sku", paidHub.getSku(), "quantity", 1, "isGift", false, "price", "400000")
        ));

        ClosedCycle shipCycle = saleController.submitSale(UUID.randomUUID().toString(), shipSalePayload).getBody().getData();
        String cycleId = shipCycle.getCycleId();

        // 1. Khi đang giao hàng: Chưa có hạn bảo hành, trạng thái SalesOrder = "Chờ giao hàng"
        assertTrue(shipCycle.getIsShipping());
        assertFalse(shipCycle.getIsDelivered());
        assertNull(shipCycle.getWarrantyExpiry(), "Đơn ship đang giao chưa được tính ngày hết hạn bảo hành");

        SalesOrder pendingSo = salesOrderRepository.findByMatchedCycleId(cycleId).orElseThrow();
        assertEquals("Chờ giao hàng", pendingSo.getOrderStatus());

        String pkKemCode = "PK-KEM-" + cycleId.replace("CYC-", "");
        AccessoryOrder pendingAccOrder = accessoryOrderRepository.findByOrderCode(pkKemCode).orElseThrow();
        assertNull(pendingAccOrder.getItems().get(0).getWarrantyExpiry(), "Phụ kiện theo đơn ship chưa giao cũng chưa tính hạn BH");

        // Kiểm tra API danh sách đơn ship đang chờ giao
        var shippingListRes = saleController.getShippingOrders("pending", serial).getBody().getData();
        List<?> pendingOrders = (List<?>) shippingListRes.get("orders");
        assertFalse(pendingOrders.isEmpty());

        // 2. Xác nhận khách nhận hàng sau 4 ngày vận chuyển
        LocalDate actualReceiveDate = LocalDate.now().plusDays(4);
        saleController.confirmDelivery(cycleId, Map.of("deliveryDate", actualReceiveDate.toString()));

        ClosedCycle deliveredCycle = closedCycleRepository.findByCycleId(cycleId).orElseThrow();
        assertTrue(deliveredCycle.getIsDelivered());
        assertEquals(actualReceiveDate, deliveredCycle.getDeliveryDate());
        assertEquals(actualReceiveDate.plusMonths(6), deliveredCycle.getWarrantyExpiry(),
                "Hạn bảo hành máy phải bằng đúng ngày nhận hàng + 6 tháng");

        SalesOrder deliveredSo = salesOrderRepository.findByMatchedCycleId(cycleId).orElseThrow();
        assertEquals("Hoàn tất", deliveredSo.getOrderStatus());
        assertEquals("Đã thanh toán", deliveredSo.getPaymentStatus());
        assertEquals(actualReceiveDate.plusMonths(6), deliveredSo.getWarrantyExpiry());

        AccessoryOrder deliveredAccOrder = accessoryOrderRepository.findByOrderCode(pkKemCode).orElseThrow();
        assertEquals("COMPLETED", deliveredAccOrder.getStatus());
        assertEquals(actualReceiveDate.plusMonths(6), deliveredAccOrder.getItems().get(0).getWarrantyExpiry(),
                "Hạn bảo hành phụ kiện kèm máy cũng phải kích hoạt từ ngày nhận hàng");
    }

    // =========================================================================
    // LUỒNG 9: HOÀN HÀNG / ĐỔI TRẢ MÁY VỀ KHO (HOÀN KHO LINH KIỆN, PHỤ KIỆN & GIÁ GỐC)
    // =========================================================================
    @Test
    @Order(9)
    @DisplayName("Luồng 09: Hoàn đơn / Khách trả máy về kho (Hủy BH, Hoàn kho Linh kiện + Phụ kiện, Khôi phục giá máy gốc)")
    void testFlow09_OrderReturnRestoresStockAndOriginalMachinePrice() {
        String serial = "SN-RETURN-FLOW-" + System.currentTimeMillis();
        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .brand("Lenovo")
                .productLine("Legion")
                .modelFull("Lenovo Legion 5 Pro")
                .segment("GAMING")
                .cpu("i7-12700H")
                .gpu("RTX 3070")
                .ram("16GB")
                .ssd("512GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("22000000"))
                .warrantyPeriod("6 Tháng")
                .build();
        machineService.importSingleMachine(req, "admin_test");

        Part ssdUpgrade = partService.importPart(Map.of(
                "name", "SSD 1TB Samsung 980 Pro",
                "category", "SSD",
                "quantity", 3,
                "upgradePrice", "1500000",
                "retailPrice", "1800000"
        ), "admin_test");

        Accessory accMouse = accessoryController.submitAccessory(Map.of(
                "name", "Chuột Gaming Legion M300",
                "category", "CHUOT",
                "quantity", 5,
                "price", "350000",
                "defaultWarrantyMonths", 6
        )).getBody().getData();

        // Bán máy: Giá máy 22tr + Nâng cấp SSD 1.5tr + Chuột 350k = 23.850.000đ
        Map<String, Object> salePayload = new HashMap<>();
        salePayload.put("serial", serial);
        salePayload.put("customerName", "Phạm Văn Hoàn");
        salePayload.put("customerPhone", "0944332211");
        salePayload.put("salesperson", "nv_sale_02");
        salePayload.put("warrantyPeriod", "6 Tháng");
        salePayload.put("finalPrice", "23850000");
        salePayload.put("accessories", List.of(
                Map.of("sku", ssdUpgrade.getSku(), "name", ssdUpgrade.getName(), "quantity", 1, "isUpgrade", true, "price", "1500000"),
                Map.of("sku", accMouse.getSku(), "name", accMouse.getName(), "quantity", 1, "isGift", false, "price", "350000")
        ));

        ClosedCycle soldCycle = saleController.submitSale(UUID.randomUUID().toString(), salePayload).getBody().getData();
        String cycleId = soldCycle.getCycleId();
        assertEquals(2, partRepository.findBySku(ssdUpgrade.getSku()).orElseThrow().getQuantity());
        assertEquals(4, accessoryRepository.findBySku(accMouse.getSku()).orElseThrow().getQuantity());

        // Thực hiện hoàn đơn trả máy về kho (truyền giá định dạng VN "22.000.000" để test luôn bộ parser chống lỗi dấu chấm)
        Map<String, Object> returnPayload = new HashMap<>();
        returnPayload.put("reason", "Khách đổi ý trả hàng hoàn tiền");
        returnPayload.put("returnState", "READY");
        returnPayload.put("restoreAccessories", true);
        returnPayload.put("restoreUpgradeParts", true);
        returnPayload.put("salePrice", "22.000.000");

        var returnRes = saleController.returnShippingOrder(cycleId, returnPayload).getBody().getData();
        assertNotNull(returnRes);
        assertEquals(0, new BigDecimal("22000000").compareTo((BigDecimal) returnRes.get("salePrice")));

        // 1. Kiểm tra linh kiện nâng cấp và phụ kiện kèm đã được hoàn kho
        assertEquals(3, partRepository.findBySku(ssdUpgrade.getSku()).orElseThrow().getQuantity(),
                "Linh kiện nâng cấp phải được hoàn lại tồn kho = 3");
        assertEquals(5, accessoryRepository.findBySku(accMouse.getSku()).orElseThrow().getQuantity(),
                "Phụ kiện kèm phải được hoàn lại tồn kho = 5");

        // 2. Kiểm tra máy đã quay lại ActiveInventory với giá máy gốc 22.000.000đ
        ActiveInventory returnedAi = activeInventoryRepository.findBySerialKey(serial).orElseThrow();
        assertEquals(CycleState.READY, returnedAi.getState());
        assertEquals(IntakeType.CUSTOMER_RETURN, returnedAi.getIntakeType());
        assertEquals(0, new BigDecimal("22000000").compareTo(returnedAi.getSalePrice()));

        // 3. Kiểm tra đơn cũ đã hủy bảo hành & doanh thu về 0
        ClosedCycle returnedCc = closedCycleRepository.findByCycleId(cycleId).orElseThrow();
        assertEquals(CloseType.CUSTOMER_RETURN, returnedCc.getCloseType());
        assertNull(returnedCc.getWarrantyExpiry());

        SalesOrder returnedSo = salesOrderRepository.findByMatchedCycleId(cycleId).orElseThrow();
        assertEquals("Trả hàng", returnedSo.getOrderStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(returnedSo.getNetRevenue()));

        // 4. Chặn hoàn hàng trùng lặp lần 2 trên cùng chu kỳ
        assertThrows(IllegalStateException.class, () -> saleController.returnShippingOrder(cycleId, returnPayload));
    }

    // =========================================================================
    // LUỒNG 10: XUẤT KHÁC & HOÀN TÁC NHẬP LẠI KHO (EXPORT OTHER & REOPEN)
    // =========================================================================
    @Test
    @Order(10)
    @DisplayName("Luồng 10: Xuất khác máy khỏi kho (Sổ xuất khác) và Hoàn tác nhập lại kho")
    void testFlow10_ExportOtherAndReopenMachineWorkflow() {
        String serial = "SN-EXP-OTHER-" + System.currentTimeMillis();
        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .brand("Apple")
                .productLine("MacBook Pro")
                .modelFull("MacBook Pro M2 2022")
                .segment("MACBOOK")
                .cpu("Apple M2")
                .gpu("10-core GPU")
                .ram("16GB")
                .ssd("512GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("26500000"))
                .warrantyPeriod("6 Tháng")
                .build();
        machineService.importSingleMachine(req, "admin_test");

        // 1. Xuất khác máy ra khỏi kho
        Map<String, Object> exportUpdates = new HashMap<>();
        exportUpdates.put("status", "EXPORT_OTHER");
        exportUpdates.put("notes", "Xuất máy cho phòng Marketing chụp ảnh mẫu");
        machineService.updateMachine(serial, exportUpdates, "truong_kho_01");

        assertFalse(activeInventoryRepository.findBySerialKey(serial).isPresent(), "Máy xuất khác phải rút khỏi ActiveInventory");

        // 2. Tra cứu trong Sổ xuất khác (searchHistory với status = "OTHER")
        Page<ClosedCycleDTO> otherHistory = machineService.searchHistory(serial, null, null, "OTHER", 0, 20);
        assertEquals(1, otherHistory.getTotalElements());
        ClosedCycleDTO dto = otherHistory.getContent().get(0);
        assertEquals("OTHER", dto.getCloseType());
        assertEquals("truong_kho_01", dto.getClosedBy());
        assertEquals("Xuất máy cho phòng Marketing chụp ảnh mẫu", dto.getCloseReason());
        assertTrue(dto.getSourceReference().startsWith("XK-"));

        // 3. Hoàn tác / Nhập lại máy từ Sổ xuất khác về kho
        ActiveInventory reopened = machineService.reopenExportedMachine(
                serial,
                Map.of("targetState", "READY", "reason", "Phòng Marketing đã trả lại máy"),
                "truong_kho_01"
        );
        assertNotNull(reopened);
        assertEquals(CycleState.READY, reopened.getState());
        assertEquals(0, new BigDecimal("26500000").compareTo(reopened.getSalePrice()));
        assertEquals(CycleState.READY, serialRegistryRepository.findBySerialKey(serial).orElseThrow().getCurrentState());
    }

    // =========================================================================
    // LUỒNG 11: DỊCH VỤ SỬA CHỮA, CẬP NHẬT BẢO HÀNH & TRA CỨU BẢO HÀNH HỢP NHẤT
    // =========================================================================
    @Test
    @Order(11)
    @DisplayName("Luồng 11: Tiếp nhận Sửa chữa, Sửa gói bảo hành (Xóa hạn BH khi Từ chối BH) & Tra cứu Bảo hành hợp nhất")
    void testFlow11_RepairServiceWarrantyCheckAndUpdateModal() {
        Part thermalPaste = partService.importPart(Map.of(
                "name", "Pin Lenovo ThinkPad X1 Carbon Gen 9",
                "category", "PIN",
                "quantity", 6,
                "retailPrice", "1400000",
                "warrantyMonths", 6
        ), "admin_test");

        String customerPhone = "0919888777";
        String deviceSerial = "SN-REPAIR-DEV-" + System.currentTimeMillis();

        Map<String, Object> repairPayload = new HashMap<>();
        repairPayload.put("customerName", "Đặng Văn Khoa");
        repairPayload.put("customerPhone", customerPhone);
        repairPayload.put("deviceModel", "ThinkPad X1 Carbon Gen 9");
        repairPayload.put("deviceSerial", deviceSerial);
        repairPayload.put("intakeCondition", "Pin chai 60%, sập nguồn khi rút sạc");
        repairPayload.put("accessoriesReceived", "Máy + Sạc 65W Type-C");
        repairPayload.put("promisedDate", LocalDate.now().plusDays(1).toString());
        repairPayload.put("technicianName", "ktv_minh");
        repairPayload.put("services", List.of(Map.of(
                "serviceName", "Thay Pin zin ThinkPad X1 Gen 9",
                "sku", thermalPaste.getSku(),
                "quantity", 1,
                "price", "1400000",
                "warrantyMonths", 6,
                "warrantyPeriod", "6 Tháng"
        )));

        RepairOrder createdOrder = repairOrderService.createRepairOrder(repairPayload);
        assertNotNull(createdOrder.getId());
        assertEquals(5, partRepository.findBySku(thermalPaste.getSku()).orElseThrow().getQuantity());
        assertNotNull(createdOrder.getItems().get(0).getWarrantyExpiry());

        // Test cập nhật từ Modal Sửa Đơn Sửa Chữa với quyền SERVICE_REPAIR:
        // Chuyển gói bảo hành sang "Từ chối bảo hành" và truyền warrantyExpiry = "" -> hạn bảo hành phải về null!
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("ktv_minh", null, List.of(
                        new SimpleGrantedAuthority("ROLE_TECHNICAL"),
                        new SimpleGrantedAuthority("SERVICE_REPAIR")
                ))
        );

        Long repairItemId = createdOrder.getItems().get(0).getId();
        Map<String, Object> updateWarrantyPayload = new HashMap<>();
        updateWarrantyPayload.put("customerName", "Đặng Văn Khoa");
        updateWarrantyPayload.put("customerPhone", customerPhone);
        updateWarrantyPayload.put("deviceModel", "ThinkPad X1 Carbon Gen 9");
        updateWarrantyPayload.put("technicianName", "ktv_minh");
        updateWarrantyPayload.put("note", "Máy có dấu hiệu vào nước nhẹ nên từ chối BH");
        updateWarrantyPayload.put("items", List.of(Map.of(
                "id", repairItemId,
                "warrantyPeriod", "Từ chối bảo hành",
                "warrantyMonths", 0,
                "warrantyExpiry", "",
                "note", "Từ chối BH do ẩm mạch"
        )));

        saleController.updateRepairOrderWarranty(createdOrder.getId(), updateWarrantyPayload);

        RepairOrder afterRejectWarranty = repairOrderRepository.findById(createdOrder.getId()).orElseThrow();
        RepairOrderItem updatedItem = afterRejectWarranty.getItems().get(0);
        assertEquals("Từ chối bảo hành", updatedItem.getWarrantyPeriod());
        assertNull(updatedItem.getWarrantyExpiry(), "Chuyển sang Từ chối bảo hành phải xóa sạch ngày hết hạn bảo hành cũ");

        // Hoàn tất phiếu sửa chữa -> ghi nhận doanh thu vào SalesOrder
        setUpAdminSecurityContext();
        repairOrderService.updateOrderStatus(createdOrder.getId(), "COMPLETED");
        SalesOrder repairSo = salesOrderRepository.findByTransactionId(createdOrder.getOrderCode()).orElseThrow();
        assertEquals("Hoàn tất", repairSo.getOrderStatus());
        assertEquals(0, new BigDecimal("1400000").compareTo(repairSo.getNetRevenue()));

        // Tra cứu bảo hành hợp nhất qua SaleController.checkWarranty theo SĐT khách hàng
        var warrantyCheck = saleController.checkWarranty(customerPhone).getBody().getData();
        List<?> repairsFound = (List<?>) warrantyCheck.get("repairs");
        assertFalse(repairsFound.isEmpty(), "Tra cứu bảo hành theo SĐT phải tìm thấy phiếu dịch vụ sửa chữa");
    }

    // =========================================================================
    // LUỒNG 12: CRM KHÁCH HÀNG, ĐỐI SOÁT DỮ LIỆU, BÁO CÁO DOANH SỐ & XUẤT EXCEL
    // =========================================================================
    @Test
    @Order(12)
    @DisplayName("Luồng 12: Phân loại Khách hàng CRM (Mới vs Cũ), Đối soát DataIssue, Báo cáo Dashboard & Xuất Excel")
    void testFlow12_CrmCustomerClassificationReconciliationAndReports() {
        String crmPhone = "0905111222";
        CrmCustomer crmCustomer = crmCustomerRepository.save(CrmCustomer.builder()
                .phoneNormalized(crmPhone)
                .fullName("Hoàng Minh Trí")
                .build());

        // 1. Đơn hàng đầu tiên của khách -> "Khách mua lần đầu"
        SalesOrder order1 = SalesOrder.builder()
                .transactionId("BM-CRM-1-" + System.currentTimeMillis())
                .saleDate(LocalDateTime.now().minusDays(2))
                .monthDate(LocalDate.now().withDayOfMonth(1))
                .customerName("Hoàng Minh Trí")
                .customerPhone(crmPhone)
                .customerType("Khách mua lần đầu")
                .crmCustomerId(crmCustomer.getId())
                .orderStatus("Hoàn tất")
                .paymentStatus("Đã thanh toán")
                .orderCategory("MACHINE")
                .productName("Dell Inspiron 15")
                .modelName("Dell Inspiron 15")
                .brand("DELL")
                .segment("OFFICE")
                .grossRevenue(new BigDecimal("12000000"))
                .discount(BigDecimal.ZERO)
                .netRevenue(new BigDecimal("12000000"))
                .normalizedSource("Zalo")
                .origin("WEB_APP")
                .build();
        salesOrderRepository.saveAndFlush(order1);
        crmOrderRepository.assignCustomer(crmCustomer.getId(), List.of(order1.getId()));
        crmCustomerLinkService.recalculateCustomer(crmCustomer.getId());

        CrmCustomer afterOrder1 = crmCustomerRepository.findById(crmCustomer.getId()).orElseThrow();
        assertEquals(1, afterOrder1.getTotalOrders());
        assertEquals("Khách mua lần đầu", afterOrder1.getCustomerType());

        // 2. Đơn hàng thứ hai cùng SĐT -> Tự động phân loại "Khách cũ"
        SalesOrder order2 = SalesOrder.builder()
                .transactionId("BM-CRM-2-" + System.currentTimeMillis())
                .saleDate(LocalDateTime.now().minusDays(1))
                .monthDate(LocalDate.now().withDayOfMonth(1))
                .customerName("Hoàng Minh Trí")
                .customerPhone(crmPhone)
                .orderStatus("Hoàn tất")
                .paymentStatus("Đã thanh toán")
                .orderCategory("MACHINE")
                .productName("Dell Latitude 7420")
                .modelName("Dell Latitude 7420")
                .brand("DELL")
                .segment("OFFICE")
                .grossRevenue(new BigDecimal("14000000"))
                .discount(BigDecimal.ZERO)
                .netRevenue(new BigDecimal("14000000"))
                .normalizedSource("Zalo")
                .origin("WEB_APP")
                .build();
        salesOrderRepository.saveAndFlush(order2);
        crmOrderRepository.assignCustomer(crmCustomer.getId(), List.of(order2.getId()));
        crmCustomerLinkService.recalculateCustomer(crmCustomer.getId());

        CrmCustomer afterOrder2 = crmCustomerRepository.findById(crmCustomer.getId()).orElseThrow();
        assertEquals(2, afterOrder2.getTotalOrders());
        assertEquals("Khách cũ", afterOrder2.getCustomerType());
        assertEquals(0, new BigDecimal("26000000").compareTo(afterOrder2.getTotalSpent()));

        // Tra cứu qua CrmQueryService
        CrmDtos.PageResult<CrmDtos.CustomerItem> searchRes = crmQueryService.searchCustomers(crmPhone, "lastOrderAt", "desc", 0, 10);
        assertTrue(searchRes.totalElements() >= 1);

        // 3. Kiểm thử ReconciliationService (Đối soát và xử lý ngoại lệ)
        String issueId = "ISS-TEST-" + System.currentTimeMillis();
        DataIssue issue = DataIssue.builder()
                .issueId(issueId)
                .issueFingerprint("FP-TEST-" + System.currentTimeMillis())
                .issueType("MISSING_SALE_RECORD")
                .severity(IssueSeverity.MEDIUM)
                .status(IssueStatus.OPEN)
                .entityType("CYCLE")
                .entityId("CYC-NON-EXISTENT")
                .message("Cảnh báo đối soát thử nghiệm")
                .build();
        dataIssueRepository.save(issue);

        DataIssue rechecked = reconciliationService.recheckIssue(issueId);
        assertEquals(IssueStatus.RESOLVED, rechecked.getStatus(), "Chu kỳ không còn trong ActiveInventory phải tự động RESOLVED khi quét lại");

        // 4. Kiểm thử Báo cáo Doanh số (SalesReportService) & Xuất Excel
        SalesDashboardResponse dashboard = salesReportService.getDashboardData("THIS_MONTH", null, null);
        assertNotNull(dashboard);
        assertNotNull(dashboard.getKpis());
        assertTrue(dashboard.getKpis().getActualRevenue().getCurrent() >= 26000000.0);

        ByteArrayResource reportExcel = salesReportService.generateSalesReportExcel("THIS_MONTH", null, null);
        assertNotNull(reportExcel);
        assertTrue(reportExcel.contentLength() > 1000, "File Excel báo cáo doanh số xuất ra phải có dữ liệu hợp lệ");

        // 5. Kiểm thử AnalyticsController
        AnalyticsFilterRequest filter = new AnalyticsFilterRequest();
        var analyticsSummary = analyticsController.getSummary(filter).getBody().getData();
        assertNotNull(analyticsSummary);
        assertTrue(analyticsSummary.containsKey("inventoryValue"));
        assertTrue(analyticsSummary.containsKey("inventoryCount"));
    }
}
