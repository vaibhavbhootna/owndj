-- V4__custom_projector_screen.sql
-- Extend sessions table with custom projector screen image, text, and layout settings

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_title VARCHAR(255) DEFAULT 'Celebrating Tonight!';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_subtitle TEXT DEFAULT 'Wishing you a night full of music, memories, and celebration.';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_tag VARCHAR(64) DEFAULT 'SPECIAL CELEBRATION';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_layout VARCHAR(32) DEFAULT 'SPLIT';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_show_qr BOOLEAN DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_show_now_playing BOOLEAN DEFAULT TRUE;

-- Seed Celebratory Announcement Moments with Background Images into visual_templates
INSERT INTO visual_templates (id, template_name, event_type, banner_title, greeting_message, ticker_text, theme_preset, bg_type, bg_media_url, bg_opacity, primary_color, accent_color)
VALUES
    ('11111111-aaaa-1111-aaaa-111111111111', 'Cake Cutting Celebration', 'BIRTHDAY', 'Time for Cake Cutting! 🎂', 'Gather around the celebration table and get ready to sing along!', '🎂 CAKE CUTTING TIME! Gather around the cake table • Make a wish and let''s celebrate! • OwnDJ Live', 'CUSTOM_SCREEN', 'IMAGE', 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=1920&auto=format&fit=crop', 0.85, '#ec4899', '#f59e0b'),
    ('22222222-bbbb-2222-bbbb-222222222222', 'Ring Ceremony Exchange', 'ENGAGEMENT', 'Exchange of Rings 💍', 'Two souls, two hearts, one eternal promise of love and togetherness.', '💍 RING CEREMONY: Celebrating eternal love and the beautiful journey ahead • Cheers to the couple! • OwnDJ', 'CUSTOM_SCREEN', 'IMAGE', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1920&auto=format&fit=crop', 0.85, '#f59e0b', '#06b6d4'),
    ('33333333-cccc-3333-cccc-333333333333', 'Wedding Celebration & Vows', 'WEDDING', 'Celebrating Our Wedding 💒', 'Thank you for joining us on our special day! Dance, feast, and make unforgettable memories!', '💒 JUST MARRIED: Celebrating love, laughter, and happily ever after • Request your favorite dance songs now!', 'CUSTOM_SCREEN', 'IMAGE', 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1920&auto=format&fit=crop', 0.85, '#a855f7', '#ec4899'),
    ('44444444-dddd-4444-dddd-444444444444', 'Champagne Toast', 'PARTY', 'Raise Your Glasses! 🥂', 'Here''s to good times, great music, and unforgettable memories together!', '🥂 CHEERS TO TONIGHT: Raise your glasses for a special toast! • Keep the drinks flowing and the music bumping!', 'CUSTOM_SCREEN', 'IMAGE', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1920&auto=format&fit=crop', 0.85, '#eab308', '#06b6d4'),
    ('55555555-eeee-5555-eeee-555555555555', 'Dance Floor Open', 'PARTY', 'The Dance Floor is OPEN! 🔥', 'Put on your dancing shoes and get on the floor! Send your requests to the DJ right now!', '🔥 DANCE FLOOR IS LIVE: DJ is taking requests • Scan the QR code to get your song in line • Let''s party!', 'CUSTOM_SCREEN', 'IMAGE', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1920&auto=format&fit=crop', 0.85, '#06b6d4', '#ec4899')
ON CONFLICT (id) DO NOTHING;
