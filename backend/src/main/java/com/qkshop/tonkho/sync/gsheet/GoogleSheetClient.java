package com.qkshop.tonkho.sync.gsheet;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.BatchUpdateValuesRequest;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Lớp mỏng bọc Google Sheets API v4 (đọc / ghi theo lô).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleSheetClient {

    private final GoogleSheetProperties props;
    private final com.qkshop.tonkho.system.SystemConfigService systemConfigService;
    private volatile Sheets sheets;

    /** Một ô cần ghi: A1 notation (không gồm tên sheet) + giá trị. */
    public record CellUpdate(String a1, String value) {}

    public String getSpreadsheetId() {
        if (systemConfigService != null) {
            String id = systemConfigService.getConfig("GSHEET_SPREADSHEET_ID", props.getSpreadsheetId());
            if (id != null && !id.isBlank()) return id.trim();
        }
        return props.getSpreadsheetId();
    }

    private Sheets client() throws IOException {
        if (sheets == null) {
            synchronized (this) {
                if (sheets == null) {
                    Path path = Path.of(props.getCredentialsPath());
                    if (!Files.exists(path)) {
                        throw new IllegalStateException("Không tìm thấy file service account: " + path.toAbsolutePath());
                    }
                    try (InputStream in = new FileInputStream(path.toFile())) {
                        GoogleCredentials credentials = GoogleCredentials.fromStream(in)
                                .createScoped(Collections.singletonList(SheetsScopes.SPREADSHEETS));
                        sheets = new Sheets.Builder(
                                GoogleNetHttpTransport.newTrustedTransport(),
                                GsonFactory.getDefaultInstance(),
                                new HttpCredentialsAdapter(credentials))
                                .setApplicationName("QKShop-TonKho")
                                .build();
                    } catch (java.security.GeneralSecurityException e) {
                        throw new IOException("Không khởi tạo được HTTP transport", e);
                    }
                }
            }
        }
        return sheets;
    }

    /** Đọc một vùng của sheet cấu hình, trả về ma trận chuỗi (dòng thiếu ô sẽ ngắn hơn header). */
    public List<List<String>> read(String rangeWithoutSheet) throws IOException {
        String range = props.quotedSheetName() + "!" + rangeWithoutSheet;
        ValueRange res = client().spreadsheets().values()
                .get(getSpreadsheetId(), range)
                .setValueRenderOption("FORMATTED_VALUE")
                .execute();
        List<List<Object>> raw = res.getValues();
        List<List<String>> out = new ArrayList<>();
        if (raw == null) return out;
        for (List<Object> row : raw) {
            List<String> r = new ArrayList<>(row.size());
            for (Object o : row) r.add(o == null ? "" : o.toString());
            out.add(r);
        }
        return out;
    }

    /** Ghi nhiều ô trong 1 request (tránh giới hạn ~60 request ghi/phút). */
    public void batchWrite(List<CellUpdate> updates) throws IOException {
        if (updates == null || updates.isEmpty()) return;
        List<ValueRange> data = new ArrayList<>(updates.size());
        for (CellUpdate u : updates) {
            data.add(new ValueRange()
                    .setRange(props.quotedSheetName() + "!" + u.a1())
                    .setValues(List.of(List.of(u.value()))));
        }
        BatchUpdateValuesRequest body = new BatchUpdateValuesRequest()
                .setValueInputOption("USER_ENTERED")
                .setData(data);
        client().spreadsheets().values().batchUpdate(getSpreadsheetId(), body).execute();
        log.info("[GSHEET] Đã ghi {} ô trạng thái về sheet", updates.size());
    }

    /** 0 → A, 25 → Z, 26 → AA ... */
    public static String columnLetter(int index) {
        if (index < 0) throw new IllegalArgumentException("Column index < 0");
        StringBuilder sb = new StringBuilder();
        int n = index + 1;
        while (n > 0) {
            int rem = (n - 1) % 26;
            sb.insert(0, (char) ('A' + rem));
            n = (n - 1) / 26;
        }
        return sb.toString();
    }
}
