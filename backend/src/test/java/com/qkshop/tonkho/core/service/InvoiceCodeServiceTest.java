package com.qkshop.tonkho.core.service;

import com.qkshop.tonkho.accessory.AccessoryOrderRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.repair.RepairOrderRepository;
import com.qkshop.tonkho.salesreport.SalesOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceCodeServiceTest {

    @Mock
    private SalesOrderRepository salesOrderRepo;

    @Mock
    private ClosedCycleRepository closedCycleRepo;

    @Mock
    private AccessoryOrderRepository accessoryOrderRepo;

    @Mock
    private RepairOrderRepository repairOrderRepo;

    @InjectMocks
    private InvoiceCodeServiceImpl invoiceCodeService;

    @Test
    @DisplayName("Tạo mã hóa đơn bán máy: đủ 10 ký tự, tiền tố BM, đúng ngày tháng và STT")
    void testGenerateMachineInvoiceCode() {
        LocalDateTime date = LocalDateTime.of(2026, 11, 1, 14, 30);

        when(salesOrderRepo.findMachineTransactionIdsInMonth(any(), any())).thenReturn(Collections.emptyList());
        when(closedCycleRepo.findMachineInvoiceCodesInMonth(any(), any())).thenReturn(Collections.emptyList());
        when(salesOrderRepo.existsByTransactionId(anyString())).thenReturn(false);
        when(closedCycleRepo.existsBySourceReference(anyString())).thenReturn(false);

        String code = invoiceCodeService.generateMachineInvoiceCode(date);

        assertNotNull(code);
        assertEquals(10, code.length(), "Mã hóa đơn bán máy phải gồm chính xác 10 ký tự");
        assertTrue(code.startsWith("BM"), "Mã hóa đơn bán máy phải bắt đầu bằng BM");
        assertTrue(code.endsWith("0111"), "Mã hóa đơn phải kết thúc bằng ngày tháng 0111");
        assertEquals("BM00010111", code);
    }

    @Test
    @DisplayName("Tạo mã hóa đơn phụ kiện: đủ 10 ký tự, tiền tố PK, tự tăng STT tiếp theo")
    void testGenerateAccessoryInvoiceCodeWithExistingOrders() {
        LocalDateTime date = LocalDateTime.of(2026, 11, 5, 10, 0);

        // Đã có hóa đơn PK0001... và PK0002... trong tháng
        when(accessoryOrderRepo.findOrderCodesInMonth(any(), any()))
                .thenReturn(List.of("PK00010111", "PK00020311"));
        when(accessoryOrderRepo.existsByOrderCode(anyString())).thenReturn(false);
        when(salesOrderRepo.existsByTransactionId(anyString())).thenReturn(false);

        String code = invoiceCodeService.generateAccessoryInvoiceCode(date);

        assertNotNull(code);
        assertEquals(10, code.length());
        assertTrue(code.startsWith("PK"));
        assertTrue(code.endsWith("0511"), "Ngày 5 tháng 11 phải kết thúc là 0511");
        assertEquals("PK00030511", code, "STT tiếp theo phải là 0003");
    }

    @Test
    @DisplayName("Tạo mã hóa đơn sửa chữa: đủ 10 ký tự, tiền tố SC, đúng định dạng")
    void testGenerateRepairInvoiceCode() {
        LocalDateTime date = LocalDateTime.of(2026, 12, 25, 9, 15);

        when(repairOrderRepo.findOrderCodesInMonth(any(), any())).thenReturn(Collections.emptyList());
        when(repairOrderRepo.existsByOrderCode(anyString())).thenReturn(false);
        when(salesOrderRepo.existsByTransactionId(anyString())).thenReturn(false);

        String code = invoiceCodeService.generateRepairInvoiceCode(date);

        assertNotNull(code);
        assertEquals(10, code.length(), "Mã hóa đơn dịch vụ sửa chữa phải gồm chính xác 10 ký tự");
        assertTrue(code.startsWith("SC"), "Mã sửa chữa phải bắt đầu bằng SC");
        assertTrue(code.endsWith("2512"), "Ngày 25 tháng 12 phải kết thúc là 2512");
        assertEquals("SC00012512", code);
    }

    @Test
    @DisplayName("Tự động tăng STT khi phát hiện trùng mã ứng viên")
    void testCollisionAvoidance() {
        LocalDateTime date = LocalDateTime.of(2026, 11, 1, 10, 0);

        when(salesOrderRepo.findMachineTransactionIdsInMonth(any(), any())).thenReturn(Collections.emptyList());
        when(closedCycleRepo.findMachineInvoiceCodesInMonth(any(), any())).thenReturn(Collections.emptyList());

        // Giả sử mã BM00010111 đã tồn tại trong DB, hệ thống phải tự tăng lên BM00020111
        when(salesOrderRepo.existsByTransactionId("BM00010111")).thenReturn(true);
        when(salesOrderRepo.existsByTransactionId("BM00020111")).thenReturn(false);
        when(closedCycleRepo.existsBySourceReference(anyString())).thenReturn(false);

        String code = invoiceCodeService.generateMachineInvoiceCode(date);

        assertEquals("BM00020111", code);
        assertEquals(10, code.length());
    }
}
