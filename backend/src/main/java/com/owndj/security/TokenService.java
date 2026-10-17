package com.owndj.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class TokenService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final String secretSalt;

    public TokenService(@Value("${app.session.token-secret:virtual-dj-super-secret-salt-2026}") String secretSalt) {
        this.secretSalt = secretSalt;
    }

    public String generateSecureToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashToken(String token) {
        if (token == null) {
            return "";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((token + ":" + secretSalt).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    public boolean verifyToken(String plainToken, String expectedHash) {
        if (plainToken == null || expectedHash == null) {
            return false;
        }
        String calculatedHash = hashToken(plainToken);
        return MessageDigest.isEqual(
                calculatedHash.getBytes(StandardCharsets.UTF_8),
                expectedHash.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String generateRoomCode(int length) {
        // Safe characters without confusing 0/O, 1/I/L
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(secureRandom.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
