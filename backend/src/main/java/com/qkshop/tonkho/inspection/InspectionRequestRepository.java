package com.qkshop.tonkho.inspection;

import com.qkshop.tonkho.inspection.dto.InspectionRequest;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.inspection.InspectionRequestType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InspectionRequestRepository extends JpaRepository<InspectionRequest, Long> {
    Optional<InspectionRequest> findByInspectionRequestId(String inspectionRequestId);
    List<InspectionRequest> findByCycleId(String cycleId);

    /**
     * Kiểm tra xem một cycle có request đang mở không.
     * Ràng buộc: một cycle_id chỉ có một yêu cầu mở.
     */
    Optional<InspectionRequest> findByCycleIdAndStatusIn(String cycleId, List<InspectionRequestStatus> openStatuses);

    List<InspectionRequest> findBySerialKey(String serialKey);
    List<InspectionRequest> findByStatus(InspectionRequestStatus status);
    Page<InspectionRequest> findByStatus(InspectionRequestStatus status, Pageable pageable);
    List<InspectionRequest> findByRequestTypeAndStatusIn(InspectionRequestType type, List<InspectionRequestStatus> statuses);
    List<InspectionRequest> findByStatusIn(List<InspectionRequestStatus> statuses);

    long countByStatus(InspectionRequestStatus status);
    long countByStatusIn(List<InspectionRequestStatus> statuses);
}
