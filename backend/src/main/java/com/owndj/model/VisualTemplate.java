package com.owndj.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "visual_templates")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisualTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "template_name", nullable = false, length = 128)
    private String templateName;

    @Column(name = "event_type", length = 64)
    @Builder.Default
    private String eventType = "PARTY";

    @Column(name = "banner_title", nullable = false, length = 255)
    private String bannerTitle;

    @Column(name = "greeting_message", length = 512)
    private String greetingMessage;

    @Column(name = "ticker_text", length = 512)
    private String tickerText;

    @Column(name = "theme_preset", nullable = false, length = 32)
    @Builder.Default
    private String themePreset = "NOW_PLAYING"; // WELCOME, NOW_PLAYING, PARTY_VISUALS, GUEST_REQUEST, STANDBY

    @Column(name = "bg_type", nullable = false, length = 32)
    @Builder.Default
    private String bgType = "ANIMATED_PATTERN"; // GRADIENT, ANIMATED_PATTERN, IMAGE, VIDEO

    @Column(name = "bg_media_url", length = 512)
    private String bgMediaUrl;

    @Column(name = "bg_opacity")
    @Builder.Default
    private Double bgOpacity = 0.85;

    @Column(name = "show_qr_code")
    @Builder.Default
    private Boolean showQrCode = true;

    @Column(name = "show_now_playing")
    @Builder.Default
    private Boolean showNowPlaying = true;

    @Column(name = "show_guest_announcements")
    @Builder.Default
    private Boolean showGuestAnnouncements = true;

    @Column(name = "show_visualizer")
    @Builder.Default
    private Boolean showVisualizer = true;

    @Column(name = "primary_color", length = 32)
    @Builder.Default
    private String primaryColor = "#06b6d4";

    @Column(name = "accent_color", length = 32)
    @Builder.Default
    private String accentColor = "#ec4899";

    @Column(name = "font_family", length = 64)
    @Builder.Default
    private String fontFamily = "sans-serif";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
