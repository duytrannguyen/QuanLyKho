package com.qkshop.tonkho.sync.gsheet;

import org.junit.jupiter.api.Test;

import java.text.Normalizer;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SheetRowParserTest {

    private final GoogleSheetProperties.Columns cols = new GoogleSheetProperties.Columns();

    @Test
    void columnLetter() {
        assertEquals("A", GoogleSheetClient.columnLetter(0));
        assertEquals("Z", GoogleSheetClient.columnLetter(25));
        assertEquals("AA", GoogleSheetClient.columnLetter(26));
        assertEquals("AE", GoogleSheetClient.columnLetter(30));
    }

    @Test
    void mapsHeadersCaseAndUnicodeInsensitive() {
        String nfdStatus = Normalizer.normalize("Trạng Thái Đơn", Normalizer.Form.NFD);
        List<String> headers = List.of("Ngày", " TRANSACTION_ID ", nfdStatus, "serial", "x", "trạng thái khớp CRM");
        SheetRowParser.ColumnMap m = SheetRowParser.mapHeaders(headers, cols);
        assertEquals(1, m.txn());
        assertEquals(2, m.status());
        assertEquals(3, m.serial());
        assertEquals(5, m.sync());
        assertEquals(-1, m.netRevenue());
    }

    @Test
    void missingRequiredHeaderThrows() {
        List<String> headers = List.of("transaction_ID", "trạng thái đơn", "Serial");
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> SheetRowParser.mapHeaders(headers, cols));
        assertTrue(ex.getMessage().contains("trạng thái khớp CRM"));
    }

    @Test
    void parsesRowsSkipsBlankAndUppercasesSerial() {
        List<List<String>> values = List.of(
                List.of("transaction_ID", "trạng thái đơn", "Serial", "trạng thái khớp CRM"),
                List.of("TX1", "Hoàn tất ", " 5cg1512pzx"),
                List.of(),
                List.of("", "", ""),
                List.of("TX2", "Đang giao", "ABC", "Đã xuất kho"));
        SheetRowParser.ColumnMap m = SheetRowParser.mapHeaders(values.get(0), cols);
        List<SheetSaleRow> rows = SheetRowParser.parse(values, m);
        assertEquals(2, rows.size());
        assertEquals(2, rows.get(0).rowNumber());
        assertEquals("5CG1512PZX", rows.get(0).getParsedSerials().get(0));
        assertEquals("", rows.get(0).syncStatus());
        assertTrue(SheetRowParser.equalsLoose(rows.get(0).orderStatus(),
                Normalizer.normalize("Hoàn tất", Normalizer.Form.NFD)));
        assertEquals(5, rows.get(1).rowNumber());
    }

    @Test
    void parsesMultiSerialCorrectly() {
        SheetSaleRow row1 = new SheetSaleRow(2, "TX1", "", "", "", "Hoàn tất", "", "", "", "", "", "", "", "", "", "", "5CG1234567, 5CG9876543; 8HD111222 \n ABC999 / XYZ888", "", "");
        List<String> serials = row1.getParsedSerials();
        assertEquals(5, serials.size());
        assertEquals("5CG1234567", serials.get(0));
        assertEquals("5CG9876543", serials.get(1));
        assertEquals("8HD111222", serials.get(2));
        assertEquals("ABC999", serials.get(3));
        assertEquals("XYZ888", serials.get(4));
    }

    @Test
    void mapsOptionalColumnsWithFallbacksEvenIfConfigBlank() {
        GoogleSheetProperties.Columns emptyConfig = new GoogleSheetProperties.Columns();
        emptyConfig.setCustomerName("");
        emptyConfig.setCustomerPhone("");
        List<String> headers = List.of("transaction_ID", "trạng thái đơn", "Serial", "trạng thái khớp CRM", "tên khách", "SĐT");
        SheetRowParser.ColumnMap m = SheetRowParser.mapHeaders(headers, emptyConfig);
        assertEquals(4, m.customerName());
        assertEquals(5, m.customerPhone());
    }
}
