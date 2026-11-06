package com.qkshop.tonkho.part;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartService {

    private final PartRepository partRepository;
    private final PartHistoryRepository partHistoryRepository;

    public List<Part> getAllParts(String keyword, String category, String stockFilter) {
        List<Part> list;
        if (keyword != null && !keyword.trim().isEmpty()) {
            list = partRepository.searchParts(keyword.trim());
        } else if (category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category)) {
            list = partRepository.findByCategoryOrderByCreatedAtDesc(category.trim());
        } else {
            list = partRepository.findAllByOrderByCreatedAtDesc();
        }

        if (stockFilter != null && !stockFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(stockFilter)) {
            switch (stockFilter.toUpperCase()) {
                case "IN_STOCK":
                    return list.stream().filter(p -> p.getQuantity() > 5).toList();
                case "LOW_STOCK":
                    return list.stream().filter(p -> p.getQuantity() > 0 && p.getQuantity() <= 5).toList();
                case "OUT_OF_STOCK":
                    return list.stream().filter(p -> p.getQuantity() <= 0).toList();
                default:
                    break;
            }
        }
        return list;
    }

    public List<Part> getAvailableParts(String keyword, String category) {
        List<Part> list;
        if (keyword != null && !keyword.trim().isEmpty()) {
            list = partRepository.searchAvailableParts(keyword.trim());
        } else {
            list = partRepository.findByQuantityGreaterThan(0);
        }

        if (category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category)) {
            String catClean = category.trim().toUpperCase();
            return list.stream().filter(p -> catClean.equalsIgnoreCase(p.getCategory())).toList();
        }
        return list;
    }

    public Part getPartById(Long id) {
        return partRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy linh kiện với ID: " + id));
    }

    public Optional<Part> getPartBySku(String sku) {
        if (sku == null || sku.trim().isEmpty()) return Optional.empty();
        return partRepository.findBySku(sku.trim());
    }

    @Transactional(rollbackFor = Exception.class)
    public Part importPart(Map<String, Object> payload, String username) {
        String name = (String) payload.get("name");
        String category = (String) payload.get("category");
        int quantity = parseInteger(payload.get("quantity"), 1);
        BigDecimal retailPrice = parseBigDecimal(payload.get("retailPrice"), BigDecimal.ZERO);
        BigDecimal upgradePrice = parseBigDecimal(payload.get("upgradePrice"), BigDecimal.ZERO);
        BigDecimal importPrice = parseBigDecimal(payload.get("importPrice"), BigDecimal.ZERO);
        String warrantyPeriod = (String) payload.get("warrantyPeriod");
        int warrantyMonths = parseInteger(payload.get("warrantyMonths"), 1);
        String note = (String) payload.get("note");
        String sku = (String) payload.get("sku");

        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập tên linh kiện");
        }
        if (category == null || category.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn loại linh kiện (RAM, SSD, Pin, Màn hình...)");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("Số lượng nhập phải lớn hơn 0");
        }

        if (warrantyPeriod == null || warrantyPeriod.trim().isEmpty()) {
            warrantyPeriod = warrantyMonths > 0 ? (warrantyMonths + " Tháng") : "Không bảo hành";
        }

        Part part;
        boolean isNew = false;

        if (sku != null && !sku.trim().isEmpty()) {
            String cleanSku = sku.trim();
            Optional<Part> existingOpt = partRepository.findBySku(cleanSku);
            if (existingOpt.isPresent()) {
                part = existingOpt.get();
                part.setQuantity(part.getQuantity() + quantity);
                if (retailPrice.compareTo(BigDecimal.ZERO) > 0) {
                    part.setRetailPrice(retailPrice);
                }
                if (upgradePrice.compareTo(BigDecimal.ZERO) > 0) {
                    part.setUpgradePrice(upgradePrice);
                }
                if (importPrice.compareTo(BigDecimal.ZERO) > 0) {
                    part.setImportPrice(importPrice);
                }
                if (warrantyPeriod != null && !warrantyPeriod.isBlank()) {
                    part.setWarrantyPeriod(warrantyPeriod);
                    part.setWarrantyMonths(warrantyMonths);
                }
                if (note != null && !note.isBlank()) {
                    part.setNote(note);
                }
            } else {
                isNew = true;
                part = Part.builder()
                        .sku(cleanSku)
                        .name(name.trim())
                        .category(category.trim().toUpperCase())
                        .quantity(quantity)
                        .retailPrice(retailPrice)
                        .upgradePrice(upgradePrice)
                        .importPrice(importPrice)
                        .warrantyPeriod(warrantyPeriod.trim())
                        .warrantyMonths(warrantyMonths)
                        .note(note)
                        .build();
            }
        } else {
            isNew = true;
            String generatedSku = generateNextSku(category);
            part = Part.builder()
                    .sku(generatedSku)
                    .name(name.trim())
                    .category(category.trim().toUpperCase())
                    .quantity(quantity)
                    .retailPrice(retailPrice)
                    .upgradePrice(upgradePrice)
                    .importPrice(importPrice)
                    .warrantyPeriod(warrantyPeriod.trim())
                    .warrantyMonths(warrantyMonths)
                    .note(note)
                    .build();
        }

        Part saved = partRepository.save(part);

        PartHistory history = PartHistory.builder()
                .sku(saved.getSku())
                .name(saved.getName())
                .quantity(quantity)
                .price(retailPrice)
                .action("IMPORT")
                .note(isNew ? ("Nhập mới linh kiện: " + saved.getName()) : ("Nhập thêm số lượng (+ " + quantity + ")"))
                .createdBy(username != null ? username : "SYSTEM")
                .build();
        partHistoryRepository.save(history);

        log.info("Đã nhập kho linh kiện SKU: {}, Tên: {}, SL: {}", saved.getSku(), saved.getName(), quantity);
        return saved;
    }

    @Transactional(rollbackFor = Exception.class)
    public Part updatePart(Long id, Map<String, Object> payload, String username) {
        Part part = getPartById(id);

        if (payload.containsKey("name")) {
            String name = (String) payload.get("name");
            if (name != null && !name.trim().isEmpty()) {
                part.setName(name.trim());
            }
        }
        if (payload.containsKey("category")) {
            String cat = (String) payload.get("category");
            if (cat != null && !cat.trim().isEmpty()) {
                part.setCategory(cat.trim().toUpperCase());
            }
        }
        if (payload.containsKey("retailPrice")) {
            part.setRetailPrice(parseBigDecimal(payload.get("retailPrice"), part.getRetailPrice()));
        }
        if (payload.containsKey("upgradePrice")) {
            part.setUpgradePrice(parseBigDecimal(payload.get("upgradePrice"), part.getUpgradePrice()));
        }
        if (payload.containsKey("importPrice")) {
            part.setImportPrice(parseBigDecimal(payload.get("importPrice"), part.getImportPrice()));
        }
        if (payload.containsKey("warrantyPeriod")) {
            part.setWarrantyPeriod((String) payload.get("warrantyPeriod"));
        }
        if (payload.containsKey("warrantyMonths")) {
            part.setWarrantyMonths(parseInteger(payload.get("warrantyMonths"), part.getWarrantyMonths()));
        }
        if (payload.containsKey("note")) {
            part.setNote((String) payload.get("note"));
        }

        if (payload.containsKey("quantity")) {
            int newQty = parseInteger(payload.get("quantity"), part.getQuantity());
            if (newQty != part.getQuantity()) {
                int diff = newQty - part.getQuantity();
                part.setQuantity(newQty);

                PartHistory history = PartHistory.builder()
                        .sku(part.getSku())
                        .name(part.getName())
                        .quantity(diff)
                        .price(part.getRetailPrice())
                        .action("MANUAL_ADJUST")
                        .note("Điều chỉnh tồn kho từ " + (newQty - diff) + " sang " + newQty)
                        .createdBy(username != null ? username : "SYSTEM")
                        .build();
                partHistoryRepository.save(history);
            }
        }

        return partRepository.save(part);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deletePart(Long id, String username) {
        Part part = getPartById(id);
        PartHistory history = PartHistory.builder()
                .sku(part.getSku())
                .name(part.getName())
                .quantity(-part.getQuantity())
                .price(part.getRetailPrice())
                .action("DELETE")
                .note("Xóa linh kiện khỏi danh mục hệ thống (Tồn kho lúc xóa: " + part.getQuantity() + ")")
                .createdBy(username != null ? username : "SYSTEM")
                .build();
        partHistoryRepository.save(history);

        partRepository.delete(part);
        log.info("Người dùng {} đã xóa linh kiện SKU: {}", username, part.getSku());
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean swapInPart(String sku, int quantity, String cycleId, String customerName, String customerPhone, String salesperson, String reason) {
        if (sku == null || sku.trim().isEmpty() || quantity <= 0) return false;
        Optional<Part> partOpt = partRepository.findBySku(sku.trim());
        if (partOpt.isEmpty()) {
            log.warn("Không tìm thấy linh kiện SKU {} để nhập hồi swap máy {}", sku, cycleId);
            return false;
        }

        Part part = partOpt.get();
        part.setQuantity(part.getQuantity() + quantity);
        partRepository.save(part);

        PartHistory history = PartHistory.builder()
                .sku(part.getSku())
                .name(part.getName())
                .quantity(quantity)
                .price(part.getImportPrice() != null ? part.getImportPrice() : BigDecimal.ZERO)
                .action("SWAP_IN")
                .orderCode(cycleId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .note(reason != null ? reason : ("Thu hồi linh kiện tháo máy nâng cấp chu kỳ " + cycleId))
                .createdBy(salesperson != null ? salesperson : "BÁN HÀNG")
                .build();
        partHistoryRepository.save(history);
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean deductForRepair(String sku, int quantity, BigDecimal unitPrice, String orderCode,
                                    String customerName, String customerPhone, String deviceModel, String technicianName) {
        if (sku == null || sku.trim().isEmpty() || quantity <= 0) return false;
        Optional<Part> partOpt = partRepository.findBySku(sku.trim());
        if (partOpt.isEmpty()) {
            log.warn("Không tìm thấy linh kiện SKU {} để trừ tồn khi làm sửa chữa {}", sku, orderCode);
            return false;
        }

        Part part = partOpt.get();
        if (part.getQuantity() < quantity) {
            throw new IllegalStateException("Linh kiện " + part.getName() + " (SKU: " + part.getSku()
                    + ") không đủ số lượng trong kho (Còn: " + part.getQuantity() + ", Yêu cầu: " + quantity + ")");
        }

        part.setQuantity(part.getQuantity() - quantity);
        partRepository.save(part);

        PartHistory history = PartHistory.builder()
                .sku(part.getSku())
                .name(part.getName())
                .quantity(-quantity)
                .price(unitPrice != null ? unitPrice : part.getRetailPrice())
                .action("REPAIR_USE")
                .orderCode(orderCode)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .note("Sử dụng cho đơn sửa chữa " + orderCode + " (Máy: " + deviceModel + ")")
                .createdBy(technicianName != null ? technicianName : "KTV")
                .build();
        partHistoryRepository.save(history);
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean deductForUpgrade(String sku, int quantity, BigDecimal unitPrice, String cycleId,
                                     String customerName, String customerPhone, String salesperson) {
        return deductForUpgrade(sku, quantity, unitPrice, cycleId, customerName, customerPhone, salesperson, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean deductForUpgrade(String sku, int quantity, BigDecimal unitPrice, String cycleId,
                                     String customerName, String customerPhone, String salesperson, String machineWarranty) {
        if (sku == null || sku.trim().isEmpty() || quantity <= 0) return false;
        Optional<Part> partOpt = partRepository.findBySku(sku.trim());
        if (partOpt.isEmpty()) {
            log.warn("Không tìm thấy linh kiện SKU {} để trừ tồn nâng cấp máy {}", sku, cycleId);
            return false;
        }

        Part part = partOpt.get();
        if (part.getQuantity() < quantity) {
            throw new IllegalStateException("Linh kiện nâng cấp " + part.getName() + " (SKU: " + part.getSku()
                    + ") không đủ số lượng trong kho (Còn: " + part.getQuantity() + ", Yêu cầu: " + quantity + ")");
        }

        part.setQuantity(part.getQuantity() - quantity);
        partRepository.save(part);

        String warrantyNote = (machineWarranty != null && !machineWarranty.isBlank())
                ? " (Bảo hành theo máy: " + machineWarranty + ")"
                : "";

        PartHistory history = PartHistory.builder()
                .sku(part.getSku())
                .name(part.getName())
                .quantity(-quantity)
                .price(unitPrice != null ? unitPrice : (part.getUpgradePrice() != null && part.getUpgradePrice().compareTo(BigDecimal.ZERO) > 0 ? part.getUpgradePrice() : part.getRetailPrice()))
                .action("UPGRADE_USE")
                .orderCode(cycleId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .note("Sử dụng nâng cấp máy chu kỳ " + cycleId + warrantyNote)
                .createdBy(salesperson != null ? salesperson : "BÁN HÀNG")
                .build();
        partHistoryRepository.save(history);
        return true;
    }

    public List<PartHistory> getHistories(String sku) {
        if (sku != null && !sku.trim().isEmpty()) {
            return partHistoryRepository.findBySkuOrderByCreatedAtDesc(sku.trim());
        }
        return partHistoryRepository.findAllByOrderByCreatedAtDesc();
    }

    public String generateNextSku(String category) {
        String catCode = normalizeCategoryCode(category);
        String prefix = "LK-" + catCode + "-";
        int maxSeq = partRepository.findAll().stream()
                .map(Part::getSku)
                .filter(s -> s != null && s.toUpperCase().startsWith(prefix))
                .mapToInt(s -> {
                    try {
                        String numPart = s.substring(prefix.length()).replaceAll("[^0-9]", "");
                        return numPart.isEmpty() ? 0 : Integer.parseInt(numPart);
                    } catch (Exception e) {
                        return 0;
                    }
                })
                .max()
                .orElse(0);
        return String.format("LK-%s-%04d", catCode, maxSeq + 1);
    }

    private String normalizeCategoryCode(String category) {
        if (category == null || category.trim().isEmpty()) return "KHAC";
        String cat = category.trim().toUpperCase();
        if (cat.contains("RAM")) return "RAM";
        if (cat.contains("SSD")) return "SSD";
        if (cat.contains("HDD")) return "HDD";
        if (cat.contains("PIN") || cat.contains("BATTERY")) return "PIN";
        if (cat.contains("MAN") || cat.contains("SCREEN") || cat.contains("DISP")) return "MAN";
        if (cat.contains("PHIM") || cat.contains("KEYBOARD")) return "PHIM";
        if (cat.contains("SAC") || cat.contains("ADAPTER") || cat.contains("CHARGER")) return "SAC";
        if (cat.contains("MAIN")) return "MAIN";
        if (cat.contains("FAN") || cat.contains("TAN")) return "FAN";
        if (cat.contains("BANLE") || cat.contains("HINGE")) return "BANLE";
        if (cat.contains("LOA") || cat.contains("SPEAKER")) return "LOA";

        String clean = Normalizer.normalize(cat, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^A-Z0-9]", "");
        return clean.length() > 6 ? clean.substring(0, 6) : (clean.isEmpty() ? "KHAC" : clean);
    }

    private Integer parseInteger(Object val, int defaultValue) {
        if (val == null) return defaultValue;
        try {
            return Integer.parseInt(val.toString().trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private BigDecimal parseBigDecimal(Object val, BigDecimal defaultValue) {
        if (val == null) return defaultValue;
        try {
            String clean = val.toString().replaceAll("[^0-9.]", "").trim();
            return clean.isEmpty() ? defaultValue : new BigDecimal(clean);
        } catch (Exception e) {
            return defaultValue;
        }
    }
}
