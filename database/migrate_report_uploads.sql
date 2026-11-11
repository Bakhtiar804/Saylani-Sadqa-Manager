-- Business keys support city-scoped workbooks whose source row positions differ.
ALTER TABLE monthly_collection_reports DROP CONSTRAINT IF EXISTS monthly_collection_reports_source_sheet_source_row_key;
ALTER TABLE monthly_expense_reports DROP CONSTRAINT IF EXISTS monthly_expense_reports_source_sheet_source_row_key;
ALTER TABLE monthly_staff_counts DROP CONSTRAINT IF EXISTS monthly_staff_counts_source_sheet_source_row_key;
CREATE UNIQUE INDEX IF NOT EXISTS monthly_collection_business_key ON monthly_collection_reports(city_id,report_month,collection_channel);
CREATE UNIQUE INDEX IF NOT EXISTS monthly_expense_business_key ON monthly_expense_reports(city_id,report_month,expense_category);
CREATE UNIQUE INDEX IF NOT EXISTS monthly_staff_business_key ON monthly_staff_counts(city_id,report_month);
ALTER TABLE report_import_batches ADD COLUMN IF NOT EXISTS actor_user_id VARCHAR(40) REFERENCES users(user_id);
ALTER TABLE report_import_batches ADD COLUMN IF NOT EXISTS target_city_id VARCHAR(16) REFERENCES cities(city_id);
