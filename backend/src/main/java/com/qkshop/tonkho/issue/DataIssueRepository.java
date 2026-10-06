package com.qkshop.tonkho.issue;

import com.qkshop.tonkho.issue.DataIssue;
import com.qkshop.tonkho.issue.IssueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DataIssueRepository extends JpaRepository<DataIssue, Long> {
    Optional<DataIssue> findByIssueId(String issueId);
    Optional<DataIssue> findByIssueFingerprint(String fingerprint);
    boolean existsByIssueFingerprint(String fingerprint);
    List<DataIssue> findByStatus(IssueStatus status);
    List<DataIssue> findByStatusIn(List<IssueStatus> statuses);
    Page<DataIssue> findByStatusIn(List<IssueStatus> statuses, Pageable pageable);
    List<DataIssue> findByIssueType(String issueType);
    long countByStatus(IssueStatus status);
    long countByStatusIn(List<IssueStatus> statuses);
}
