package com.qkshop.tonkho.issue;

import com.qkshop.tonkho.issue.IssueHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IssueHistoryRepository extends JpaRepository<IssueHistory, Long> {
    List<IssueHistory> findByIssueIdOrderByEventAtDesc(String issueId);
}
