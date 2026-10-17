package com.owndj.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
public class QrCodeService {

    private final String frontendUrl;

    public QrCodeService(@Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public String generateJoinUrl(String roomCode) {
        return frontendUrl + "/join/" + roomCode;
    }

    public byte[] generateQrCodePng(String text, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    public String generateQrCodeDataUrl(String text, int width, int height) {
        byte[] pngBytes = generateQrCodePng(text, width, height);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngBytes);
    }
}
