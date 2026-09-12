<?php
include_once('../../../../common.php');

// 그누보드 환경에서 T2EDITOR 상수 직접 정의
if (defined('_GNUBOARD_')) {
    define('T2EDITOR_PATH', G5_PLUGIN_PATH.'/editor/t2editor');
    define('T2EDITOR_URL', G5_PLUGIN_URL.'/editor/t2editor');
    define('T2EDITOR_DATA_PATH', G5_DATA_PATH.'/editor');
    define('T2EDITOR_DATA_URL', G5_DATA_URL.'/editor');
    define('T2EDITOR_DIR_PERMISSION', G5_DIR_PERMISSION);
    define('T2EDITOR_FILE_PERMISSION', G5_FILE_PERMISSION);
} else {
    // 비-그누보드 환경에서만 t2_config.php 포함
    require '../t2_config.php';
}

$uid = isset($_POST['uid']) ? $_POST['uid'] : '';
if (!$uid) {
    die(json_encode(['success' => false, 'message' => '잘못된 접근입니다.']));
}

// 폴더명 생성: t2editor_YYYYMMDD 형식
$folder_name = 't2editor_' . date('Ymd');
$upload_dir = T2EDITOR_DATA_PATH.'/'.$folder_name;
$upload_url = T2EDITOR_DATA_URL.'/'.$folder_name;

// 디렉토리가 없으면 생성
if (!is_dir($upload_dir)) {
    @mkdir($upload_dir, T2EDITOR_DIR_PERMISSION, true);
    @chmod($upload_dir, T2EDITOR_DIR_PERMISSION);
}

$allowed_types = ['zip', 'pdf', 'txt', 'mp3', 'm4a', 'mp4'];
$file = $_FILES['bf_file'];

if (!isset($file) || empty($file['name'])) {
    die(json_encode(['success' => false, 'message' => '파일이 없습니다.']));
}

$filename = $file['name'];
$file_ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

if (!in_array($file_ext, $allowed_types)) {
    die(json_encode(['success' => false, 'message' => '지원하지 않는 파일 형식입니다.']));
}

// 파일 크기 검사 (50MB)
if ($file['size'] > 50 * 1024 * 1024) {
    die(json_encode(['success' => false, 'message' => '파일 크기가 너무 큽니다. (최대 50MB)']));
}

$save_filename = $uid.'_'.time().'.'.$file_ext;
$save_filepath = $upload_dir.'/'.$save_filename;

if (move_uploaded_file($file['tmp_name'], $save_filepath)) {
    @chmod($save_filepath, T2EDITOR_FILE_PERMISSION);
    
    die(json_encode([
        'success' => true,
        'file' => [
            'url' => $upload_url.'/'.$save_filename,
            'original_name' => $filename,
            'size' => $file['size'],
            'type' => $file_ext
        ]
    ]));
} else {
    die(json_encode(['success' => false, 'message' => '파일 업로드에 실패했습니다.']));
}
?>