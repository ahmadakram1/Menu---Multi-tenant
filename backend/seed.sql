-- backend/seed.sql (MySQL)
INSERT INTO restaurants (name_ar, name_en, menu_slug, menu_enabled, phone, whatsapp, instagram)
VALUES ('مطعم تجريبي', 'Sample Restaurant', 'sample-restaurant', 1, '0100000000', '0100000000', 'sample_restaurant');

INSERT INTO categories (restaurant_id, name_ar, name_en, description_ar, description_en)
VALUES (1, 'مقبلات', 'Starters', 'وصف مختصر', 'Short description');

INSERT INTO items (restaurant_id, name_ar, name_en, price, description_ar, description_en, category_id)
VALUES (1, 'بطاطس مقلية', 'French Fries', 20.00, 'وصف', 'Description', 1);

INSERT INTO admins (email, password)
VALUES ('ak.64@outlook.com', '$2y$10$rsP58UjpdeuwSoCY/T16BeginUHPhdmsjhzM.q75hZPd1LnnWBRSG');

INSERT INTO merchant_accounts (
  restaurant_id, email, phone, password, otp_code, otp_expires_at, email_verified_at, status, created_at, updated_at
)
VALUES (
  1,
  'owner@sample.com',
  '0100000000',
  '$2y$10$rsP58UjpdeuwSoCY/T16BeginUHPhdmsjhzM.q75hZPd1LnnWBRSG',
  NULL,
  NULL,
  UTC_TIMESTAMP(),
  'approved',
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP()
);
