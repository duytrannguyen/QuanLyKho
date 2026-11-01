package com.qkshop.tonkho.core.service;

import java.time.LocalDateTime;

/**
 * Service sinh mã hóa đơn đồng bộ cho toàn bộ hệ thống QKShop.
 * Quy cách mã hóa đơn (10 ký tự):
 * [Phân loại 2 ký tự][STT trong tháng 4 chữ số][Ngày/tháng ddMM 4 chữ số]
 * - Bán máy: BM00010111
 * - Phụ kiện: PK00010111
 * - Sửa chữa: SC00010111
 * STT tăng độc lập theo từng loại hóa đơn và tự động reset về 0001 vào đầu mỗi tháng.
 */
public interface InvoiceCodeService {

    /**
     * Sinh mã hóa đơn bán máy: BM + STT 4 số + ddMM 4 số (Ví dụ: BM00010111)
     */
    String generateMachineInvoiceCode(LocalDateTime saleDate);

    /**
     * Sinh mã hóa đơn bán phụ kiện: PK + STT 4 số + ddMM 4 số (Ví dụ: PK00010111)
     */
    String generateAccessoryInvoiceCode(LocalDateTime saleDate);

    /**
     * Sinh mã hóa đơn dịch vụ sửa chữa: SC + STT 4 số + ddMM 4 số (Ví dụ: SC00010111)
     */
    String generateRepairInvoiceCode(LocalDateTime createdDate);
}
