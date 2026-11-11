ALTER TABLE donation_boxes ADD COLUMN IF NOT EXISTS district VARCHAR(100);
CREATE INDEX IF NOT EXISTS donation_boxes_city_district_idx ON donation_boxes(city_id,district);
