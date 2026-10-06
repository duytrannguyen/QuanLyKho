package com.qkshop.tonkho.pricelist;

import lombok.*;
import java.util.List;

/**
 * Request body cho endpoint POST /export-pdf.
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class ExportPdfRequest {
    /** Kho giay: "A4" (3x3 = 9 the/trang) hoac "A5" (2x2 = 4 the/trang). */
    private String pageSize = "A4";

    /** Danh sach the bang gia can in. */
    private List<PriceListItemDTO> items;
}