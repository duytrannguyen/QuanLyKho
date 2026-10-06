package com.qkshop.tonkho.pricelist;

import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimplePdfExporterConfiguration;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

/**
 * Service tao file PDF bang gia dung JasperReports.
 * A4: 595 x 842 pt, 3 cot x 3 hang = 9 the/trang.
 * A5: 420 x 595 pt, 2 cot x 2 hang = 4 the/trang.
 */
@Service
@Slf4j
public class JasperReportService {

    private static final int PER_PAGE_A4 = 9;
    private static final int PER_PAGE_A5 = 4;

    /**
     * Xuat PDF bang gia.
     * @param pageSize "A4" hoac "A5"
     */
    public byte[] exportPriceListPdf(List<PriceListItemDTO> items, String logoPath, String pageSize)
            throws JRException {

        boolean isA5 = "A5".equalsIgnoreCase(pageSize);
        String templateName = isA5 ? "reports/bang_gia_a5.jrxml" : "reports/bang_gia.jrxml";
        int perPage = isA5 ? PER_PAGE_A5 : PER_PAGE_A4;

        // 1. Load va compile JRXML template
        InputStream jrxmlStream;
        try {
            jrxmlStream = new ClassPathResource(templateName).getInputStream();
        } catch (Exception e) {
            throw new JRException("Khong tim thay template: " + templateName, e);
        }
        JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlStream);

        // 2. Fill tung trang
        List<JasperPrint> prints = new ArrayList<>();
        for (int pageStart = 0; pageStart < items.size(); pageStart += perPage) {
            int pageEnd = Math.min(pageStart + perPage, items.size());
            List<PriceListItemDTO> pageItems = items.subList(pageStart, pageEnd);

            Map<String, Object> params = new HashMap<>();
            params.put("LOGO_PATH", logoPath);

            JRBeanCollectionDataSource ds = new JRBeanCollectionDataSource(pageItems);
            JasperPrint jp = JasperFillManager.fillReport(jasperReport, params, ds);
            prints.add(jp);
        }

        if (prints.isEmpty()) {
            throw new JRException("Khong co du lieu de tao PDF");
        }

        // 3. Ghep trang
        JasperPrint merged = prints.get(0);
        for (int i = 1; i < prints.size(); i++) {
            for (net.sf.jasperreports.engine.JRPrintPage page : prints.get(i).getPages()) {
                merged.addPage(page);
            }
        }

        // 4. Export PDF
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        JRPdfExporter exporter = new JRPdfExporter();
        exporter.setExporterInput(new SimpleExporterInput(merged));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(baos));
        SimplePdfExporterConfiguration config = new SimplePdfExporterConfiguration();
        config.setCompressed(true);
        exporter.setConfiguration(config);
        exporter.exportReport();

        log.info("Da tao PDF bang gia [{}]: {} the, {} trang", pageSize, items.size(), merged.getPages().size());
        return baos.toByteArray();
    }

    /** Backward compat — mac dinh A4 */
    public byte[] exportPriceListPdf(List<PriceListItemDTO> items, String logoPath) throws JRException {
        return exportPriceListPdf(items, logoPath, "A4");
    }
}