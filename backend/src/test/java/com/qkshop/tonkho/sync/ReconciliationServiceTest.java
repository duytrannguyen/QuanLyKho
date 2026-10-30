package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.intake.IntakeService;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.issue.DataIssue;
import com.qkshop.tonkho.issue.DataIssueRepository;
import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock
    private DataIssueRepository dataIssueRepo;

    @Mock
    private ActiveInventoryRepository activeInventoryRepo;

    @Mock
    private ClosedCycleRepository closedCycleRepo;

    @Mock
    private SalesSyncLedgerRepository ledgerRepo;

    @Mock
    private SyncRunRepository syncRunRepo;

    @Mock
    private IntakeService intakeService;

    @Mock
    private com.qkshop.tonkho.salesreport.SalesOrderRepository salesOrderRepo;

    @InjectMocks
    private ReconciliationService reconciliationService;

    private DataIssue mockIssue;

    @BeforeEach
    void setUp() {
        mockIssue = DataIssue.builder()
                .id(1L)
                .issueId("ISSUE-TEST-001")
                .issueType("ORDER_CANCELLED_PENDING_RETURN")
                .entityId("SERIAL-ABC-123")
                .sourceReference("TXN-20261022-0001")
                .status(IssueStatus.OPEN)
                .message("Đơn hàng đã bị hủy")
                .build();
    }

    @Test
    void testApproveReturn_WhenNoPriorClosedCycle_ShouldUseSafeDefaults() {
        when(dataIssueRepo.findByIssueId("ISSUE-TEST-001")).thenReturn(Optional.of(mockIssue));
        when(activeInventoryRepo.existsBySerialKey("SERIAL-ABC-123")).thenReturn(false);
        when(closedCycleRepo.findBySerialKeyOrderByClosedAtDesc("SERIAL-ABC-123")).thenReturn(Collections.emptyList());

        ActiveInventory createdInv = ActiveInventory.builder()
                .cycleId("CYC-TEST-NEW")
                .serialKey("SERIAL-ABC-123")
                .build();

        when(intakeService.createInventoryCycle(any(MachineImportRequest.class), anyString(), eq("ADMIN")))
                .thenReturn(createdInv);
        when(ledgerRepo.findBySerialKey("SERIAL-ABC-123")).thenReturn(Collections.emptyList());
        when(dataIssueRepo.save(any(DataIssue.class))).thenAnswer(i -> i.getArgument(0));

        DataIssue resolvedIssue = reconciliationService.approveReturn("ISSUE-TEST-001", "ADMIN", "Khách đổi ý");

        assertEquals(IssueStatus.RESOLVED, resolvedIssue.getStatus());
        assertNotNull(resolvedIssue.getResolvedAt());
        assertTrue(resolvedIssue.getMessage().contains("[ĐÃ NHẬP KHO LẠI]: Vòng tồn mới CYC-TEST-NEW"));

        ArgumentCaptor<MachineImportRequest> captor = ArgumentCaptor.forClass(MachineImportRequest.class);
        verify(intakeService).createInventoryCycle(captor.capture(), anyString(), eq("ADMIN"));

        MachineImportRequest req = captor.getValue();
        assertEquals("SERIAL-ABC-123", req.getSerial());
        assertEquals("KHÁC", req.getBrand());
        assertEquals("Chưa phân loại", req.getProductLine());
        assertEquals("Laptop", req.getModelFull());
        assertEquals("Chưa rõ", req.getRam());
        assertEquals("Chưa rõ", req.getSsd());
    }

    @Test
    void testApproveReturn_WhenMachineAlreadyInInventory_ShouldThrowIllegalStateException() {
        when(dataIssueRepo.findByIssueId("ISSUE-TEST-001")).thenReturn(Optional.of(mockIssue));
        when(activeInventoryRepo.existsBySerialKey("SERIAL-ABC-123")).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                reconciliationService.approveReturn("ISSUE-TEST-001", "ADMIN", null)
        );

        assertTrue(ex.getMessage().contains("hiện đã có trong kho ở trạng thái hoạt động"));
        verifyNoInteractions(intakeService);
    }

    @Test
    void testRecheckIssue_WhenUnknownSerialFoundInClosedCycles_ShouldResolve() {
        DataIssue unknownSerialIssue = DataIssue.builder()
                .id(2L)
                .issueId("ISSUE-UNKNOWN-002")
                .issueType("UNKNOWN_SERIAL_SOLD")
                .entityId("SERIAL-XYZ-789")
                .status(IssueStatus.OPEN)
                .message("Serial không có trong kho")
                .build();

        when(dataIssueRepo.findByIssueId("ISSUE-UNKNOWN-002")).thenReturn(Optional.of(unknownSerialIssue));
        when(activeInventoryRepo.findBySerialKey("SERIAL-XYZ-789")).thenReturn(Optional.empty());
        when(closedCycleRepo.findBySerialKeyOrderByClosedAtDesc("SERIAL-XYZ-789"))
                .thenReturn(List.of(ClosedCycle.builder().id(99L).serialKey("SERIAL-XYZ-789").build()));
        when(dataIssueRepo.save(any(DataIssue.class))).thenAnswer(i -> i.getArgument(0));

        DataIssue resolved = reconciliationService.recheckIssue("ISSUE-UNKNOWN-002");

        assertEquals(IssueStatus.RESOLVED, resolved.getStatus());
        assertTrue(resolved.getMessage().contains("Đã được khắc phục tự động"));
    }
}
