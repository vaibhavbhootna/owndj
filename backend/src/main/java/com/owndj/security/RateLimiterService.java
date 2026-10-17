package com.owndj.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private final int searchLimitPerMinute;
    private final int requestLimitPerMinute;

    private final Map<String, TokenBucket> searchBuckets = new ConcurrentHashMap<>();
    private final Map<String, TokenBucket> requestBuckets = new ConcurrentHashMap<>();

    public RateLimiterService(
            @Value("${app.rate-limit.search-per-minute:30}") int searchLimitPerMinute,
            @Value("${app.rate-limit.request-per-minute:10}") int requestLimitPerMinute) {
        this.searchLimitPerMinute = searchLimitPerMinute;
        this.requestLimitPerMinute = requestLimitPerMinute;
    }

    public boolean allowSearch(String clientKey) {
        return searchBuckets.computeIfAbsent(clientKey, k -> new TokenBucket(searchLimitPerMinute, 60_000L))
                .tryConsume();
    }

    public boolean allowRequest(String clientKey) {
        return requestBuckets.computeIfAbsent(clientKey, k -> new TokenBucket(requestLimitPerMinute, 60_000L))
                .tryConsume();
    }

    private static class TokenBucket {
        private final int capacity;
        private final long refillIntervalMs;
        private int tokens;
        private long lastRefillTimestamp;

        TokenBucket(int capacity, long refillIntervalMs) {
            this.capacity = capacity;
            this.refillIntervalMs = refillIntervalMs;
            this.tokens = capacity;
            this.lastRefillTimestamp = System.currentTimeMillis();
        }

        synchronized boolean tryConsume() {
            refill();
            if (tokens > 0) {
                tokens--;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            long elapsed = now - lastRefillTimestamp;
            if (elapsed > refillIntervalMs) {
                tokens = capacity;
                lastRefillTimestamp = now;
            } else {
                int tokensToAdd = (int) (elapsed * capacity / refillIntervalMs);
                if (tokensToAdd > 0) {
                    tokens = Math.min(capacity, tokens + tokensToAdd);
                    lastRefillTimestamp = now;
                }
            }
        }
    }
}
