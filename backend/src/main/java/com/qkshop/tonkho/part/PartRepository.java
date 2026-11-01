package com.qkshop.tonkho.part;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartRepository extends JpaRepository<Part, Long> {

    Optional<Part> findBySku(String sku);

    List<Part> findByQuantityGreaterThan(Integer quantity);

    List<Part> findByCategoryOrderByCreatedAtDesc(String category);

    List<Part> findAllByOrderByCreatedAtDesc();

    @Query("SELECT p FROM Part p WHERE " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(p.note, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY p.createdAt DESC")
    List<Part> searchParts(@Param("keyword") String keyword);

    @Query("SELECT p FROM Part p WHERE p.quantity > 0 AND (" +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY p.name ASC")
    List<Part> searchAvailableParts(@Param("keyword") String keyword);

    long countByCategory(String category);
}
