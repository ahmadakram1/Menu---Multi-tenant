<?php
// backend/config.php
return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'name' => getenv('DB_NAME') ?: 'menu_system',
        'user' => getenv('DB_USER') ?: 'root',
        'pass' => getenv('DB_PASS') ?: '',
        'charset' => getenv('DB_CHARSET') ?: 'utf8mb4'
    ],
    'jwt' => [
        'secret' => getenv('JWT_SECRET') ?: 'local_dev_change_me',
        'issuer' => 'menu_api',
        'ttl' => (int) (getenv('JWT_TTL') ?: 3600)
    ],
    'mail' => [
        'from_email' => getenv('MAIL_FROM_EMAIL') ?: 'ak.64@outlook.com',
        'from_name' => getenv('MAIL_FROM_NAME') ?: 'Store Menu',
        'approval_email' => getenv('MAIL_APPROVAL_EMAIL') ?: 'ak.64@outlook.com',
        'approval_panel_url' => getenv('MAIL_APPROVAL_PANEL_URL') ?: 'http://localhost:4200/#/admin/approvals',
        'dashboard_login_url' => getenv('MAIL_DASHBOARD_LOGIN_URL') ?: 'http://localhost:4200/#/login',
        'smtp_host' => getenv('MAIL_SMTP_HOST') ?: 'smtp-relay.brevo.com',
        'smtp_port' => (int) (getenv('MAIL_SMTP_PORT') ?: 587),
        'smtp_username' => getenv('MAIL_SMTP_USERNAME') ?: 'a2a2bb001@smtp-brevo.com',
        'smtp_password' => getenv('MAIL_SMTP_PASSWORD') ?: 'TaAYKU4kWnP8ER0m',
        'smtp_encryption' => getenv('MAIL_SMTP_ENCRYPTION') ?: 'tls',
        'smtp_timeout' => (int) (getenv('MAIL_SMTP_TIMEOUT') ?: 20),
        'brevo_api_key' => getenv('BREVO_API_KEY') ?: 'TaAYKU4kWnP8ER0m',
        'debug_return_otp' => (getenv('OTP_DEBUG_RETURN') ?: '1') === '1'
    ],
    'uploads_dir' => __DIR__ . '/uploads'
];
