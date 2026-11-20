package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.inspection.InspectionController;
import com.qkshop.tonkho.inspection.InspectionRequestRepository;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.inspection.InspectionService;
import com.qkshop.tonkho.inspection.dto.InspectionDTO;
import com.qkshop.tonkho.inspection.dto.InspectionRequest;
import com.qkshop.tonkho.intake.IntakeService;
import com.qkshop.tonkho.intake.IntakeType;
import com.qkshop.tonkho.inventory.dto.ClosedCycleDTO;
import com.qkshop.tonkho.machine.MachineService;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.analytics.AnalyticsService;
import com.qkshop.tonkho.analytics.dto.AnalyticsFilterRequest;
import com.qkshop.tonkho.core.enums.CloseType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
class InventoryDurationLogicTest {

    @Autowired
    private IntakeService intakeService;
    @Autowired
    private InspectionService inspectionService;
    @Autowired
    private InspectionController inspectionController;
    @Autowired
    private InspectionRequestRepository inspectionRequestRepository;
    @Autowired
    private MachineService machineService;
    @Autowired
    private ActiveInventoryRepository activeInventoryRepository;
    @Autowired
    private ClosedCycleRepository closedCycleRepository;
    @Autowired
    private AnalyticsService analyticsService;

    @BeforeEach
    void setUpAuth() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin_duration_test", null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("INSPECTION")))
        );
    }

    @Test
    @DisplayName("Unit: InventoryDurationHelper tách bạch storageDays, pausedDays, sellableDays và chuẩn hóa calendar day")
    void testHelperCalculations() {
        LocalDateTime yesterdayNight = LocalDateTime.of(2026, 11, 19, 22, 0);
        LocalDateTime todayMorning = LocalDateTime.of(2026, 11, 20, 9, 0);
        assertEquals(1L, InventoryDurationHelper.calculateDaysBetween(yesterdayNight, todayMorning),
                "Qua nửa đêm theo ngày lịch phải tính là 1 ngày dù chưa đủ 24 giờ");

        LocalDateTime now = LocalDateTime.of(2026, 11, 20, 14, 0);
        ActiveInventory aiPaused = ActiveInventory.builder()
                .intakeAt(now.minusDays(10))
                .state(CycleState.NEEDS_INSPECTION)
                .pausedDays(0L)
                .lastPausedAt(now.minusDays(10))
                .build();

        long storage = InventoryDurationHelper.calculateStorageDays(aiPaused, now);
        long paused = InventoryDurationHelper.calculateTotalPausedDays(aiPaused, now);
        long sellable = InventoryDurationHelper.calculateSellableDays(storage, paused);
        assertEquals(10L, storage);
        assertEquals(10L, paused);
        assertEquals(0L, sellable);

        // Chuyển sang READY sau khi nằm chờ 10 ngày, rồi tồn tiếp 5 ngày
        InventoryDurationHelper.accumulatePausedDays(aiPaused, now);
        aiPaused.setState(CycleState.READY);
        assertEquals(10L, aiPaused.getPausedDays());
        assertNull(aiPaused.getLastPausedAt());

        LocalDateTime fiveDaysLater = now.plusDays(5);
        long storageLater = InventoryDurationHelper.calculateStorageDays(aiPaused, fiveDaysLater);
        long pausedLater = InventoryDurationHelper.calculateTotalPausedDays(aiPaused, fiveDaysLater);
        long sellableLater = InventoryDurationHelper.calculateSellableDays(storageLater, pausedLater);
        assertEquals(15L, storageLater);
        assertEquals(10L, pausedLater);
        assertEquals(5L, sellableLater);
    }

    @Test
    @DisplayName("Integration: Nhập máy trạng thái CẦN KIỂM TRA với ngày nhập lùi -> Lưu kho, Ngày chờ & Tuổi bán khớp trên cả 2 màn hình")
    void testBackdatedInspectionIntakeDisplaysAccurateStorageAndWaitDays() {
        String serial = "SN-DUR-INSP-" + System.currentTimeMillis();
        LocalDate tenDaysAgo = LocalDate.now().minusDays(10);

        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .brand("Dell")
                .productLine("Latitude")
                .modelFull("Dell Latitude 7430")
                .segment("OFFICE")
                .cpu("i5-1245U")
                .ram("16GB")
                .ssd("512GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("CẦN KIỂM TRA")
                .importDate(tenDaysAgo.toString())
                .price(new BigDecimal("12500000"))
                .build();

        ActiveInventory ai = intakeService.createInventoryCycle(req, UUID.randomUUID().toString(), "admin_duration_test");
        assertEquals(CycleState.NEEDS_INSPECTION, ai.getState());
        assertEquals(tenDaysAgo, ai.getIntakeAt().toLocalDate());
        assertNotNull(ai.getLastPausedAt());
        assertEquals(tenDaysAgo, ai.getLastPausedAt().toLocalDate());

        // Kiểm tra API Quản lý mã máy (TrangQuanLyMaMay)
        Page<ClosedCycleDTO> historyPage = machineService.searchHistory(serial, "Tất cả", "Tất cả", "ACTIVE_ONLY", 0, 10);
        assertEquals(1, historyPage.getTotalElements());
        ClosedCycleDTO historyDto = historyPage.getContent().get(0);
        assertEquals(10L, historyDto.getStorageDays(), "Tổng ngày lưu kho phải là 10 ngày thay vì bị trừ thành 0");
        assertEquals(10L, historyDto.getPausedDays(), "Ngày chờ kiểm tra/sửa phải là 10 ngày");
        assertEquals(0L, historyDto.getSellableDays(), "Tuổi bán hàng khi chưa từng READY phải là 0 ngày");

        // Kiểm tra API Kiểm định QC (TrangKiemDinh)
        List<InspectionDTO> inspections = inspectionController.getInspections("ALL").getBody().getData();
        InspectionDTO inspDto = inspections.stream()
                .filter(i -> serial.equalsIgnoreCase(i.getSerial()))
                .findFirst()
                .orElseThrow();
        assertEquals("10 ngày", inspDto.getInventoryDays());
        assertEquals("10 ngày", inspDto.getWaitDays());
        assertEquals("0 ngày", inspDto.getSellableDays());
    }

    @Test
    @DisplayName("Integration: Phiếu kiểm định đã đóng (Hủy/Trả về ClosedCycle) vẫn hiển thị đúng Tên máy và Ngày lưu kho")
    void testRejectedInspectionFallsBackToClosedCycleAndStopsWaitDays() {
        String serial = "SN-DUR-REJ-" + System.currentTimeMillis();
        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .brand("HP")
                .productLine("EliteBook")
                .modelFull("HP EliteBook 845 G8")
                .segment("OFFICE")
                .cpu("Ryzen 5 5650U")
                .ram("16GB")
                .ssd("512GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("CẦN KIỂM TRA")
                .importDate(LocalDate.now().minusDays(8).toString())
                .price(new BigDecimal("11000000"))
                .build();

        ActiveInventory ai = intakeService.createInventoryCycle(req, UUID.randomUUID().toString(), "admin_duration_test");
        InspectionRequest openReq = inspectionRequestRepository.findByCycleId(ai.getCycleId()).get(0);

        // Từ chối / trả máy -> đóng sang ClosedCycle
        InspectionRequest rejected = inspectionService.rejectInspection(openReq.getInspectionRequestId(), "ktv_test", "Lỗi nguồn");
        assertEquals(InspectionRequestStatus.REJECTED_RETURNED, rejected.getStatus());
        // Giả lập phiếu được tạo 8 ngày trước và hoàn tất 2 ngày trước để test chốt waitDays
        rejected.setCreatedAt(LocalDateTime.now().minusDays(8));
        rejected.setCompletedAt(LocalDateTime.now().minusDays(2));
        inspectionRequestRepository.saveAndFlush(rejected);

        ClosedCycle cc = closedCycleRepository.findByCycleId(ai.getCycleId()).orElseThrow();
        assertEquals(CloseType.CANCEL, cc.getCloseType());

        List<InspectionDTO> inspections = inspectionController.getInspections("ALL").getBody().getData();
        InspectionDTO dto = inspections.stream()
                .filter(i -> rejected.getInspectionRequestId().equals(i.getId()))
                .findFirst()
                .orElseThrow();

        assertEquals("HP EliteBook 845 G8", dto.getName(), "Phải fallback sang ClosedCycle để không hiển thị '-'");
        assertNotEquals("-", dto.getConfig());
        assertEquals("8 ngày", dto.getInventoryDays(), "Phải lấy tổng ngày lưu kho từ ClosedCycle thay vì '0 ngày'");
        assertEquals("6 ngày", dto.getWaitDays(), "Ngày chờ phải chốt đến completedAt (8 - 2 = 6 ngày)");
    }

    @Test
    @DisplayName("Integration: Nhập lại máy từ Sổ xuất khác ở trạng thái NEEDS_INSPECTION phải gắn lastPausedAt và tạo phiếu kiểm định")
    void testReopenExportedMachineToNeedsInspection() {
        String serial = "SN-DUR-REOPEN-" + System.currentTimeMillis();
        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .brand("Lenovo")
                .productLine("ThinkPad")
                .modelFull("ThinkPad X13 Gen 2")
                .segment("OFFICE")
                .cpu("i5-1135G7")
                .ram("16GB")
                .ssd("256GB")
                .importType("MUA/NHẬP HÀNG")
                .initialStatus("SẴN SÀNG BÁN")
                .price(new BigDecimal("10000000"))
                .build();

        machineService.importSingleMachine(req, "admin_duration_test");
        machineService.updateMachine(serial, Map.of("status", "EXPORT_OTHER", "notes", "Xuất test"), "admin_duration_test");

        ActiveInventory reopened = machineService.reopenExportedMachine(
                serial,
                Map.of("targetState", "NEEDS_INSPECTION", "reason", "Kiểm tra lại khi nhập kho"),
                "admin_duration_test"
        );
        assertEquals(CycleState.NEEDS_INSPECTION, reopened.getState());
        assertNotNull(reopened.getLastPausedAt(), "Nhập lại trạng thái NEEDS_INSPECTION phải ghi nhận lastPausedAt");
        assertFalse(inspectionRequestRepository.findByCycleId(reopened.getCycleId()).isEmpty(),
                "Nhập lại trạng thái NEEDS_INSPECTION phải tự động tạo phiếu kiểm định");
    }

    @Test
    @DisplayName("Integration: Dashboard Tuổi tồn kho trừ pausedDays chính xác khi phân nhóm")
    void testAnalyticsInventoryAgeExcludesPausedDays() {
        String serial = "SN-AGE-PAUSED-" + System.currentTimeMillis();
        ActiveInventory ai = ActiveInventory.builder()
                .cycleId("CYC-AGE-" + System.currentTimeMillis())
                .serialKey(serial)
                .sourceModelText("Dell XPS 9320")
                .intakeType(IntakeType.PURCHASE)
                .intakeAt(LocalDateTime.now().minusDays(35))
                .pausedDays(15L) // 35 - 15 = 20 ngày tuổi bán -> nhóm Dưới 30 ngày
                .state(CycleState.READY)
                .salePrice(new BigDecimal("20000000"))
                .build();
        activeInventoryRepository.saveAndFlush(ai);

        AnalyticsFilterRequest filter = new AnalyticsFilterRequest();
        filter.setProductType("LAPTOP");
        List<Map<String, Object>> ageGroups = analyticsService.getInventoryAge(filter);

        long under30 = ageGroups.stream()
                .filter(g -> "Dưới 30 ngày".equals(g.get("range")))
                .mapToLong(g -> ((Number) g.get("count")).longValue())
                .findFirst()
                .orElse(0L);
        assertTrue(under30 >= 1L, "Máy tồn 35 ngày nhưng trừ 15 ngày chờ sửa phải nằm ở nhóm Dưới 30 ngày");
    }
}
