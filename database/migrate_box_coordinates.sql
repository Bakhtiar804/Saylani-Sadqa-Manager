BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE donation_boxes ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE donation_boxes ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'donation_boxes'::regclass AND conname = 'donation_boxes_coordinates_check') THEN
    ALTER TABLE donation_boxes ADD CONSTRAINT donation_boxes_coordinates_check CHECK (
      (latitude IS NULL AND longitude IS NULL) OR
      (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    );
  END IF;
END $$;
COMMIT;
