package com.qkshop.tonkho.sale;

import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.salesreport.SalesOrder;
import com.qkshop.tonkho.salesreport.SourceNormalizer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

public class ShippingWarrantyFlowTest {

    @Test
    @DisplayName("Đơn ship xa chưa nhận hàng: Không có hạn bảo hành và ở trạng thái Chờ giao hàng")
    void testShippingOrderPendingDelivery() {
        ClosedCycle cc = ClosedCycle.builder()
                .cycleId("CYC-TEST-001")
                .serialKey("SN-TEST-001")
                .isShipping(true)
                .isDelivered(false)
                .deliveryDate(null)
                .warrantyPeriod("6 tháng")
                .warrantyExpiry(null)
                .build();

        SalesOrder so = SalesOrder.builder()
                .transactionId("HD-TEST-001")
                .isShipping(cc.getIsShipping())
                .isDelivered(cc.getIsDelivered())
                .deliveryDate(cc.getDeliveryDate())
                .warrantyPeriod(cc.getWarrantyPeriod())
                .warrantyExpiry(cc.getWarrantyExpiry())
                .orderStatus(Boolean.TRUE.equals(cc.getIsShipping()) && !Boolean.TRUE.equals(cc.getIsDelivered()) ? "Chờ giao hàng" : "Hoàn tất")
                .build();

        assertTrue(cc.getIsShipping());
        assertFalse(cc.getIsDelivered());
        assertNull(cc.getWarrantyExpiry(), "Đơn ship chưa nhận hàng thì chưa tính ngày hết hạn bảo hành");
        assertEquals("Chờ giao hàng", so.getOrderStatus(), "Trạng thái đơn hàng phải ghi nhận là Chờ giao hàng");
    }

    @Test
    @DisplayName("Xác nhận khách đã nhận hàng: Bắt đầu tính thời gian bảo hành từ ngày nhận thực tế")
    void testConfirmDeliveryActivatesWarranty() {
        LocalDate receiveDate = LocalDate.of(2026, 11, 10);
        String warrantyPeriod = "6 tháng";

        LocalDate expectedExpiry = SourceNormalizer.calculateWarrantyExpiry(receiveDate, warrantyPeriod);
        assertNotNull(expectedExpiry);
        assertEquals(LocalDate.of(2027, 5, 10), expectedExpiry, "Hạn bảo hành phải là 6 tháng tính từ ngày nhận hàng 10/11/2026");

        ClosedCycle cc = ClosedCycle.builder()
                .cycleId("CYC-TEST-002")
                .serialKey("SN-TEST-002")
                .isShipping(true)
                .isDelivered(true)
                .deliveryDate(receiveDate)
                .warrantyPeriod(warrantyPeriod)
                .warrantyExpiry(expectedExpiry)
                .build();

        SalesOrder so = SalesOrder.builder()
                .transactionId("HD-TEST-002")
                .isShipping(cc.getIsShipping())
                .isDelivered(cc.getIsDelivered())
                .deliveryDate(cc.getDeliveryDate())
                .warrantyPeriod(cc.getWarrantyPeriod())
                .warrantyExpiry(cc.getWarrantyExpiry())
                .orderStatus(Boolean.TRUE.equals(cc.getIsShipping()) && !Boolean.TRUE.equals(cc.getIsDelivered()) ? "Chờ giao hàng" : "Hoàn tất")
                .build();

        assertTrue(cc.getIsShipping());
        assertTrue(cc.getIsDelivered());
        assertEquals(receiveDate, cc.getDeliveryDate());
        assertEquals(LocalDate.of(2027, 5, 10), cc.getWarrantyExpiry());
        assertEquals("Hoàn tất", so.getOrderStatus());
    }

    @Test
    @DisplayName("Đơn mua tại chỗ không ship: Tính bảo hành ngay từ ngày bán và hoàn tất ngay")
    void testStandardInStoreSale() {
        LocalDate saleDate = LocalDate.of(2026, 11, 5);
        String warrantyPeriod = "12 tháng";

        LocalDate expectedExpiry = SourceNormalizer.calculateWarrantyExpiry(saleDate, warrantyPeriod);

        ClosedCycle cc = ClosedCycle.builder()
                .cycleId("CYC-TEST-003")
                .serialKey("SN-TEST-003")
                .isShipping(false)
                .isDelivered(true)
                .deliveryDate(saleDate)
                .warrantyPeriod(warrantyPeriod)
                .warrantyExpiry(expectedExpiry)
                .build();

        SalesOrder so = SalesOrder.builder()
                .transactionId("HD-TEST-003")
                .isShipping(cc.getIsShipping())
                .isDelivered(cc.getIsDelivered())
                .deliveryDate(cc.getDeliveryDate())
                .warrantyPeriod(cc.getWarrantyPeriod())
                .warrantyExpiry(cc.getWarrantyExpiry())
                .orderStatus("Hoàn tất")
                .build();

        assertFalse(cc.getIsShipping());
        assertTrue(cc.getIsDelivered());
        assertEquals(LocalDate.of(2027, 11, 5), cc.getWarrantyExpiry());
        assertEquals("Hoàn tất", so.getOrderStatus());
    }
}

