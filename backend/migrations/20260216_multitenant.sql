ALTER TABLE restaurants
  ADD COLUMN menu_slug VARCHAR(180) NULL AFTER name_en,
  ADD COLUMN menu_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER menu_slug,
  ADD COLUMN access_start_at DATETIME NULL AFTER menu_enabled,
  ADD COLUMN access_end_at DATETIME NULL AFTER access_start_at;

UPDATE restaurants
SET menu_slug = CONCAT('business-', id)
WHERE menu_slug IS NULL OR menu_slug = '';

ALTER TABLE restaurants
  MODIFY COLUMN menu_slug VARCHAR(180) NOT NULL;

ALTER TABLE restaurants
  ADD UNIQUE INDEX uq_restaurants_menu_slug (menu_slug);

ALTER TABLE categories
  ADD COLUMN restaurant_id INT NULL AFTER id;

UPDATE categories
SET restaurant_id = 1
WHERE restaurant_id IS NULL;

ALTER TABLE categories
  MODIFY COLUMN restaurant_id INT NOT NULL,
  ADD CONSTRAINT fk_categories_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE;

ALTER TABLE items
  ADD COLUMN restaurant_id INT NULL AFTER id;

UPDATE items
SET restaurant_id = 1
WHERE restaurant_id IS NULL;

ALTER TABLE items
  MODIFY COLUMN restaurant_id INT NOT NULL,
  ADD CONSTRAINT fk_items_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS merchant_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  password VARCHAR(255) NOT NULL,
  otp_code VARCHAR(16) NULL,
  otp_expires_at DATETIME NULL,
  email_verified_at DATETIME NULL,
  status ENUM('pending_otp', 'pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'pending_approval',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_accounts_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE
);
