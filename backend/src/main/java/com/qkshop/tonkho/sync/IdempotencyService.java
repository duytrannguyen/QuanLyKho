package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.sync.CommandLedger;
import com.qkshop.tonkho.sync.CommandLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Service chống gửi trùng command.
 * Theo Blueprint §7 — Quy tắc ghi an toàn:
 * - Mỗi command gửi request_id / idempotency_key
 * - Nếu đã xử lý → trả kết quả cũ, không tạo event mới
 * - Nếu payload khác → trả IDEMPOTENCY_CONFLICT
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private final CommandLedgerRepository commandLedgerRepo;

    /**
     * Kiểm tra xem request đã được xử lý chưa.
     * @return Optional.empty() nếu chưa xử lý, hoặc CommandLedger nếu đã xử lý
     */
    public Optional<CommandLedger> checkAndGet(String requestId) {
        return commandLedgerRepo.findByRequestId(requestId);
    }

    /**
     * Kiểm tra xem request đã tồn tại chưa.
     */
    public boolean exists(String requestId) {
        return commandLedgerRepo.existsByRequestId(requestId);
    }

    /**
     * Ghi nhận command đã xử lý thành công.
     */
    public CommandLedger recordSuccess(String requestId, String commandType, Object payload, String resultData, String actor) {
        CommandLedger ledger = CommandLedger.builder()
                .requestId(requestId)
                .commandType(commandType)
                .payloadHash(hashPayload(payload))
                .resultStatus("SUCCESS")
                .resultData(resultData)
                .actor(actor)
                .build();
        return commandLedgerRepo.save(ledger);
    }

    /**
     * Ghi nhận command đã thất bại.
     */
    public CommandLedger recordFailure(String requestId, String commandType, Object payload, String errorCode, String actor) {
        CommandLedger ledger = CommandLedger.builder()
                .requestId(requestId)
                .commandType(commandType)
                .payloadHash(hashPayload(payload))
                .resultStatus("FAILED")
                .resultData("{\"error_code\":\"" + errorCode + "\"}")
                .actor(actor)
                .build();
        return commandLedgerRepo.save(ledger);
    }

    /**
     * Kiểm tra payload có khớp với lần gửi trước không.
     * Nếu không khớp → IDEMPOTENCY_CONFLICT
     */
    public boolean payloadMatches(CommandLedger existing, Object currentPayload) {
        String currentHash = hashPayload(currentPayload);
        return existing.getPayloadHash().equals(currentHash);
    }

    /**
     * Hash payload để so sánh — dùng SHA-256.
     */
    private String hashPayload(Object payload) {
        try {
            String json = payload != null ? payload.toString() : "";
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 không khả dụng", e);
            return "HASH_ERROR";
        }
    }
}
