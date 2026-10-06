package com.qkshop.tonkho.exception;

public class DuplicateSerialException extends RuntimeException {
    public DuplicateSerialException(String serial) {
        super("Serial đã tồn tại trong hệ thống: " + serial);
    }
}
