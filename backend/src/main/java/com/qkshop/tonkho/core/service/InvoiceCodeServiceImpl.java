package com.qkshop.tonkho.core.service;

import com.qkshop.tonkho.accessory.AccessoryOrderRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.repair.RepairOrderRepository;
import com.qkshop.tonkho.salesreport.SalesOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Implementation sinh mã hóa đơn 10 ký tự:
 * [Phân loại 2 ký tự][STT trong tháng 4 chữ số][Ngày/tháng ddMM 4 chữ số]
 * - Bán máy: BM00010111
 * - Phụ kiện: PK00010111
 * - Sửa chữa: SC00010111
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceCodeServiceImpl implements InvoiceCodeService {

    private static final String PREFIX_MACHINE = "BM";
    private static final String PREFIX_ACCESSORY = "PK";
    private static final String PREFIX_REPAIR = "SC";
    private static final DateTimeFormatter DAY_MONTH_FORMATTER = DateTimeFormatter.ofPattern("ddMM");

    private final SalesOrderRepository salesOrderRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final AccessoryOrderRepository accessoryOrderRepo;
    private final RepairOrderRepository repairOrderRepo;

    @Override
    @Transactional(readOnly = true)
    public synchronized String generateMachineInvoiceCode(LocalDateTime saleDate) {
        LocalDateTime actualDate = saleDate != null ? saleDate : LocalDateTime.now();
        LocalDateTime startOfMonth = actualDate.toLocalDate().withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = startOfMonth.plusMonths(1);

        return generateCode(
                PREFIX_MACHINE,
                actualDate,
                () -> {
                    Set<String> codes = new HashSet<>();
                    if (salesOrderRepo != null) {
                        List<String> list = salesOrderRepo.findMachineTransactionIdsInMonth(startOfMonth, endOfMonth);
                        if (list != null) codes.addAll(list);
                    }
                    if (closedCycleRepo != null) {
                        List<String> list = closedCycleRepo.findMachineInvoiceCodesInMonth(startOfMonth, endOfMonth);
                        if (list != null) codes.addAll(list);
                    }
                    return new ArrayList<>(codes);
                },
                candidate -> (salesOrderRepo != null && salesOrderRepo.existsByTransactionId(candidate))
                        || (closedCycleRepo != null && closedCycleRepo.existsBySourceReference(candidate))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public synchronized String generateAccessoryInvoiceCode(LocalDateTime saleDate) {
        LocalDateTime actualDate = saleDate != null ? saleDate : LocalDateTime.now();
        LocalDateTime startOfMonth = actualDate.toLocalDate().withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = startOfMonth.plusMonths(1);

        return generateCode(
                PREFIX_ACCESSORY,
                actualDate,
                () -> {
                    Set<String> codes = new HashSet<>();
                    if (accessoryOrderRepo != null) {
                        List<String> list = accessoryOrderRepo.findOrderCodesInMonth(startOfMonth, endOfMonth);
                        if (list != null) codes.addAll(list);
                    }
                    return new ArrayList<>(codes);
                },
                candidate -> (accessoryOrderRepo != null && accessoryOrderRepo.existsByOrderCode(candidate))
                        || (salesOrderRepo != null && salesOrderRepo.existsByTransactionId(candidate))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public synchronized String generateRepairInvoiceCode(LocalDateTime createdDate) {
        LocalDateTime actualDate = createdDate != null ? createdDate : LocalDateTime.now();
        LocalDateTime startOfMonth = actualDate.toLocalDate().withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = startOfMonth.plusMonths(1);

        return generateCode(
                PREFIX_REPAIR,
                actualDate,
                () -> {
                    Set<String> codes = new HashSet<>();
                    if (repairOrderRepo != null) {
                        List<String> list = repairOrderRepo.findOrderCodesInMonth(startOfMonth, endOfMonth);
                        if (list != null) codes.addAll(list);
                    }
                    return new ArrayList<>(codes);
                },
                candidate -> (repairOrderRepo != null && repairOrderRepo.existsByOrderCode(candidate))
                        || (salesOrderRepo != null && salesOrderRepo.existsByTransactionId(candidate))
        );
    }

    private String generateCode(
            String prefix,
            LocalDateTime actualDate,
            java.util.function.Supplier<List<String>> existingCodesSupplier,
            java.util.function.Predicate<String> existsChecker) {

        String dayMonth = actualDate.format(DAY_MONTH_FORMATTER);
        List<String> existing = existingCodesSupplier.get();
        Pattern pattern = Pattern.compile("^" + Pattern.quote(prefix) + "(\\d{4})\\d{4}$");

        int maxStt = 0;
        if (existing != null) {
            for (String code : existing) {
                if (code != null) {
                    Matcher m = pattern.matcher(code.trim());
                    if (m.matches()) {
                        try {
                            int stt = Integer.parseInt(m.group(1));
                            maxStt = Math.max(maxStt, stt);
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        int nextStt = maxStt + 1;
        String candidate = String.format("%s%04d%s", prefix, nextStt, dayMonth);

        while (existsChecker.test(candidate)) {
            nextStt++;
            candidate = String.format("%s%04d%s", prefix, nextStt, dayMonth);
        }

        log.debug("Đã sinh mã hóa đơn [{}]: {}", prefix, candidate);
        return candidate;
    }
}
