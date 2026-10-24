package com.qkshop.tonkho.sync.gsheet;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.util.List;

public class LiveGoogleSheetInspectTest {

    @Test
    @Disabled("Ad-hoc live inspection only")
    void inspectLiveSheet() throws Exception {
        GoogleSheetProperties props = new GoogleSheetProperties();
        props.setSpreadsheetId("13gxMGT1dDwlK-ncXi3fUx2nY17U3ax2v1hxNRt2oIqs");
        props.setSheetName("DATABASE_BÁN HÀNG");
        props.setReadRange("A1:AE");
        props.setCredentialsPath("secrets/service_account.json");

        GoogleSheetClient client = new GoogleSheetClient(props, null);
        List<List<String>> data = client.read("A1:AE10");

        System.out.println("=== HEADERS (" + data.get(0).size() + " cols) ===");
        List<String> headers = data.get(0);
        for (int i = 0; i < headers.size(); i++) {
            System.out.println("Col " + i + " (" + GoogleSheetClient.columnLetter(i) + "): [" + headers.get(i) + "]");
        }

        SheetRowParser.ColumnMap cols = SheetRowParser.mapHeaders(headers, props.getColumns());
        System.out.println("=== COLUMN MAP ===");
        System.out.println("txn col: " + cols.txn());
        System.out.println("status col: " + cols.status());
        System.out.println("serial col: " + cols.serial());
        System.out.println("sync col: " + cols.sync());

        List<List<String>> allData = client.read("A1:AE700");
        int serialCount = 0;
        for (int r = 1; r <= Math.min(allData.size() - 1, 10); r++) {
            List<String> row = allData.get(r);
            System.out.println("Row " + (r + 1) + " Date: [" + (row.size() > 1 ? row.get(1) : "") + "] Txn: [" + (row.isEmpty() ? "" : row.get(0)) + "] Serial: [" + (row.size() > cols.serial() ? row.get(cols.serial()) : "") + "] Sync: [" + (row.size() > cols.sync() ? row.get(cols.sync()) : "") + "]");
        }
        for (int r = 305; r <= Math.min(allData.size() - 1, 315); r++) {
            List<String> row = allData.get(r);
            System.out.println("Row " + (r + 1) + " Date: [" + (row.size() > 1 ? row.get(1) : "") + "] Txn: [" + (row.isEmpty() ? "" : row.get(0)) + "] Serial: [" + (row.size() > cols.serial() ? row.get(cols.serial()) : "") + "] Sync: [" + (row.size() > cols.sync() ? row.get(cols.sync()) : "") + "]");
        }
        System.out.println("TOTAL ROWS READ: " + (allData.size() - 1));
    }
}
