package com.qkshop.tonkho.inspection;
import com.qkshop.tonkho.core.StateTransitionService;

import com.qkshop.tonkho.exception.ResourceNotFoundException;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inspection.dto.InspectionRequest;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.inspection.InspectionRequestType;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inspection.InspectionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InspectionService {

    private final InspectionRequestRepository inspectionRepo;
    private final ActiveInventoryRepository activeInventoryRepo;
    private final StateTransitionService stateTransitionService;

    // ==================== CREATE ====================

    /**
     * Tạo yêu cầu kiểm tra (nếu cycle chưa có yêu cầu mở).
     */
    @Transactional
    public InspectionRequest createInspectionRequest(String cycleId, InspectionRequestType type) {
        ActiveInventory inventory = activeInventoryRepo.findByCycleId(cycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Cycle ID: " + cycleId));
        
        // Kiểm tra xem cycle có request đang mở không
        List<InspectionRequestStatus> openStatuses = List.of(
                InspectionRequestStatus.OPEN, 
                InspectionRequestStatus.IN_PROGRESS, 
                InspectionRequestStatus.RECHECK_REQUESTED);
                
        if (inspectionRepo.findByCycleIdAndStatusIn(cycleId, openStatuses).isPresent()) {
            throw new IllegalStateException("Vòng đời này đang có một yêu cầu kiểm tra đang mở.");
        }

        InspectionRequest request = InspectionRequest.builder()
                .inspectionRequestId("INSP-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                .cycleId(cycleId)
                .serialKey(inventory.getSerialKey())
                .requestType(type)
                .status(InspectionRequestStatus.OPEN)
                .build();
                
        return inspectionRepo.save(request);
    }

    // ==================== READ ====================

    public List<InspectionRequest> getActiveRequests(String statusFilter) {
        if (statusFilter != null && !statusFilter.isBlank()) {
            if (statusFilter.equalsIgnoreCase("ALL")) {
                return inspectionRepo.findAll();
            }
            try {
                InspectionRequestStatus status = InspectionRequestStatus.valueOf(statusFilter);
                return inspectionRepo.findByStatus(status);
            } catch (IllegalArgumentException e) {
                // Ignore invalid filter
            }
        }
        return inspectionRepo.findByStatusIn(List.of(
                InspectionRequestStatus.OPEN, 
                InspectionRequestStatus.IN_PROGRESS, 
                InspectionRequestStatus.RECHECK_REQUESTED));
    }

    public Page<InspectionRequest> getAllRequests(Pageable pageable) {
        return inspectionRepo.findAll(pageable); // Should add order by in repo if needed
    }

    // ==================== UPDATE ====================

    @Transactional
    public InspectionRequest updateProgress(String requestId, String progressNotes, boolean dataComplete, String assignee) {
        InspectionRequest request = findById(requestId);
        validateCanModify(request);

        request.setProgressNotes(progressNotes);
        request.setRequiredDataComplete(dataComplete);
        request.setAssignedTo(assignee);

        return inspectionRepo.save(request);
    }

    @Transactional
    public InspectionRequest startInspection(String requestId, String assignee) {
        InspectionRequest request = findById(requestId);
        validateCanModify(request);

        request.setStatus(InspectionRequestStatus.IN_PROGRESS);
        request.setAssignedTo(assignee);
        if (request.getStartedAt() == null) {
            request.setStartedAt(LocalDateTime.now());
        }

        return inspectionRepo.save(request);
    }

    @Transactional
    public InspectionRequest sendToRecheck(String requestId, String assignee) {
        InspectionRequest request = findById(requestId);
        validateCanModify(request);

        request.setStatus(InspectionRequestStatus.RECHECK_REQUESTED);
        request.setAssignedTo(assignee);

        return inspectionRepo.save(request);
    }

    /**
     * Xác nhận ĐẠT.
     * Cập nhật CycleState -> READY.
     */
    @Transactional
    public InspectionRequest approveInspection(String requestId, String assignee, String notes) {
        InspectionRequest request = findById(requestId);
        validateCanModify(request);

        request.setStatus(InspectionRequestStatus.PASSED);
        request.setCompletedAt(LocalDateTime.now());
        request.setAssignedTo(assignee);

        InspectionRequest saved = inspectionRepo.save(request);

        // Chuyển trạng thái máy về READY
        stateTransitionService.transitionToReady(request.getCycleId(), assignee, notes);

        return saved;
    }

    /**
     * Xác nhận TRẢ MÁY / HỦY.
     * Cập nhật CycleState -> CLOSED.
     */
    @Transactional
    public InspectionRequest rejectInspection(String requestId, String assignee, String notes) {
        InspectionRequest request = findById(requestId);
        validateCanModify(request);

        request.setStatus(InspectionRequestStatus.REJECTED_RETURNED);
        request.setCompletedAt(LocalDateTime.now());
        request.setAssignedTo(assignee);

        InspectionRequest saved = inspectionRepo.save(request);

        // Đóng cycle với loại CANCEL
        stateTransitionService.transitionToClosed(request.getCycleId(), CloseType.CANCEL, requestId, assignee, notes);

        return saved;
    }

    // ==================== HELPERS ====================

    private InspectionRequest findById(String id) {
        return inspectionRepo.findByInspectionRequestId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu kiểm tra: " + id));
    }

    private void validateCanModify(InspectionRequest request) {
        if (request.getStatus() == InspectionRequestStatus.PASSED ||
                request.getStatus() == InspectionRequestStatus.REJECTED_RETURNED) {
            throw new IllegalStateException("Phiếu kiểm tra đã hoàn tất, không thể thay đổi trạng thái.");
        }
    }
}
