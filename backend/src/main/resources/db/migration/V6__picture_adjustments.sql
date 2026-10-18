-- V6__picture_adjustments.sql
-- Add image adjustment attributes (fit, zoom/scale, rotate, pan position, brightness, contrast, border)

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_fit VARCHAR(32) DEFAULT 'cover';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_scale INTEGER DEFAULT 100;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_rotate INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_pos_x INTEGER DEFAULT 50;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_pos_y INTEGER DEFAULT 50;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_brightness INTEGER DEFAULT 100;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_contrast INTEGER DEFAULT 100;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_screen_image_border VARCHAR(32) DEFAULT 'neon';
