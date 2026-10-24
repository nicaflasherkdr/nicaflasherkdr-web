<?php
/**
 * NICA FLASHER - API CONNECTOR TOOLS BYPASS (ECID & SERIAL NUMBER)
 * Version: 2026.10.24
 *
 * File ini menangani request registrasi ECID dan Serial Number (SN) untuk tools bypass
 * serta menyediakan endpoint status server / maintenance mode yang dapat dikoneksikan
 * langsung ke website Nica Flasher atau tools bypass baru.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle CORS Preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// File database lokal sederhana untuk menyimpan registrasi jika belum ada MySQL
$logFile = __DIR__ . '/ecid-registrations-log.json';
$configFile = __DIR__ . '/tools-config.json';

// Baca konfigurasi maintenance & tools
$globalMaintenance = false;
$maintenanceMsg = "Server registrasi sedang dalam pemeliharaan rutin.";

if (file_exists($configFile)) {
    $cfg = json_decode(file_get_contents($configFile), true);
    if (!empty($cfg['maintenance'])) {
        $globalMaintenance = true;
        if (!empty($cfg['maintenance_message'])) {
            $maintenanceMsg = $cfg['maintenance_message'];
        }
    }
}

// Ambil input dari POST JSON atau GET/POST form
$rawInput = file_get_contents('php://input');
$inputData = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $inputData = $decoded;
    }
}

// Gabungkan dengan $_REQUEST
$data = array_merge($_REQUEST, $inputData);

$action = isset($data['action']) ? trim($data['action']) : 'status';
$tool   = isset($data['tool']) ? trim($data['tool']) : '';
$ecid   = isset($data['ecid']) ? strtoupper(trim($data['ecid'])) : '';
$sn     = isset($data['sn']) ? strtoupper(trim($data['sn'])) : '';
$phone  = isset($data['phone']) ? trim($data['phone']) : '';
$model  = isset($data['model']) ? trim($data['model']) : '';

// 1. ACTION: PING / STATUS (Cek status server & maintenance)
if ($action === 'ping' || $action === 'status') {
    echo json_encode([
        'status' => 'success',
        'code' => 200,
        'maintenance' => $globalMaintenance,
        'globalMaintenance' => $globalMaintenance,
        'message' => $globalMaintenance ? $maintenanceMsg : 'Server Nica Flasher Tools Bypass Online & Siap',
        'server_time' => date('Y-m-d H:i:s'),
        'supported_tools' => ['iremove', 'mina', 'smd', 'hfz', 'checkm8', 'custom_tool']
    ], JSON_PRETTY_PRINT);
    exit();
}

// 2. ACTION: TOGGLE MAINTENANCE (Update status pemeliharaan oleh Admin)
if ($action === 'toggle_maintenance') {
    $newStatus = !empty($data['maintenance']) || (!empty($data['globalMaintenance']));
    $newMsg    = !empty($data['message']) ? trim($data['message']) : 'Server registrasi tools sedang dalam pemeliharaan rutin. Silakan hubungi admin via WhatsApp untuk pendaftaran manual.';

    $cfg = [
        'globalMaintenance' => $newStatus,
        'message' => $newMsg,
        'updated_at' => date('Y-m-d H:i:s')
    ];

    @file_put_contents($configFile, json_encode($cfg, JSON_PRETTY_PRINT));
    @file_put_contents(__DIR__ . '/maintenance.json', json_encode($cfg, JSON_PRETTY_PRINT));

    echo json_encode([
        'status' => 'success',
        'globalMaintenance' => $newStatus,
        'message' => 'Status maintenance server berhasil diperbarui di server pusat.',
        'data' => $cfg
    ], JSON_PRETTY_PRINT);
    exit();
}

// 2. CEK GLOBAL MAINTENANCE
if ($globalMaintenance) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'code' => 503,
        'maintenance' => true,
        'message' => $maintenanceMsg
    ], JSON_PRETTY_PRINT);
    exit();
}

// 3. ACTION: REGISTER (Registrasi ECID / Serial Number)
if ($action === 'register') {
    if (empty($ecid) && empty($sn)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'code' => 400,
            'message' => 'Parameter ECID atau Serial Number (SN) wajib diisi!'
        ], JSON_PRETTY_PRINT);
        exit();
    }

    // Format ECID: Hapus spasi dan pastikan format valid
    $ecid = str_replace([' ', '-', ':'], '', $ecid);
    $sn   = str_replace([' ', '-', ':'], '', $sn);

    // Generate Order ID
    $orderId = 'ECID-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));

    // Data registrasi baru
    $registrationRecord = [
        'order_id' => $orderId,
        'tool' => $tool ?: 'Universal Bypass Tool',
        'ecid' => $ecid,
        'sn' => $sn,
        'phone' => $phone,
        'model' => $model,
        'status' => 'Authorized',
        'authorized_at' => date('Y-m-d H:i:s'),
        'ip_client' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ];

    // Simpan ke log file lokal
    $allLogs = [];
    if (file_exists($logFile)) {
        $existing = json_decode(file_get_contents($logFile), true);
        if (is_array($existing)) {
            $allLogs = $existing;
        }
    }
    array_unshift($allLogs, $registrationRecord);
    // Batasi log maksimal 500 entri
    if (count($allLogs) > 500) {
        $allLogs = array_slice($allLogs, 0, 500);
    }
    @file_put_contents($logFile, json_encode($allLogs, JSON_PRETTY_PRINT));

    // Response sukses
    echo json_encode([
        'status' => 'success',
        'code' => 200,
        'message' => 'Registrasi berhasil! ID Perangkat telah terdaftar di database server.',
        'data' => $registrationRecord
    ], JSON_PRETTY_PRINT);
    exit();
}

// 4. ACTION: CHECK (Cek status apakah ECID/SN sudah terdaftar)
if ($action === 'check') {
    $searchKey = $ecid ?: $sn;
    if (empty($searchKey)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Masukkan ECID atau Serial Number yang ingin dicek.'
        ]);
        exit();
    }

    $found = null;
    if (file_exists($logFile)) {
        $logs = json_decode(file_get_contents($logFile), true);
        if (is_array($logs)) {
            foreach ($logs as $item) {
                if ((!empty($ecid) && ($item['ecid'] ?? '') === $ecid) ||
                    (!empty($sn) && ($item['sn'] ?? '') === $sn)) {
                    $found = $item;
                    break;
                }
            }
        }
    }

    if ($found) {
        echo json_encode([
            'status' => 'success',
            'is_registered' => true,
            'message' => 'Perangkat TERDAFTAR (Authorized) di server.',
            'data' => $found
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'status' => 'success',
            'is_registered' => false,
            'message' => 'Perangkat BELUM TERDAFTAR di server.'
        ], JSON_PRETTY_PRINT);
    }
    exit();
}

// Default fallback
echo json_encode([
    'status' => 'info',
    'service' => 'Nica Flasher Tools Bypass API',
    'actions' => ['ping', 'register', 'check'],
    'usage' => 'api-tools.php?action=register&ecid=0x123456&tool=iremove'
], JSON_PRETTY_PRINT);
