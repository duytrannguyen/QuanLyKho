package com.qkshop.tonkho.salesreport;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service nạp dữ liệu lịch sử từ qk_migration_sales (chứa JSON 31 trường của DATABASE_BÁN HÀNG)
 * vào bảng sales_orders để Dashboard có đủ 100% dữ liệu thật ngay lập tức.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SalesOrderBackfillService implements CommandLineRunner {

    private final SalesOrderRepository salesOrderRepo;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) {
        long count = salesOrderRepo.count();
        if (count == 0) {
            log.info("[BACKFILL] Bảng sales_orders đang trống. Bắt đầu nạp dữ liệu lịch sử từ qk_migration_sales...");
            int imported = backfillAllSales();
            log.info("[BACKFILL] Hoàn tất nạp {} đơn hàng vào sales_orders.", imported);
        } else {
            log.info("[BACKFILL] Bảng sales_orders đã có {} đơn hàng. Bỏ qua tự động nạp.", count);
        }
    }

    /**
     * Nạp hoặc nạp lại toàn bộ dữ liệu đơn hàng.
     */
    @Transactional(rollbackFor = Exception.class)
    public int backfillAllSales() {
        String sql = """
            SELECT
                transaction_id,
                serial_key,
                matched_cycle_id,
                sold_at,
                customer_name,
                customer_phone,
                status,
                payment_status,
                list_price,
                discount,
                final_price,
                source_kind,
                datasale_json,
                web_sale_json
            FROM qk_migration_sales
        """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        int successCount = 0;

        for (Map<String, Object> row : rows) {
            try {
                String txnId = (String) row.get("transaction_id");
                if (txnId == null || txnId.isBlank()) continue;

                String datasaleJsonStr = (String) row.get("datasale_json");
                String webSaleJsonStr = (String) row.get("web_sale_json");

                SalesOrder order = salesOrderRepo.findByTransactionId(txnId).orElseGet(() -> SalesOrder.builder()
                        .transactionId(txnId)
                        .build());

                order.setMatchedCycleId((String) row.get("matched_cycle_id"));
                order.setSerialKeys((String) row.get("serial_key"));
                order.setOrigin((String) row.get("source_kind"));

                if (datasaleJsonStr != null && !datasaleJsonStr.isBlank()) {
                    JsonNode d = objectMapper.readTree(datasaleJsonStr);
                    parseDataSaleJson(order, d, row);
                } else if (webSaleJsonStr != null && !webSaleJsonStr.isBlank()) {
                    JsonNode w = objectMapper.readTree(webSaleJsonStr);
                    parseWebSaleJson(order, w, row);
                } else {
                    parseFallbackRow(order, row);
                }

                // Tự động nhận diện Series nếu chưa có
                if (order.getSeries() == null || order.getSeries().isBlank()) {
                    order.setSeries(SourceNormalizer.extractSeries(order.getProductName(), order.getModelName()));
                }

                // Tự động chuẩn hoá nguồn chốt và loại đơn
                order.setNormalizedSource(SourceNormalizer.normalizeSource(order.getFirstSource(), order.getLastSource()));
                order.setInboxType(SourceNormalizer.determineInboxType(order.getNormalizedSource()));

                // Tự động tính hạn bảo hành nếu chưa có
                if (order.getWarrantyExpiry() == null && order.getSaleDate() != null && order.getWarrantyPeriod() != null) {
                    order.setWarrantyExpiry(SourceNormalizer.calculateWarrantyExpiry(order.getSaleDate().toLocalDate(), order.getWarrantyPeriod()));
                }

                salesOrderRepo.save(order);
                successCount++;
            } catch (Exception e) {
                log.warn("[BACKFILL] Lỗi nạp đơn {}: {}", row.get("transaction_id"), e.getMessage());
            }
        }

        return successCount;
    }

    private void parseDataSaleJson(SalesOrder order, JsonNode d, Map<String, Object> row) {
        order.setCustomerId(textOrNull(d, "customer_ID"));
        order.setLeadId(textOrNull(d, "lead_ID"));
        order.setCustomerName(textOrFallback(d, "tên khách", (String) row.get("customer_name")));
        order.setCustomerPhone(textOrFallback(d, "SĐT", (String) row.get("customer_phone")));
        order.setCustomerType(textOrNull(d, "phân loại khách"));
        order.setFirstSource(textOrNull(d, "nguồn đầu tiên biết đến"));
        order.setSecondSource(textOrNull(d, "nguồn thứ 2 tham khảo"));
        order.setLastSource(textOrNull(d, "nguồn chốt cuối cùng"));

        if (d.has("sinh viên?")) {
            order.setIsStudent(d.get("sinh viên?").asBoolean(false));
        }

        order.setOrderStatus(textOrFallback(d, "trạng thái đơn", (String) row.get("status")));
        order.setPaymentStatus(textOrFallback(d, "trạng thái thanh toán", (String) row.get("payment_status")));
        order.setProductName(textOrNull(d, "sản phẩm chính"));
        order.setBrand(textOrNull(d, "hãng"));
        order.setSeries(textOrNull(d, "series"));
        order.setSegment(textOrNull(d, "phân khúc"));
        order.setModelName(textOrNull(d, "dòng máy"));
        order.setConfigSummary(textOrNull(d, "cấu hình tóm tắt"));
        order.setWarrantyPeriod(textOrNull(d, "mức bảo hành"));
        order.setNote(textOrNull(d, "ghi chú"));
        order.setCrmSyncStatus(textOrNull(d, "trạng thái khớp CRM"));
        order.setMessageSyncStatus(textOrNull(d, "trạng thái khớp tin nhắn"));
        order.setDataQualityStatus(textOrNull(d, "trạng thái chất lượng dữ liệu"));

        if (order.getSerialKeys() == null || order.getSerialKeys().isBlank()) {
            order.setSerialKeys(textOrNull(d, "Serial"));
        }

        // Parse ngày bán
        LocalDateTime saleDate = parseJsonDate(d.get("ngày bán"));
        if (saleDate == null && row.get("sold_at") != null) {
            saleDate = ((java.sql.Timestamp) row.get("sold_at")).toLocalDateTime();
        }
        order.setSaleDate(saleDate);
        if (saleDate != null) {
            order.setMonthDate(LocalDate.of(saleDate.getYear(), saleDate.getMonthValue(), 1));
        }

        // Parse bảo hành đến ngày
        LocalDateTime expiryDate = parseJsonDate(d.get("bảo hành đến ngày"));
        if (expiryDate != null) {
            order.setWarrantyExpiry(expiryDate.toLocalDate());
        }

        // Parse ngày nạp
        LocalDateTime importedAt = parseJsonDate(d.get("ngày nạp"));
        order.setImportedAt(importedAt);

        // Doanh thu, giảm giá, doanh thu thuần
        BigDecimal gross = parseDecimal(d.get("doanh thu"));
        BigDecimal disc = parseDecimal(d.get("giảm giá"));
        BigDecimal net = parseDecimal(d.get("doanh thu thuần"));

        if (gross == null && row.get("list_price") != null) gross = new BigDecimal(row.get("list_price").toString());
        if (disc == null && row.get("discount") != null) disc = new BigDecimal(row.get("discount").toString());
        if (net == null && row.get("final_price") != null) net = new BigDecimal(row.get("final_price").toString());

        if (net == null && gross != null) {
            net = disc != null ? gross.subtract(disc) : gross;
        }

        order.setGrossRevenue(gross != null ? gross : BigDecimal.ZERO);
        order.setDiscount(disc != null ? disc : BigDecimal.ZERO);
        order.setNetRevenue(net != null ? net : BigDecimal.ZERO);
    }

    private void parseWebSaleJson(SalesOrder order, JsonNode w, Map<String, Object> row) {
        order.setCustomerName((String) row.get("customer_name"));
        order.setCustomerPhone((String) row.get("customer_phone"));
        order.setOrderStatus("Hoàn tất");
        order.setPaymentStatus("Đã thanh toán");
        order.setProductName(textOrNull(w, "product_name"));
        order.setSalesperson(textOrNull(w, "salesperson"));
        order.setNote(textOrNull(w, "note"));

        Object soldAtObj = row.get("sold_at");
        LocalDateTime dt = extractDateTime(soldAtObj);
        if (dt != null) {
            order.setSaleDate(dt);
            order.setMonthDate(LocalDate.of(dt.getYear(), dt.getMonthValue(), 1));
        }

        BigDecimal net = row.get("final_price") != null ? new BigDecimal(row.get("final_price").toString()) : BigDecimal.ZERO;
        order.setNetRevenue(net);
        order.setGrossRevenue(row.get("list_price") != null ? new BigDecimal(row.get("list_price").toString()) : net);
        order.setDiscount(row.get("discount") != null ? new BigDecimal(row.get("discount").toString()) : BigDecimal.ZERO);
    }

    private void parseFallbackRow(SalesOrder order, Map<String, Object> row) {
        order.setCustomerName((String) row.get("customer_name"));
        order.setCustomerPhone((String) row.get("customer_phone"));
        order.setOrderStatus((String) row.get("status"));
        order.setPaymentStatus((String) row.get("payment_status"));
        Object soldAtObj = row.get("sold_at");
        LocalDateTime dt = extractDateTime(soldAtObj);
        if (dt != null) {
            order.setSaleDate(dt);
            order.setMonthDate(LocalDate.of(dt.getYear(), dt.getMonthValue(), 1));
        }
        order.setNetRevenue(row.get("final_price") != null ? new BigDecimal(row.get("final_price").toString()) : BigDecimal.ZERO);
        order.setGrossRevenue(row.get("list_price") != null ? new BigDecimal(row.get("list_price").toString()) : order.getNetRevenue());
        order.setDiscount(row.get("discount") != null ? new BigDecimal(row.get("discount").toString()) : BigDecimal.ZERO);
    }

    private LocalDateTime extractDateTime(Object obj) {
        if (obj == null) return null;
        if (obj instanceof LocalDateTime ldt) return ldt;
        if (obj instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        if (obj instanceof java.util.Date d) return LocalDateTime.ofInstant(d.toInstant(), java.time.ZoneId.systemDefault());
        return null;
    }

    private String textOrNull(JsonNode node, String field) {
        if (node != null && node.has(field) && !node.get(field).isNull()) {
            String s = node.get(field).asText().trim();
            return s.isEmpty() ? null : s;
        }
        return null;
    }

    private String textOrFallback(JsonNode node, String field, String fallback) {
        String s = textOrNull(node, field);
        return s != null ? s : fallback;
    }

    private BigDecimal parseDecimal(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return BigDecimal.valueOf(node.asDouble());
        String s = node.asText().replaceAll("[^0-9.-]", "");
        if (s.isEmpty()) return null;
        try { return new BigDecimal(s); } catch (Exception e) { return null; }
    }

    private LocalDateTime parseJsonDate(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) {
            double days = node.asDouble();
            if (days > 30000 && days < 80000) {
                long whole = (long) days;
                double frac = days - whole;
                long secs = Math.round(frac * 86400);
                return LocalDate.of(1899, 12, 30).plusDays(whole).atStartOfDay().plusSeconds(secs);
            }
        }
        String text = node.asText().trim();
        return com.qkshop.tonkho.sync.SalesSyncRowProcessor.parseDate(text);
    }
}
