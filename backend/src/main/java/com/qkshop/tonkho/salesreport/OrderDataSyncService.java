package com.qkshop.tonkho.salesreport;

import com.qkshop.tonkho.accessory.AccessoryOrder;
import com.qkshop.tonkho.accessory.AccessoryOrderItem;
import com.qkshop.tonkho.accessory.AccessoryOrderRepository;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.crm.CrmCustomer;
import com.qkshop.tonkho.crm.CrmCustomerRepository;
import com.qkshop.tonkho.crm.CrmOrderRepository;
import com.qkshop.tonkho.crm.PhoneNormalizer;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.notification.NotificationRepository;
import com.qkshop.tonkho.repair.RepairOrder;
import com.qkshop.tonkho.repair.RepairOrderItem;
import com.qkshop.tonkho.repair.RepairOrderRepository;
import com.qkshop.tonkho.sale.SalesConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Trung tâm đồng bộ dữ liệu thống nhất nội bộ giữa:
 * ClosedCycle (Chu kỳ máy) ↔ SalesOrder (Sổ cái đơn hàng) ↔ AccessoryOrder ↔ RepairOrder ↔ CrmCustomer.
 *
 * Chỉ inject Repository để tránh hoàn toàn circular dependency giữa các service nghiệp vụ.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderDataSyncService {

    private final SalesOrderRepository salesOrderRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final AccessoryOrderRepository accessoryOrderRepo;
    private final RepairOrderRepository repairOrderRepo;
    private final CrmCustomerRepository crmCustomerRepo;
    private final CrmOrderRepository crmOrderRepo;
    private final NotificationRepository notificationRepo;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. ĐỒNG BỘ CLOSED_CYCLE (MÁY MÓC) ↔ SALES_ORDER + PK-KEM- + CRM
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Tìm SalesOrder khớp chính xác nhất với một ClosedCycle máy móc.
     */
    @Transactional(readOnly = true)
    public Optional<SalesOrder> resolveMatchingSalesOrder(ClosedCycle cc) {
        if (cc == null) return Optional.empty();

        if (hasText(cc.getCycleId())) {
            Optional<SalesOrder> byCycle = salesOrderRepo.findByMatchedCycleId(cc.getCycleId());
            if (byCycle.isPresent()) return byCycle;
        }

        if (hasText(cc.getSourceReference())) {
            Optional<SalesOrder> byRef = salesOrderRepo.findByTransactionId(cc.getSourceReference().trim())
                    .filter(this::isMachineOrder)
                    .filter(so -> !hasText(so.getMatchedCycleId()) || Objects.equals(so.getMatchedCycleId(), cc.getCycleId()));
            if (byRef.isPresent()) return byRef;
        }

        if (!hasText(cc.getSerialKey())) {
            return Optional.empty();
        }

        LocalDateTime cycleDate = cc.getSaleDate() != null ? cc.getSaleDate() : cc.getClosedAt();
        return salesOrderRepo.findBySerialKeysContaining(cc.getSerialKey().trim()).stream()
                .filter(this::isMachineOrder)
                .filter(so -> !isBundledAccessoryCode(so.getTransactionId()))
                .filter(so -> hasExactSerialToken(so.getSerialKeys(), cc.getSerialKey()))
                .filter(so -> !hasText(so.getMatchedCycleId()) || Objects.equals(so.getMatchedCycleId(), cc.getCycleId()))
                .min(Comparator.comparingLong(so -> Math.abs(dateDistanceMinutes(cycleDate, so.getSaleDate()))));
    }

    @Transactional(rollbackFor = Exception.class)
    public SalesOrder syncClosedCycleToSalesOrder(ClosedCycle cc) {
        return syncClosedCycleToSalesOrder(cc, null, false);
    }

    @Transactional(rollbackFor = Exception.class)
    public SalesOrder syncClosedCycleToSalesOrder(ClosedCycle cc, Map<String, Object> extraMeta, boolean overwriteCustomerName) {
        if (cc == null) return null;

        boolean isCustomerLifecycleClose = cc.getCloseType() == CloseType.SALE
                || cc.getCloseType() == CloseType.GIFT
                || cc.getCloseType() == CloseType.CUSTOMER_RETURN
                || cc.getCloseType() == CloseType.CANCEL;

        Optional<SalesOrder> existingOpt = resolveMatchingSalesOrder(cc);
        if (!isCustomerLifecycleClose && existingOpt.isEmpty()) {
            return null;
        }

        String defaultTxnId = hasText(cc.getSourceReference()) ? cc.getSourceReference().trim() : cc.getCycleId();
        SalesOrder so = existingOpt.orElseGet(() -> salesOrderRepo.findByTransactionId(defaultTxnId)
                .filter(existing -> !hasText(existing.getMatchedCycleId()) || Objects.equals(existing.getMatchedCycleId(), cc.getCycleId()))
                .orElseGet(() -> SalesOrder.builder()
                        .transactionId(defaultTxnId)
                        .origin("WEB_APP")
                        .build()));

        // Chuẩn hóa SĐT hai chiều
        String normalizedCyclePhone = normalizePhoneOrKeep(cc.getCustomerPhone());
        if (hasText(normalizedCyclePhone) && !Objects.equals(cc.getCustomerPhone(), normalizedCyclePhone)) {
            cc.setCustomerPhone(normalizedCyclePhone);
        }

        // Bù dữ liệu còn thiếu giữa ClosedCycle <-> SalesOrder
        boolean cycleModified = false;
        if (hasText(cc.getCustomerName())) {
            so.setCustomerName(cc.getCustomerName().trim());
        } else if (hasText(so.getCustomerName())) {
            cc.setCustomerName(so.getCustomerName().trim());
            cycleModified = true;
        }

        if (hasText(cc.getCustomerPhone())) {
            so.setCustomerPhone(normalizePhoneOrKeep(cc.getCustomerPhone()));
        } else if (hasText(so.getCustomerPhone())) {
            cc.setCustomerPhone(normalizePhoneOrKeep(so.getCustomerPhone()));
            cycleModified = true;
        }

        LocalDateTime saleDate = cc.getSaleDate() != null ? cc.getSaleDate()
                : (so.getSaleDate() != null ? so.getSaleDate() : cc.getClosedAt());
        if (cc.getSaleDate() == null && saleDate != null) {
            cc.setSaleDate(saleDate);
            cycleModified = true;
        }
        if (saleDate != null) {
            so.setSaleDate(saleDate);
            so.setMonthDate(saleDate.toLocalDate().withDayOfMonth(1));
        }

        // Thông tin cấu hình & phân cấp hãng/series/dòng máy
        MachineHierarchy hierarchy = extractMachineHierarchy(cc.getConfig(), cc.getProductFullName(), cc.getSourceModelText());
        if (hasText(cc.getProductFullName())) {
            so.setProductName(cc.getProductFullName());
        } else if (hasText(so.getProductName())) {
            cc.setProductFullName(so.getProductName());
            cycleModified = true;
        } else if (hasText(hierarchy.fallbackProductName())) {
            so.setProductName(hierarchy.fallbackProductName());
        }

        if (hasText(cc.getProductSummary())) {
            so.setConfigSummary(cc.getProductSummary());
        } else if (hasText(so.getConfigSummary())) {
            cc.setProductSummary(so.getConfigSummary());
            cycleModified = true;
        } else if (hasText(hierarchy.fallbackSummary())) {
            so.setConfigSummary(hierarchy.fallbackSummary());
        }

        if (hasText(hierarchy.brand())) so.setBrand(hierarchy.brand());
        if (hasText(hierarchy.series())) so.setSeries(hierarchy.series());
        if (hasText(hierarchy.segment())) so.setSegment(hierarchy.segment());
        if (hasText(hierarchy.modelName())) so.setModelName(hierarchy.modelName());

        if (!hasText(so.getSeries()) && (hasText(so.getProductName()) || hasText(so.getModelName()))) {
            so.setSeries(SourceNormalizer.extractSeries(so.getProductName(), so.getModelName()));
        }

        so.setMatchedCycleId(cc.getCycleId());
        so.setSerialKeys(cc.getSerialKey());
        so.setOrderCategory("MACHINE");
        if (!hasText(so.getOrigin())) {
            so.setOrigin("WEB_APP");
        }

        // Ghi chú, sạc kèm theo máy & Nhân viên bán
        if (hasText(cc.getSaleNote())) {
            so.setNote(cc.getSaleNote());
        } else if (hasText(so.getNote())) {
            cc.setSaleNote(so.getNote());
            cycleModified = true;
        }
        if (hasText(cc.getChargerName())) {
            so.setChargerName(cc.getChargerName().trim());
        } else if (hasText(so.getChargerName())) {
            cc.setChargerName(so.getChargerName().trim());
            cycleModified = true;
        }
        if (hasText(cc.getChargerSku())) {
            so.setChargerSku(cc.getChargerSku().trim());
        } else if (hasText(so.getChargerSku())) {
            cc.setChargerSku(so.getChargerSku().trim());
            cycleModified = true;
        }

        // Giao hàng / Ship xa
        so.setIsShipping(Boolean.TRUE.equals(cc.getIsShipping()));
        so.setIsDelivered(Boolean.TRUE.equals(cc.getIsDelivered()));
        so.setDeliveryDate(cc.getDeliveryDate());
        so.setShippingCarrier(cc.getShippingCarrier());
        so.setTrackingCode(cc.getTrackingCode());
        so.setShippingAddress(cc.getShippingAddress());
        so.setDepositAmount(cc.getDepositAmount() != null ? cc.getDepositAmount() : BigDecimal.ZERO);
        so.setCodAmount(cc.getCodAmount() != null ? cc.getCodAmount() : BigDecimal.ZERO);

        // Bảo hành: giữ nguyên trạng thái hủy bảo hành nếu là CUSTOMER_RETURN/CANCEL,
        // đơn ship chưa xác nhận nhận hàng thì giữ warrantyExpiry = null, còn đơn hoàn tất thì tự tính nếu chưa có.
        boolean awaitingDelivery = Boolean.TRUE.equals(cc.getIsShipping()) && !Boolean.TRUE.equals(cc.getIsDelivered());
        if (cc.getCloseType() == CloseType.CUSTOMER_RETURN || cc.getCloseType() == CloseType.CANCEL) {
            so.setWarrantyPeriod(cc.getWarrantyPeriod());
            so.setWarrantyExpiry(cc.getWarrantyExpiry());
        } else if (awaitingDelivery) {
            if (!hasText(cc.getWarrantyPeriod()) && hasText(so.getWarrantyPeriod())) {
                cc.setWarrantyPeriod(so.getWarrantyPeriod());
                cycleModified = true;
            }
            if (cc.getWarrantyExpiry() != null) {
                cc.setWarrantyExpiry(null);
                cycleModified = true;
            }
            so.setWarrantyPeriod(cc.getWarrantyPeriod());
            so.setWarrantyExpiry(null);
        } else {
            if (!hasText(cc.getWarrantyPeriod()) && hasText(so.getWarrantyPeriod())) {
                cc.setWarrantyPeriod(so.getWarrantyPeriod());
                cycleModified = true;
            }
            if (cc.getWarrantyExpiry() == null && so.getWarrantyExpiry() != null) {
                cc.setWarrantyExpiry(so.getWarrantyExpiry());
                cycleModified = true;
            }
            if (cc.getWarrantyExpiry() == null && hasText(cc.getWarrantyPeriod())) {
                LocalDate baseWarrantyDate = (Boolean.TRUE.equals(cc.getIsShipping())
                        && Boolean.TRUE.equals(cc.getIsDelivered())
                        && cc.getDeliveryDate() != null)
                        ? cc.getDeliveryDate()
                        : (saleDate != null ? saleDate.toLocalDate() : LocalDate.now());
                LocalDate calculated = SourceNormalizer.calculateWarrantyExpiry(baseWarrantyDate, cc.getWarrantyPeriod());
                if (calculated != null) {
                    cc.setWarrantyExpiry(calculated);
                    cycleModified = true;
                }
            }
            so.setWarrantyPeriod(cc.getWarrantyPeriod());
            so.setWarrantyExpiry(cc.getWarrantyExpiry());
        }

        // Trạng thái đơn & doanh thu — bảo toàn trạng thái Trả hàng / Hủy
        boolean isReturnedOrCancelled = cc.getCloseType() == CloseType.CUSTOMER_RETURN || cc.getCloseType() == CloseType.CANCEL;
        BigDecimal disc = cc.getDiscount() != null ? cc.getDiscount()
                : (so.getDiscount() != null ? so.getDiscount() : BigDecimal.ZERO);
        if (cc.getDiscount() == null) {
            cc.setDiscount(disc);
        }

        BigDecimal rawNet = cc.getSalePriceSnapshot() != null ? cc.getSalePriceSnapshot()
                : (so.getNetRevenue() != null ? so.getNetRevenue() : BigDecimal.ZERO);
        BigDecimal gross = resolveMachineGross(cc, so, rawNet, disc);
        if (cc.getGrossRevenue() == null && gross != null && gross.compareTo(BigDecimal.ZERO) > 0) {
            cc.setGrossRevenue(gross);
            cycleModified = true;
        }

        so.setGrossRevenue(gross != null ? gross : BigDecimal.ZERO);
        so.setDiscount(disc);

        if (cc.getCloseType() == CloseType.CUSTOMER_RETURN) {
            so.setOrderStatus("Trả hàng");
            so.setPaymentStatus(hasText(cc.getPaymentStatus()) ? cc.getPaymentStatus() : "Đã hoàn tiền");
            so.setNetRevenue(BigDecimal.ZERO);
        } else if (cc.getCloseType() == CloseType.CANCEL) {
            so.setOrderStatus("Hủy");
            so.setPaymentStatus(hasText(cc.getPaymentStatus()) ? cc.getPaymentStatus() : "Đã hủy");
            so.setNetRevenue(BigDecimal.ZERO);
        } else {
            so.setNetRevenue(rawNet);
            if (Boolean.TRUE.equals(cc.getIsShipping()) && !Boolean.TRUE.equals(cc.getIsDelivered())) {
                so.setOrderStatus("Chờ giao hàng");
                BigDecimal deposit = cc.getDepositAmount() != null ? cc.getDepositAmount() : BigDecimal.ZERO;
                so.setPaymentStatus(hasText(cc.getPaymentStatus()) ? cc.getPaymentStatus()
                        : (deposit.compareTo(BigDecimal.ZERO) > 0 ? "Đặt cọc" : "Chưa thanh toán"));
            } else {
                so.setOrderStatus("Hoàn tất");
                so.setPaymentStatus(hasText(cc.getPaymentStatus()) ? cc.getPaymentStatus() : "Đã thanh toán");
            }
        }

        // Metadata bổ sung từ POS / ExtraMeta
        if (extraMeta != null) {
            String custType = textVal(extraMeta.get("customerType"));
            String firstSrc = textVal(extraMeta.get("firstSource"));
            String secondSrc = textVal(extraMeta.get("secondSource"));
            String lastSrc = textVal(extraMeta.get("lastSource"));
            if (!hasText(lastSrc)) lastSrc = textVal(extraMeta.get("source"));
            Boolean isStudent = parseBooleanObj(extraMeta.get("isStudent"));
            String salesperson = textVal(extraMeta.get("salesperson"));

            if (hasText(custType)) so.setCustomerType(custType);
            if (hasText(firstSrc)) so.setFirstSource(firstSrc);
            if (hasText(secondSrc)) so.setSecondSource(secondSrc);
            if (hasText(lastSrc)) so.setLastSource(lastSrc);
            if (isStudent != null) so.setIsStudent(isStudent);
            if (hasText(salesperson)) {
                so.setSalesperson(salesperson);
                if (!hasText(cc.getClosedBy())) {
                    cc.setClosedBy(salesperson);
                    cycleModified = true;
                }
            }
        }

        if (hasText(cc.getClosedBy()) && !hasText(so.getSalesperson())) {
            so.setSalesperson(cc.getClosedBy());
        } else if (hasText(so.getSalesperson()) && !hasText(cc.getClosedBy())) {
            cc.setClosedBy(so.getSalesperson());
            cycleModified = true;
        }

        if (!hasText(so.getCustomerType())) so.setCustomerType("Khách mua lần đầu");
        if (so.getIsStudent() == null) so.setIsStudent(false);
        String normSource = SourceNormalizer.normalizeSource(so.getFirstSource(), so.getLastSource());
        so.setNormalizedSource(normSource);
        so.setInboxType(SourceNormalizer.determineInboxType(normSource));
        if (!hasText(so.getCareStatus())) {
            so.setCareStatus(isReturnedOrCancelled ? "VOIDED" : "CHUA_CHAM_SOC");
        } else if (isReturnedOrCancelled && "CHUA_CHAM_SOC".equals(so.getCareStatus())) {
            so.setCareStatus("VOIDED");
        }

        if (cycleModified) {
            closedCycleRepo.save(cc);
        }

        SalesOrder savedOrder = salesOrderRepo.save(so);

        // Đồng bộ đơn phụ kiện bán kèm (PK-KEM-) nếu có
        syncBundledAccessoryForMachine(cc);

        // Đồng bộ hồ sơ khách hàng CRM + gắn crmCustomerId trong transaction
        String addrHint = Boolean.TRUE.equals(cc.getIsShipping()) ? cc.getShippingAddress() : null;
        syncCustomerFromOrder(savedOrder, savedOrder.getCustomerPhone(), savedOrder.getCustomerName(), addrHint, overwriteCustomerName);

        return savedOrder;
    }

    /**
     * Đồng bộ hóa đơn phụ kiện bán kèm máy (PK-KEM-...).
     */
    private void syncBundledAccessoryForMachine(ClosedCycle cc) {
        if (cc == null || !hasText(cc.getCycleId())) return;
        List<String> candidateCodes = resolveBundledAccessoryCodes(cc.getCycleId());
        for (String pkKemCode : candidateCodes) {
            accessoryOrderRepo.findByOrderCode(pkKemCode).ifPresent(accOrder -> {
                if (hasText(cc.getCustomerName())) accOrder.setCustomerName(cc.getCustomerName());
                if (hasText(cc.getCustomerPhone())) accOrder.setCustomerPhone(normalizePhoneOrKeep(cc.getCustomerPhone()));
                if (hasText(cc.getClosedBy()) && !hasText(accOrder.getSalesperson())) {
                    accOrder.setSalesperson(cc.getClosedBy());
                }
                accOrder.setIsShipping(Boolean.TRUE.equals(cc.getIsShipping()));
                accOrder.setIsDelivered(Boolean.TRUE.equals(cc.getIsDelivered()));
                accOrder.setDeliveryDate(cc.getDeliveryDate());

                boolean keepPaidAccessories = cc.getCloseType() == CloseType.CUSTOMER_RETURN
                        && hasText(accOrder.getSaleNote())
                        && accOrder.getSaleNote().contains("[GIU_PHU_KIEN_BAN_THEM]")
                        && accOrder.getFinalAmount() != null
                        && accOrder.getFinalAmount().compareTo(BigDecimal.ZERO) > 0;

                if (keepPaidAccessories) {
                    accOrder.setStatus("COMPLETED");
                } else if (cc.getCloseType() == CloseType.CUSTOMER_RETURN) {
                    accOrder.setStatus("RETURNED");
                } else if (cc.getCloseType() == CloseType.CANCEL) {
                    accOrder.setStatus("CANCELLED");
                } else if (Boolean.TRUE.equals(cc.getIsShipping()) && !Boolean.TRUE.equals(cc.getIsDelivered())) {
                    accOrder.setStatus("PENDING_SHIPPING");
                } else {
                    accOrder.setStatus("COMPLETED");
                }

                // Khi xác nhận đã nhận hàng ship hoặc giữ lại phụ kiện mua thêm lúc trả máy, đồng bộ hạn BH từng item
                if ("COMPLETED".equalsIgnoreCase(accOrder.getStatus()) && accOrder.getItems() != null) {
                    LocalDate baseDate = Boolean.TRUE.equals(accOrder.getIsDelivered()) && accOrder.getDeliveryDate() != null
                            ? accOrder.getDeliveryDate()
                            : (accOrder.getSaleDate() != null ? accOrder.getSaleDate().toLocalDate() : LocalDate.now());
                    for (AccessoryOrderItem item : accOrder.getItems()) {
                        boolean isBundledCharger = item.getNote() != null && item.getNote().contains("[Sạc kèm theo máy");
                        if (isBundledCharger) {
                            if (cc.getCloseType() == CloseType.CUSTOMER_RETURN) {
                                item.setWarrantyPeriod("Đã hủy (Đã hoàn theo máy)");
                                item.setWarrantyExpiry(null);
                            } else {
                                if (hasText(cc.getWarrantyPeriod())) {
                                    item.setWarrantyPeriod(cc.getWarrantyPeriod());
                                }
                                if (cc.getWarrantyExpiry() != null) {
                                    item.setWarrantyExpiry(cc.getWarrantyExpiry());
                                } else if (item.getWarrantyExpiry() == null && hasText(item.getWarrantyPeriod())) {
                                    item.setWarrantyExpiry(SourceNormalizer.calculateWarrantyExpiry(baseDate, item.getWarrantyPeriod()));
                                }
                            }
                        } else if (item.getWarrantyExpiry() == null && item.getWarrantyMonths() != null && item.getWarrantyMonths() > 0) {
                            item.setWarrantyExpiry(baseDate.plusMonths(item.getWarrantyMonths()));
                        }
                    }
                }

                AccessoryOrder savedAcc = accessoryOrderRepo.save(accOrder);
                boolean hasValue = savedAcc.getFinalAmount() != null && savedAcc.getFinalAmount().compareTo(BigDecimal.ZERO) > 0;
                if (hasValue || salesOrderRepo.findByTransactionId(savedAcc.getOrderCode()).isPresent()) {
                    String accPaymentStatus = keepPaidAccessories ? "Đã thanh toán" : cc.getPaymentStatus();
                    syncAccessoryOrderToSalesOrder(savedAcc, accPaymentStatus, false);
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. ĐỒNG BỘ ACCESSORY_ORDER ↔ SALES_ORDER + CRM
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional(rollbackFor = Exception.class)
    public SalesOrder syncAccessoryOrderToSalesOrder(AccessoryOrder order) {
        return syncAccessoryOrderToSalesOrder(order, null, false);
    }

    @Transactional(rollbackFor = Exception.class)
    public SalesOrder syncAccessoryOrderToSalesOrder(AccessoryOrder order, String explicitPaymentStatus, boolean overwriteCustomerName) {
        if (order == null || !hasText(order.getOrderCode())) return null;

        LocalDateTime sDate = order.getSaleDate() != null ? order.getSaleDate() : LocalDateTime.now();
        String txnId = order.getOrderCode().trim();
        String normPhone = normalizePhoneOrKeep(order.getCustomerPhone());
        if (hasText(normPhone) && !Objects.equals(order.getCustomerPhone(), normPhone)) {
            order.setCustomerPhone(normPhone);
        }

        List<AccessoryOrderItem> items = order.getItems() != null ? order.getItems() : Collections.emptyList();
        String itemsSummary = !items.isEmpty()
                ? items.stream()
                        .map(it -> it.getAccessoryName() + " (x" + (it.getQuantity() != null ? it.getQuantity() : 1) + ")")
                        .collect(Collectors.joining(", "))
                : "Phụ kiện";

        String serialKeys = items.stream()
                .map(AccessoryOrderItem::getSerialNumber)
                .filter(this::hasText)
                .map(String::trim)
                .distinct()
                .collect(Collectors.joining(", "));

        SalesOrder so = salesOrderRepo.findByTransactionId(txnId)
                .orElseGet(() -> SalesOrder.builder()
                        .transactionId(txnId)
                        .origin("WEB_APP")
                        .build());

        so.setSaleDate(sDate);
        so.setMonthDate(sDate.toLocalDate().withDayOfMonth(1));
        so.setCustomerName(order.getCustomerName());
        so.setCustomerPhone(normPhone);
        if (!hasText(so.getCustomerType())) so.setCustomerType("Khách mua phụ kiện");
        if (!hasText(so.getFirstSource())) so.setFirstSource("Cửa hàng");
        if (!hasText(so.getLastSource())) so.setLastSource("Cửa hàng");
        String normSource = SourceNormalizer.normalizeSource(so.getFirstSource(), so.getLastSource());
        so.setNormalizedSource(normSource);
        so.setInboxType(SourceNormalizer.determineInboxType(normSource));
        if (so.getIsStudent() == null) so.setIsStudent(false);

        boolean isReturned = "RETURNED".equalsIgnoreCase(order.getStatus());
        boolean isCancelled = "CANCELLED".equalsIgnoreCase(order.getStatus());
        boolean isPendingShip = Boolean.TRUE.equals(order.getIsShipping()) && !Boolean.TRUE.equals(order.getIsDelivered());

        so.setIsShipping(Boolean.TRUE.equals(order.getIsShipping()));
        so.setIsDelivered(isPendingShip ? false : Boolean.TRUE.equals(order.getIsDelivered()));
        so.setDeliveryDate(isPendingShip ? null : order.getDeliveryDate());

        BigDecimal totalGross = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal disc = order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO;
        BigDecimal net = order.getFinalAmount() != null ? order.getFinalAmount() : BigDecimal.ZERO;
        so.setGrossRevenue(totalGross);
        so.setDiscount(disc);

        if (isReturned) {
            so.setOrderStatus("Trả hàng");
            so.setPaymentStatus(hasText(explicitPaymentStatus) ? explicitPaymentStatus : "Đã hoàn tiền");
            so.setNetRevenue(BigDecimal.ZERO);
            so.setWarrantyExpiry(null);
            so.setWarrantyPeriod("Đã hủy (Hoàn hàng)");
        } else if (isCancelled) {
            so.setOrderStatus("Đã hủy");
            so.setPaymentStatus(hasText(explicitPaymentStatus) ? explicitPaymentStatus : "Đã hủy");
            so.setNetRevenue(BigDecimal.ZERO);
            so.setWarrantyExpiry(null);
            so.setWarrantyPeriod("Đã hủy");
        } else if (isPendingShip) {
            so.setOrderStatus("Chờ giao hàng");
            so.setPaymentStatus(hasText(explicitPaymentStatus) ? explicitPaymentStatus
                    : (hasText(so.getPaymentStatus()) ? so.getPaymentStatus() : "Chưa thanh toán"));
            so.setNetRevenue(net);
            WarrantySummary ws = resolveAccessoryWarranty(items, null);
            so.setWarrantyPeriod(ws.period());
            so.setWarrantyExpiry(null);
        } else {
            so.setOrderStatus("Hoàn tất");
            so.setPaymentStatus(hasText(explicitPaymentStatus) ? explicitPaymentStatus
                    : (hasText(so.getPaymentStatus()) ? so.getPaymentStatus() : "Đã thanh toán"));
            so.setNetRevenue(net);
            LocalDate baseDate = Boolean.TRUE.equals(order.getIsDelivered()) && order.getDeliveryDate() != null
                    ? order.getDeliveryDate() : sDate.toLocalDate();
            WarrantySummary ws = resolveAccessoryWarranty(items, baseDate);
            so.setWarrantyPeriod(ws.period());
            so.setWarrantyExpiry(ws.expiry());
        }

        so.setProductName("Phụ kiện: " + itemsSummary);
        so.setBrand("PHỤ KIỆN");
        so.setSeries("Phụ kiện");
        so.setSegment("PHU_KIEN");
        so.setModelName("Phụ kiện");
        so.setConfigSummary(itemsSummary);
        so.setSerialKeys(hasText(serialKeys) ? serialKeys : null);
        so.setNote(order.getSaleNote());
        so.setSalesperson(order.getSalesperson());
        so.setOrigin(hasText(so.getOrigin()) ? so.getOrigin() : "WEB_APP");
        so.setOrderCategory("ACCESSORY");
        if (!hasText(so.getCareStatus())) {
            so.setCareStatus((isReturned || isCancelled) ? "VOIDED" : "CHUA_CHAM_SOC");
        }
        if (txnId.startsWith("PK-KEM-")) {
            String rawCycle = txnId.substring("PK-KEM-".length());
            so.setMatchedCycleId(rawCycle.startsWith("CYC-") ? rawCycle : "CYC-" + rawCycle);
        }

        SalesOrder savedOrder = salesOrderRepo.save(so);
        syncCustomerFromOrder(savedOrder, normPhone, order.getCustomerName(), null, overwriteCustomerName);
        return savedOrder;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. ĐỒNG BỘ REPAIR_ORDER ↔ SALES_ORDER + CRM
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional(rollbackFor = Exception.class)
    public SalesOrder syncRepairOrderToSalesOrder(RepairOrder order) {
        return syncRepairOrderToSalesOrder(order, false);
    }

    @Transactional(rollbackFor = Exception.class)
    public SalesOrder syncRepairOrderToSalesOrder(RepairOrder order, boolean overwriteCustomerName) {
        if (order == null || !hasText(order.getOrderCode())) return null;

        LocalDateTime sDate = order.getCreatedDate() != null ? order.getCreatedDate() : LocalDateTime.now();
        String txnId = order.getOrderCode().trim();
        String normPhone = normalizePhoneOrKeep(order.getCustomerPhone());
        if (hasText(normPhone) && !Objects.equals(order.getCustomerPhone(), normPhone)) {
            order.setCustomerPhone(normPhone);
        }

        List<RepairOrderItem> items = order.getItems() != null ? order.getItems() : Collections.emptyList();
        String servicesSummary = !items.isEmpty()
                ? items.stream().map(RepairOrderItem::getServiceName).collect(Collectors.joining(", "))
                : order.getDeviceModel();

        SalesOrder so = salesOrderRepo.findByTransactionId(txnId)
                .orElseGet(() -> SalesOrder.builder()
                        .transactionId(txnId)
                        .origin("WEB_APP")
                        .build());

        boolean isCancelled = "CANCELLED".equalsIgnoreCase(order.getStatus());
        boolean isCompleted = "COMPLETED".equalsIgnoreCase(order.getStatus());

        so.setSaleDate(sDate);
        so.setMonthDate(sDate.toLocalDate().withDayOfMonth(1));
        so.setCustomerName(order.getCustomerName());
        so.setCustomerPhone(normPhone);
        if (!hasText(so.getCustomerType())) so.setCustomerType("Khách sửa chữa");
        if (!hasText(so.getFirstSource())) so.setFirstSource("Cửa hàng");
        if (!hasText(so.getLastSource())) so.setLastSource("Khách mang máy đến");
        String normSource = SourceNormalizer.normalizeSource(so.getFirstSource(), so.getLastSource());
        so.setNormalizedSource(normSource);
        so.setInboxType(SourceNormalizer.determineInboxType(normSource));
        if (so.getIsStudent() == null) so.setIsStudent(false);

        if (isCancelled) {
            so.setOrderStatus("Đã hủy");
            so.setPaymentStatus("Đã hủy");
            so.setNetRevenue(BigDecimal.ZERO);
            so.setWarrantyPeriod("Đã hủy");
            so.setWarrantyExpiry(null);
        } else if (isCompleted) {
            so.setOrderStatus("Hoàn tất");
            so.setPaymentStatus("Đã thanh toán");
            so.setNetRevenue(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            WarrantySummary ws = resolveRepairWarranty(items, sDate.toLocalDate());
            so.setWarrantyPeriod(ws.period());
            so.setWarrantyExpiry(ws.expiry());
        } else {
            so.setOrderStatus("Đang tiếp nhận/sửa");
            so.setPaymentStatus("Chưa thanh toán");
            so.setNetRevenue(BigDecimal.ZERO);
            WarrantySummary ws = resolveRepairWarranty(items, sDate.toLocalDate());
            so.setWarrantyPeriod(ws.period());
            so.setWarrantyExpiry(ws.expiry());
        }

        so.setProductName("Sửa chữa " + order.getDeviceModel() + ": " + servicesSummary);
        so.setBrand("SỬA CHỮA");
        so.setSeries("Dịch vụ sửa chữa");
        so.setSegment("SUA_CHUA");
        so.setModelName(order.getDeviceModel());
        so.setSerialKeys(order.getDeviceSerial());
        so.setConfigSummary(servicesSummary);
        so.setGrossRevenue(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
        so.setDiscount(BigDecimal.ZERO);
        so.setNote(order.getNote());
        so.setSalesperson(order.getTechnicianName());
        so.setOrigin(hasText(so.getOrigin()) ? so.getOrigin() : "WEB_APP");
        so.setOrderCategory("REPAIR");
        if (!hasText(so.getCareStatus())) {
            so.setCareStatus(isCancelled ? "VOIDED" : "CHUA_CHAM_SOC");
        }

        SalesOrder savedOrder = salesOrderRepo.save(so);
        syncCustomerFromOrder(savedOrder, normPhone, order.getCustomerName(), null, overwriteCustomerName);
        return savedOrder;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. ĐỒNG BỘ HAI CHIỀU HỒ SƠ CRM ↔ ĐƠN HÀNG (KHÔNG TẠO BẢN SAO)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Đồng bộ tên / địa chỉ khách hàng từ đơn hàng sang hồ sơ CrmCustomer và gắn crmCustomerId.
     */
    @Transactional(rollbackFor = Exception.class)
    public Optional<CrmCustomer> syncCustomerFromOrder(
            SalesOrder savedOrder,
            String rawPhone,
            String customerName,
            String addressHint,
            boolean overwriteName) {

        String normPhone = PhoneNormalizer.normalize(rawPhone);
        if (normPhone == null) return Optional.empty();

        CrmCustomer customer = crmCustomerRepo.findByPhoneNormalized(normPhone)
                .orElseGet(() -> CrmCustomer.builder()
                        .phoneNormalized(normPhone)
                        .fullName(cleanCustomerName(customerName))
                        .customerType("Khách mua lần đầu")
                        .build());

        boolean dirty = customer.getId() == null;
        String cleanedName = cleanCustomerName(customerName);
        if (cleanedName != null && (!hasText(customer.getFullName())
                || (overwriteName && !Objects.equals(customer.getFullName(), cleanedName)))) {
            customer.setFullName(cleanedName);
            dirty = true;
        }
        if (hasText(addressHint) && (!hasText(customer.getAddress())
                || (overwriteName && !Objects.equals(customer.getAddress(), addressHint.trim())))) {
            customer.setAddress(addressHint.trim());
            dirty = true;
        }

        if (dirty) {
            customer = crmCustomerRepo.save(customer);
        }

        if (savedOrder != null && savedOrder.getId() != null
                && !Objects.equals(savedOrder.getCrmCustomerId(), customer.getId())) {
            crmOrderRepo.assignCustomerWithoutClear(customer.getId(), savedOrder.getId());
        }
        return Optional.of(customer);
    }

    /**
     * Khi nhân viên sửa hồ sơ khách hàng trong CRM, lan tỏa tên và địa chỉ sang toàn bộ đơn hàng gốc & SalesOrder.
     */
    @Transactional(rollbackFor = Exception.class)
    public void propagateCustomerToOrders(CrmCustomer customer) {
        if (customer == null) return;

        String targetName = hasText(customer.getFullName()) ? customer.getFullName().trim() : null;
        String targetPhone = PhoneNormalizer.normalize(customer.getPhoneNormalized());
        String targetAddress = hasText(customer.getAddress()) ? customer.getAddress().trim() : null;

        List<SalesOrder> linkedOrders = customer.getId() != null
                ? salesOrderRepo.findByCrmCustomerId(customer.getId())
                : Collections.emptyList();

        Set<String> matchedCycleIds = new HashSet<>();
        Set<String> matchedSourceRefs = new HashSet<>();
        Set<String> accCodes = new HashSet<>();
        Set<String> repCodes = new HashSet<>();

        for (SalesOrder so : linkedOrders) {
            boolean soChanged = false;
            if (targetName != null && !Objects.equals(so.getCustomerName(), targetName)) {
                so.setCustomerName(targetName);
                soChanged = true;
            }
            if (targetPhone != null && !Objects.equals(so.getCustomerPhone(), targetPhone)) {
                so.setCustomerPhone(targetPhone);
                soChanged = true;
            }
            if (targetAddress != null && Boolean.TRUE.equals(so.getIsShipping())
                    && !Objects.equals(so.getShippingAddress(), targetAddress)) {
                so.setShippingAddress(targetAddress);
                soChanged = true;
            }
            if (soChanged) {
                salesOrderRepo.save(so);
            }

            if (hasText(so.getMatchedCycleId())) matchedCycleIds.add(so.getMatchedCycleId());
            if (hasText(so.getTransactionId())) {
                if ("ACCESSORY".equalsIgnoreCase(so.getOrderCategory()) || so.getTransactionId().startsWith("PK")) {
                    accCodes.add(so.getTransactionId());
                } else if ("REPAIR".equalsIgnoreCase(so.getOrderCategory()) || so.getTransactionId().startsWith("SC")) {
                    repCodes.add(so.getTransactionId());
                } else {
                    matchedSourceRefs.add(so.getTransactionId());
                }
            }
        }

        // Lan tỏa sang ClosedCycle
        Map<String, ClosedCycle> cyclesToCheck = new LinkedHashMap<>();
        if (!matchedCycleIds.isEmpty()) {
            closedCycleRepo.findByCycleIdIn(matchedCycleIds).forEach(cc -> cyclesToCheck.put(cc.getCycleId(), cc));
        }
        if (!matchedSourceRefs.isEmpty()) {
            closedCycleRepo.findBySourceReferenceIn(matchedSourceRefs).forEach(cc -> cyclesToCheck.put(cc.getCycleId(), cc));
        }
        if (targetPhone != null) {
            closedCycleRepo.findByCustomerPhone(targetPhone).forEach(cc -> cyclesToCheck.put(cc.getCycleId(), cc));
        }
        for (ClosedCycle cc : cyclesToCheck.values()) {
            boolean ccChanged = false;
            if (targetName != null && !Objects.equals(cc.getCustomerName(), targetName)) {
                cc.setCustomerName(targetName);
                ccChanged = true;
            }
            if (targetPhone != null && !Objects.equals(cc.getCustomerPhone(), targetPhone)) {
                cc.setCustomerPhone(targetPhone);
                ccChanged = true;
            }
            if (targetAddress != null && Boolean.TRUE.equals(cc.getIsShipping())
                    && !Objects.equals(cc.getShippingAddress(), targetAddress)) {
                cc.setShippingAddress(targetAddress);
                ccChanged = true;
            }
            if (ccChanged) {
                closedCycleRepo.save(cc);
            }
            resolveBundledAccessoryCodes(cc.getCycleId()).forEach(accCodes::add);
        }

        // Lan tỏa sang AccessoryOrder
        Map<String, AccessoryOrder> accToCheck = new LinkedHashMap<>();
        if (!accCodes.isEmpty()) {
            accessoryOrderRepo.findByOrderCodeInWithItems(accCodes).forEach(ao -> accToCheck.put(ao.getOrderCode(), ao));
        }
        if (targetPhone != null) {
            accessoryOrderRepo.findByCustomerPhone(targetPhone).forEach(ao -> accToCheck.put(ao.getOrderCode(), ao));
        }
        for (AccessoryOrder ao : accToCheck.values()) {
            boolean aoChanged = false;
            if (targetName != null && !Objects.equals(ao.getCustomerName(), targetName)) {
                ao.setCustomerName(targetName);
                aoChanged = true;
            }
            if (targetPhone != null && !Objects.equals(ao.getCustomerPhone(), targetPhone)) {
                ao.setCustomerPhone(targetPhone);
                aoChanged = true;
            }
            if (aoChanged) {
                accessoryOrderRepo.save(ao);
            }
        }

        // Lan tỏa sang RepairOrder
        Map<String, RepairOrder> repToCheck = new LinkedHashMap<>();
        if (!repCodes.isEmpty()) {
            repairOrderRepo.findByOrderCodeInWithItems(repCodes).forEach(ro -> repToCheck.put(ro.getOrderCode(), ro));
        }
        if (targetPhone != null) {
            repairOrderRepo.findByCustomerPhone(targetPhone).forEach(ro -> repToCheck.put(ro.getOrderCode(), ro));
        }
        for (RepairOrder ro : repToCheck.values()) {
            boolean roChanged = false;
            if (targetName != null && !Objects.equals(ro.getCustomerName(), targetName)) {
                ro.setCustomerName(targetName);
                roChanged = true;
            }
            if (targetPhone != null && !Objects.equals(ro.getCustomerPhone(), targetPhone)) {
                ro.setCustomerPhone(targetPhone);
                roChanged = true;
            }
            if (roChanged) {
                repairOrderRepo.save(ro);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. ĐỐI SOÁT & HỢP NHẤT TOÀN BỘ DỮ LIỆU LỊCH SỬ (IDEMPOTENT)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Quét và hàn gắn dữ liệu bị thiếu/lệch trên toàn bộ các bảng giao dịch hiện có trong DB.
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> reconcileAllHistoricalData() {
        int cyclesReconciled = 0;
        int accessoriesReconciled = 0;
        int repairsReconciled = 0;
        int crmProfilesSynced = 0;

        List<ClosedCycle> allCycles = closedCycleRepo.findAllWithHierarchy();
        for (ClosedCycle cc : allCycles) {
            if (cc.getCloseType() == CloseType.SALE
                    || cc.getCloseType() == CloseType.GIFT
                    || cc.getCloseType() == CloseType.CUSTOMER_RETURN
                    || cc.getCloseType() == CloseType.CANCEL) {
                syncClosedCycleToSalesOrder(cc, null, false);
                cyclesReconciled++;
            }
        }

        List<AccessoryOrder> allAccessories = accessoryOrderRepo.findAllByOrderBySaleDateDesc();
        for (AccessoryOrder ao : allAccessories) {
            // Đảm bảo items được tải trước khi đồng bộ
            if (ao.getItems() != null) ao.getItems().size();
            syncAccessoryOrderToSalesOrder(ao, null, false);
            accessoriesReconciled++;
        }

        List<RepairOrder> allRepairs = repairOrderRepo.findAllByOrderByCreatedDateDesc();
        for (RepairOrder ro : allRepairs) {
            if (ro.getItems() != null) ro.getItems().size();
            syncRepairOrderToSalesOrder(ro, false);
            repairsReconciled++;
        }

        // Bù tên & địa chỉ còn thiếu từ SalesOrder -> CrmCustomer và ngược lại
        List<CrmCustomer> customers = crmCustomerRepo.findAll();
        for (CrmCustomer c : customers) {
            boolean dirty = false;
            if (!hasText(c.getAddress()) && c.getId() != null) {
                Optional<String> shipAddr = salesOrderRepo.findByCrmCustomerId(c.getId()).stream()
                        .map(SalesOrder::getShippingAddress)
                        .filter(this::hasText)
                        .map(String::trim)
                        .findFirst();
                if (shipAddr.isPresent()) {
                    c.setAddress(shipAddr.get());
                    dirty = true;
                }
            }
            if (dirty) {
                crmCustomerRepo.save(c);
            }
            if (hasText(c.getFullName())) {
                // Chỉ điền vào các đơn bị trống tên, không ghi đè tên riêng của từng hóa đơn khi chạy batch
                List<SalesOrder> ordersOfCustomer = salesOrderRepo.findByCrmCustomerId(c.getId());
                for (SalesOrder so : ordersOfCustomer) {
                    if (!hasText(so.getCustomerName())) {
                        so.setCustomerName(c.getFullName().trim());
                        salesOrderRepo.save(so);
                    }
                }
                crmProfilesSynced++;
            }
        }

        int notificationsCleaned = notificationRepo.clearLegacySyncLinks();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("cyclesReconciled", cyclesReconciled);
        result.put("accessoriesReconciled", accessoriesReconciled);
        result.put("repairsReconciled", repairsReconciled);
        result.put("crmProfilesSynced", crmProfilesSynced);
        result.put("notificationsCleaned", notificationsCleaned);
        log.info("[ORDER-SYNC] Hoàn tất rà soát đồng bộ dữ liệu nội bộ: {}", result);
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS DÙNG CHUNG
    // ═══════════════════════════════════════════════════════════════════════

    public static List<String> resolveBundledAccessoryCodes(String cycleId) {
        if (cycleId == null || cycleId.isBlank()) return Collections.emptyList();
        String trimmed = cycleId.trim();
        String codeWithoutPrefix = "PK-KEM-" + trimmed.replace("CYC-", "");
        String codeWithPrefix = "PK-KEM-" + trimmed;
        if (codeWithoutPrefix.equals(codeWithPrefix)) {
            return List.of(codeWithoutPrefix);
        }
        return List.of(codeWithoutPrefix, codeWithPrefix);
    }

    private WarrantySummary resolveAccessoryWarranty(List<AccessoryOrderItem> items, LocalDate baseDate) {
        return resolveWarrantyFromItems(items, baseDate,
                AccessoryOrderItem::getWarrantyPeriod,
                AccessoryOrderItem::getWarrantyMonths,
                AccessoryOrderItem::getWarrantyExpiry,
                AccessoryOrderItem::setWarrantyExpiry);
    }

    private WarrantySummary resolveRepairWarranty(List<RepairOrderItem> items, LocalDate baseDate) {
        return resolveWarrantyFromItems(items, baseDate,
                RepairOrderItem::getWarrantyPeriod,
                RepairOrderItem::getWarrantyMonths,
                RepairOrderItem::getWarrantyExpiry,
                RepairOrderItem::setWarrantyExpiry);
    }

    private <T> WarrantySummary resolveWarrantyFromItems(
            List<T> items,
            LocalDate baseDate,
            java.util.function.Function<T, String> periodGetter,
            java.util.function.Function<T, Integer> monthsGetter,
            java.util.function.Function<T, LocalDate> expiryGetter,
            java.util.function.BiConsumer<T, LocalDate> expirySetter) {
        if (items == null || items.isEmpty()) {
            return new WarrantySummary("Không BH", null);
        }
        LocalDate maxExpiry = null;
        String bestPeriod = null;
        String voidPeriod = null;
        for (T item : items) {
            String wp = periodGetter.apply(item);
            Integer months = monthsGetter.apply(item);
            boolean rejectedOrNone = isNoWarrantyPeriod(wp);
            if (rejectedOrNone && voidPeriod == null && hasText(wp)) {
                voidPeriod = wp.trim();
            }
            LocalDate exp = expiryGetter.apply(item);
            if (exp == null && !rejectedOrNone && months != null && months > 0 && baseDate != null) {
                exp = baseDate.plusMonths(months);
                expirySetter.accept(item, exp);
            }
            if (exp != null && (maxExpiry == null || exp.isAfter(maxExpiry))) {
                maxExpiry = exp;
                bestPeriod = formatWarrantyLabel(wp, months);
            } else if (!hasText(bestPeriod) && !rejectedOrNone) {
                bestPeriod = formatWarrantyLabel(wp, months);
            }
        }
        return new WarrantySummary(hasText(bestPeriod) ? bestPeriod : (hasText(voidPeriod) ? voidPeriod : "Không BH"), maxExpiry);
    }

    private boolean isNoWarrantyPeriod(String wp) {
        if (!hasText(wp)) return false;
        String low = wp.trim().toLowerCase(Locale.ROOT);
        return low.contains("từ chối") || low.contains("hủy") || low.contains("không");
    }

    private String formatWarrantyLabel(String wp, Integer warrantyMonths) {
        if (hasText(wp)) return wp.trim();
        if (warrantyMonths != null && warrantyMonths > 0) return warrantyMonths + " Tháng";
        return null;
    }

    private BigDecimal resolveMachineGross(ClosedCycle cc, SalesOrder so, BigDecimal net, BigDecimal disc) {
        if (cc.getGrossRevenue() != null && cc.getGrossRevenue().compareTo(BigDecimal.ZERO) > 0) {
            return cc.getGrossRevenue();
        }
        if (cc.getConfig() != null && cc.getConfig().getDefaultSalePrice() != null
                && cc.getConfig().getDefaultSalePrice().compareTo(BigDecimal.ZERO) > 0) {
            return cc.getConfig().getDefaultSalePrice();
        }
        if (so != null && so.getGrossRevenue() != null && so.getGrossRevenue().compareTo(BigDecimal.ZERO) > 0) {
            return so.getGrossRevenue();
        }
        return net.add(disc != null ? disc : BigDecimal.ZERO);
    }

    private MachineHierarchy extractMachineHierarchy(SalesConfig cfg, String productFullName, String sourceModelText) {
        String brand = null;
        String segment = null;
        String modelName = sourceModelText;
        String fallbackProductName = hasText(productFullName) ? productFullName : sourceModelText;
        String fallbackSummary = null;

        if (cfg != null) {
            if (!hasText(fallbackProductName) && hasText(cfg.getDisplayName())) {
                fallbackProductName = cfg.getDisplayName();
            }
            StringBuilder summary = new StringBuilder();
            if (hasText(cfg.getRamCode())) summary.append(cfg.getRamCode());
            if (hasText(cfg.getSsdCode())) {
                if (!summary.isEmpty()) summary.append(" / ");
                summary.append(cfg.getSsdCode());
            }
            fallbackSummary = summary.isEmpty() ? cfg.getDisplayName() : summary.toString();

            var v = cfg.getVariant();
            if (v != null && v.getPlatform() != null && v.getPlatform().getModelLine() != null) {
                var ml = v.getPlatform().getModelLine();
                if (ml.getBrand() != null) brand = ml.getBrand().getBrandName();
                if (ml.getSegmentCode() != null) segment = ml.getSegmentCode().name();
                if (ml.getModelLineName() != null) modelName = ml.getModelLineName();
            }
        }

        String series = SourceNormalizer.extractSeries(fallbackProductName, modelName);
        return new MachineHierarchy(brand, series, segment, modelName, fallbackProductName, fallbackSummary);
    }

    private boolean isMachineOrder(SalesOrder so) {
        return so != null && (so.getOrderCategory() == null || so.getOrderCategory().isBlank()
                || "MACHINE".equalsIgnoreCase(so.getOrderCategory()));
    }

    private boolean isBundledAccessoryCode(String txnId) {
        return txnId != null && txnId.startsWith("PK-KEM-");
    }

    private boolean hasExactSerialToken(String serialKeys, String targetSerial) {
        if (!hasText(serialKeys) || !hasText(targetSerial)) return false;
        String target = targetSerial.trim().toUpperCase(Locale.ROOT);
        for (String token : serialKeys.split("[,;|\\s]+")) {
            if (token.trim().toUpperCase(Locale.ROOT).equals(target)) {
                return true;
            }
        }
        return false;
    }

    private long dateDistanceMinutes(LocalDateTime a, LocalDateTime b) {
        if (a == null || b == null) return Long.MAX_VALUE / 4;
        return java.time.Duration.between(a, b).toMinutes();
    }

    private String normalizePhoneOrKeep(String rawPhone) {
        if (!hasText(rawPhone)) return rawPhone;
        String normalized = PhoneNormalizer.normalize(rawPhone);
        return normalized != null ? normalized : rawPhone.trim();
    }

    private String cleanCustomerName(String name) {
        if (!hasText(name)) return null;
        String trimmed = name.trim();
        if ("khách lẻ".equalsIgnoreCase(trimmed) || "khach le".equalsIgnoreCase(trimmed)) {
            return null;
        }
        return trimmed;
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private String textVal(Object o) {
        return o == null ? null : o.toString().trim();
    }

    private Boolean parseBooleanObj(Object stuObj) {
        if (stuObj == null) return null;
        if (stuObj instanceof Boolean b) return b;
        String s = stuObj.toString().trim().toLowerCase(Locale.ROOT);
        return "true".equals(s) || "1".equals(s) || "có".equals(s) || "co".equals(s) || s.contains("sinh viên");
    }

    private record WarrantySummary(String period, LocalDate expiry) {}

    private record MachineHierarchy(
            String brand,
            String series,
            String segment,
            String modelName,
            String fallbackProductName,
            String fallbackSummary) {}
}
