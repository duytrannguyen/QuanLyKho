package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.inventory.DailySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface DailySnapshotRepository extends JpaRepository<DailySnapshot, Long> {
    List<DailySnapshot> findBySnapshotDate(LocalDate date);

    @Query("SELECT ds FROM DailySnapshot ds WHERE ds.snapshotDate BETWEEN :from AND :to ORDER BY ds.snapshotDate")
    List<DailySnapshot> findByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    void deleteBySnapshotDate(LocalDate date);
}
