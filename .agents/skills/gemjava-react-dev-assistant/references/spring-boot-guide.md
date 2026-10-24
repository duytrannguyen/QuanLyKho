# Spring Boot 3 & Java 21 Guide - QKShop

Tài liệu hướng dẫn phát triển Backend cho dự án Quản Lý Kho QKShop.

## 1. Phiên bản & Thư viện nòng cốt
- **Java**: Version 21 (LTS) - tận dụng Record types, Pattern matching, Switch expressions khi phù hợp.
- **Spring Boot**: 3.3.5
- **Spring Security**: JWT Authentication với `jjwt-api 0.12.6`.
- **Database**: MySQL 8.0, Spring Data JPA, Hibernate.
- **Tiện ích**: Lombok, POI (Excel import/export).

## 2. Chuẩn mực API Controller
```java
@RestController
@RequestMapping("/api/v1/resource")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ResourceDTO>>> getAll() {
        List<ResourceDTO> items = resourceService.findAll();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành công", items));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ResourceDTO>> create(
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @Valid @RequestBody CreateResourceRequest request) {
        ResourceDTO created = resourceService.create(requestId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mới thành công", created));
    }
}
```

## 3. Quản lý Giao dịch (Transactions)
- Các phương thức đọc dữ liệu: `@Transactional(readOnly = true)`.
- Các thao tác cập nhật kho, nhập/xuất máy, tạo đơn bán: Bắt buộc bọc `@Transactional(rollbackFor = Exception.class)`.
- Ghi log sự kiện thông qua `EventLogRepository` khi có biến động kho hoặc trạng thái máy.
