<?php
// backend/mailer.php
require_once __DIR__ . '/utils.php';

function smtp_send_line($socket, string $line): bool {
    return fwrite($socket, $line . "\r\n") !== false;
}

function smtp_read_response($socket): string {
    $response = '';
    while (!feof($socket)) {
        $line = fgets($socket, 515);
        if ($line === false) {
            break;
        }
        $response .= $line;
        if (preg_match('/^\d{3}\s/', $line) === 1) {
            break;
        }
    }
    return $response;
}

function smtp_expect_code(string $response, array $codes): bool {
    if ($response === '' || preg_match('/^(\d{3})/m', $response, $matches) !== 1) {
        return false;
    }
    return in_array((int) $matches[1], $codes, true);
}

function send_plain_email(array $config, string $toEmail, string $subject, string $message): bool {
    $smtpHost = (string) ($config['mail']['smtp_host'] ?? '');
    $smtpPort = (int) ($config['mail']['smtp_port'] ?? 587);
    $smtpUser = (string) ($config['mail']['smtp_username'] ?? '');
    $smtpPass = (string) ($config['mail']['smtp_password'] ?? '');
    $smtpEncryption = strtolower((string) ($config['mail']['smtp_encryption'] ?? 'tls'));
    $smtpTimeout = (int) ($config['mail']['smtp_timeout'] ?? 20);

    $fromEmail = $config['mail']['from_email'] ?? 'noreply@localhost.localdomain';
    $fromName = $config['mail']['from_name'] ?? 'Store Menu';

    if ($smtpHost === '' || $smtpUser === '' || $smtpPass === '') {
        return false;
    }

    $socket = @stream_socket_client(
        sprintf('tcp://%s:%d', $smtpHost, $smtpPort),
        $errorCode,
        $errorMessage,
        $smtpTimeout
    );
    if (!$socket) {
        return false;
    }

    stream_set_timeout($socket, $smtpTimeout);
    $greeting = smtp_read_response($socket);
    if (!smtp_expect_code($greeting, [220])) {
        fclose($socket);
        return false;
    }

    if (!smtp_send_line($socket, 'EHLO localhost') || !smtp_expect_code(smtp_read_response($socket), [250])) {
        fclose($socket);
        return false;
    }

    if ($smtpEncryption === 'tls') {
        if (!smtp_send_line($socket, 'STARTTLS') || !smtp_expect_code(smtp_read_response($socket), [220])) {
            fclose($socket);
            return false;
        }
        $cryptoEnabled = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if ($cryptoEnabled !== true) {
            fclose($socket);
            return false;
        }
        if (!smtp_send_line($socket, 'EHLO localhost') || !smtp_expect_code(smtp_read_response($socket), [250])) {
            fclose($socket);
            return false;
        }
    }

    if (!smtp_send_line($socket, 'AUTH LOGIN') || !smtp_expect_code(smtp_read_response($socket), [334])) {
        fclose($socket);
        return false;
    }
    if (!smtp_send_line($socket, base64_encode($smtpUser)) || !smtp_expect_code(smtp_read_response($socket), [334])) {
        fclose($socket);
        return false;
    }
    if (!smtp_send_line($socket, base64_encode($smtpPass)) || !smtp_expect_code(smtp_read_response($socket), [235])) {
        fclose($socket);
        return false;
    }

    if (!smtp_send_line($socket, 'MAIL FROM:<' . $fromEmail . '>') || !smtp_expect_code(smtp_read_response($socket), [250])) {
        fclose($socket);
        return false;
    }
    if (!smtp_send_line($socket, 'RCPT TO:<' . $toEmail . '>') || !smtp_expect_code(smtp_read_response($socket), [250, 251])) {
        fclose($socket);
        return false;
    }
    if (!smtp_send_line($socket, 'DATA') || !smtp_expect_code(smtp_read_response($socket), [354])) {
        fclose($socket);
        return false;
    }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'To: <' . $toEmail . '>',
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit'
    ];
    $safeMessage = str_replace(["\r\n", "\r"], "\n", $message);
    $safeMessage = preg_replace('/^\./m', '..', $safeMessage) ?? $safeMessage;
    $payload = implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n", "\r\n", $safeMessage) . "\r\n.";

    if (!smtp_send_line($socket, $payload) || !smtp_expect_code(smtp_read_response($socket), [250])) {
        fclose($socket);
        return false;
    }

    smtp_send_line($socket, 'QUIT');
    fclose($socket);
    return true;
}

function send_registration_received_email(
    array $config,
    string $toEmail,
    string $businessName,
    string $publicMessage
): bool {
    $name = trim($businessName) !== '' ? $businessName : 'Business';
    $subject = 'Registration received - under review';
    $message = "Hello {$name},\n\n";
    $message .= "Thank you for registering with Store Menu.\n";
    $message .= $publicMessage . "\n";
    $message .= "You will receive another email once your account is approved.\n\n";
    $message .= "-----\n\n";
    $message .= "مرحبًا {$name}،\n\n";
    $message .= "نشكر لك تسجيلك في Store Menu.\n";
    $message .= "تم استلام طلب التسجيل بنجاح.\n";
    $message .= "المدة المتوقعة للاعتماد: من 12 إلى 24 ساعة.\n";
    $message .= "سيصلك بريد إلكتروني آخر فور اعتماد حسابك.\n\n";
    $message .= "مع التحية،\nفريق Store Menu";
    return send_plain_email($config, $toEmail, $subject, $message);
}

function send_admin_registration_alert(
    array $config,
    string $businessName,
    string $requestEmail,
    string $phone
): bool {
    $adminEmail = $config['mail']['approval_email'] ?? '';
    if (trim($adminEmail) === '') {
        return false;
    }

    $panelUrl = $config['mail']['approval_panel_url'] ?? 'http://localhost:4200/#/admin/approvals';
    $subject = 'New registration request requires approval';
    $message = "A new business registration request has been submitted.\n\n";
    $message .= "Business name: {$businessName}\n";
    $message .= "Email: {$requestEmail}\n";
    $message .= "Phone: {$phone}\n\n";
    $message .= "Review and approve/reject from:\n{$panelUrl}\n";

    return send_plain_email($config, $adminEmail, $subject, $message);
}

function send_registration_decision_email(
    array $config,
    string $toEmail,
    string $businessName,
    string $status,
    string $templateMode,
    string $menuUrl = ''
): bool {
    $name = trim($businessName) !== '' ? $businessName : 'Business';
    $isApproved = $status === 'approved';

    $subjectEn = $isApproved
        ? 'Your Store Menu account has been approved'
        : 'Update on your Store Menu registration request';
    $subjectAr = $isApproved
        ? 'تم اعتماد حسابك في Store Menu'
        : 'تحديث بخصوص طلب التسجيل في Store Menu';
    $subject = $templateMode === 'ar' ? $subjectAr : $subjectEn;

    $loginUrl = (string) ($config['mail']['dashboard_login_url'] ?? 'http://localhost:4200/#/login');
    $enMessage = "Hello {$name},\n\n";
    if ($isApproved) {
        $enMessage .= "Great news. Your registration request has been approved.\n";
        $enMessage .= "You can now sign in and start managing your digital menu.\n";
        $enMessage .= "Dashboard login: {$loginUrl}\n";
        if (trim($menuUrl) !== '') {
            $enMessage .= "Public menu link: {$menuUrl}\n";
        }
        $enMessage .= "If you need help, contact support at ak.64@outlook.com.\n";
    } else {
        $enMessage .= "Thank you for your interest in Store Menu.\n";
        $enMessage .= "After review, your registration request was not approved at this time.\n";
        $enMessage .= "You may contact support at ak.64@outlook.com for assistance.\n";
    }
    $enMessage .= "\nBest regards,\nStore Menu Team";

    $arMessage = "مرحبًا {$name}،\n\n";
    if ($isApproved) {
        $arMessage .= "يسعدنا إبلاغك بأنه تم اعتماد طلب التسجيل الخاص بك.\n";
        $arMessage .= "يمكنك الآن تسجيل الدخول والبدء بإدارة قائمة الطعام الرقمية الخاصة بك.\n";
        $arMessage .= "رابط تسجيل الدخول للوحة التحكم: {$loginUrl}\n";
        if (trim($menuUrl) !== '') {
            $arMessage .= "رابط القائمة العامة: {$menuUrl}\n";
        }
        $arMessage .= "لأي مساعدة يمكنك التواصل عبر: ak.64@outlook.com.\n";
    } else {
        $arMessage .= "نشكر اهتمامك بخدمة Store Menu.\n";
        $arMessage .= "بعد مراجعة الطلب، تعذر اعتماد طلب التسجيل في الوقت الحالي.\n";
        $arMessage .= "يمكنك التواصل مع الدعم عبر: ak.64@outlook.com.\n";
    }
    $arMessage .= "\nمع التحية،\nفريق Store Menu";

    if ($templateMode === 'ar') {
        return send_plain_email($config, $toEmail, $subjectAr, $arMessage);
    }
    if ($templateMode === 'en') {
        return send_plain_email($config, $toEmail, $subjectEn, $enMessage);
    }

    $bilingualSubject = $isApproved
        ? 'Your account has been approved | تم اعتماد حسابك'
        : 'Registration request update | تحديث طلب التسجيل';
    $bilingualMessage = $enMessage . "\n\n-----\n\n" . $arMessage;
    return send_plain_email($config, $toEmail, $bilingualSubject, $bilingualMessage);
}

function send_menu_access_changed_email(
    array $config,
    string $toEmail,
    string $businessName,
    bool $menuEnabled,
    string $templateMode,
    string $menuUrl = ''
): bool {
    $name = trim($businessName) !== '' ? $businessName : 'Business';

    $subjectEn = $menuEnabled
        ? 'Your menu has been activated'
        : 'Your menu has been deactivated';
    $subjectAr = $menuEnabled
        ? 'تم تفعيل قائمتك'
        : 'تم إلغاء تفعيل قائمتك';

    $enMessage = "Hello {$name},\n\n";
    if ($menuEnabled) {
        $enMessage .= "Your menu is now active and visible to customers.\n";
        if (trim($menuUrl) !== '') {
            $enMessage .= "Public menu link: {$menuUrl}\n";
        }
    } else {
        $enMessage .= "Your menu is currently disabled and not visible to customers.\n";
        $enMessage .= "Please contact support if this was unexpected.\n";
    }
    $enMessage .= "\nBest regards,\nStore Menu Team";

    $arMessage = "مرحبًا {$name}،\n\n";
    if ($menuEnabled) {
        $arMessage .= "قائمة الطعام الخاصة بك أصبحت مفعلة الآن ومرئية للعملاء.\n";
        if (trim($menuUrl) !== '') {
            $arMessage .= "رابط القائمة العامة: {$menuUrl}\n";
        }
    } else {
        $arMessage .= "قائمة الطعام الخاصة بك غير مفعلة حاليًا وغير مرئية للعملاء.\n";
        $arMessage .= "يرجى التواصل مع الدعم إذا كان هذا الإجراء غير متوقع.\n";
    }
    $arMessage .= "\nمع التحية،\nفريق Store Menu";

    if ($templateMode === 'ar') {
        return send_plain_email($config, $toEmail, $subjectAr, $arMessage);
    }
    if ($templateMode === 'en') {
        return send_plain_email($config, $toEmail, $subjectEn, $enMessage);
    }

    $subject = $menuEnabled
        ? 'Menu activated | تم تفعيل القائمة'
        : 'Menu deactivated | تم إلغاء تفعيل القائمة';
    $message = $enMessage . "\n\n-----\n\n" . $arMessage;
    return send_plain_email($config, $toEmail, $subject, $message);
}

function send_password_reset_otp_email(
    array $config,
    string $toEmail,
    string $businessName,
    string $otp,
    int $expiresMinutes = 5
): bool {
    $name = trim($businessName) !== '' ? $businessName : 'Business';
    $subject = 'Password reset code';
    $message = "Hello {$name},\n\n";
    $message .= "We received a password reset request for your Store Menu account.\n";
    $message .= "Your OTP code is: {$otp}\n";
    $message .= "This code expires in {$expiresMinutes} minutes.\n";
    $message .= "If you did not request this, please ignore this email.\n\n";
    $message .= "-----\n\n";
    $message .= "مرحبًا {$name}،\n\n";
    $message .= "استلمنا طلبًا لإعادة تعيين كلمة المرور لحسابك في Store Menu.\n";
    $message .= "رمز التحقق الخاص بك هو: {$otp}\n";
    $message .= "تنتهي صلاحية هذا الرمز خلال {$expiresMinutes} دقائق.\n";
    $message .= "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.\n\n";
    $message .= "مع التحية،\nفريق Store Menu";
    return send_plain_email($config, $toEmail, $subject, $message);
}
