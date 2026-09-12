<?php
// 파일 권한 확인 및 설정 함수
function check_and_set_permission($file_path) {
    if (file_exists($file_path)) {
        // 현재 파일 권한 확인
        $current_perm = substr(sprintf('%o', fileperms($file_path)), -3);
        
        // 권한이 755가 아니면 설정
        if ($current_perm != '755') {
            // 755 권한 설정 (소유자:읽기,쓰기,실행 / 그룹:읽기,실행 / 기타:읽기,실행)
            @chmod($file_path, 0755);
        }
    }
    return true;
}

// 현재 스크립트의 경로 확인
$current_script_path = __FILE__;

// 권한 확인 및 설정
check_and_set_permission($current_script_path);

// Get user ID from POST data
$uid = isset($_POST['uid']) ? $_POST['uid'] : '';
if (!$uid) {
    die(json_encode(['success' => false, 'message' => '잘못된 접근입니다.']));
}

// Maintain your original base data folder but add date subfolder like image_upload.php
$date_folder = date('ymd'); // Create YYMMDD format folder
$base_upload_dir = __DIR__ . '/data';
$upload_dir = $base_upload_dir . '/' . $date_folder;
$upload_url = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\') . '/data/' . $date_folder;

// Create base data directory if it doesn't exist
if (!is_dir($base_upload_dir)) {
    @mkdir($base_upload_dir, 0755, true);
    @chmod($base_upload_dir, 0755);
}

// Create date folder inside data directory if it doesn't exist
if (!is_dir($upload_dir)) {
    @mkdir($upload_dir, 0755, true);
    @chmod($upload_dir, 0755);
}

$uploaded_files = [];
$file_count = count($_FILES['bf_file']['name']);
$webp_quality = 85; // WebP conversion quality

for ($i = 0; $i < $file_count; $i++) {
    $file = $_FILES['bf_file']['tmp_name'][$i];
    $filename = $_FILES['bf_file']['name'][$i];
    
    // Skip if filename is not set or empty
    if (!isset($filename) || empty($filename)) {
        continue;
    }
    
    // Check for valid image extensions
    if (!preg_match("/\.(jpg|jpeg|gif|png|webp)$/i", $filename)) {
        continue;
    }
    
    // Get file extension
    $file_ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    // Create a temporary file path
    $temp_filepath = $upload_dir . '/temp_' . $uid . '_' . $i . '.' . $file_ext;
    
    // Move the uploaded file to temp location
    if (!move_uploaded_file($file, $temp_filepath)) {
        continue;
    }
    
    // Validate that it's a real image
    $image_info = @getimagesize($temp_filepath);
    if (!$image_info) {
        @unlink($temp_filepath);
        continue;
    }
    
    // If already WebP, just rename it
    if ($file_ext === 'webp') {
        $save_filename = $uid . '_' . $i . '.webp';
        $save_filepath = $upload_dir . '/' . $save_filename;
        
        if (@rename($temp_filepath, $save_filepath)) {
            @chmod($save_filepath, 0755);
            $uploaded_files[] = [
                'url' => $upload_url . '/' . $save_filename,
                'width' => $image_info[0],
                'height' => $image_info[1]
            ];
        } else {
            @unlink($temp_filepath);
        }
        continue;
    }
    
    // Try to convert to WebP
    $save_filename = $uid . '_' . $i . '.webp';
    $save_filepath = $upload_dir . '/' . $save_filename;
    $success = false;
    $src_image = null;
    
    // Create image resource based on file type
    switch ($file_ext) {
        case 'jpg':
        case 'jpeg':
            $src_image = @imagecreatefromjpeg($temp_filepath);
            break;
        case 'png':
            $src_image = @imagecreatefrompng($temp_filepath);
            if ($src_image) {
                imagepalettetotruecolor($src_image);
                imagealphablending($src_image, false);
                imagesavealpha($src_image, true);
            }
            break;
        case 'gif':
            $src_image = @imagecreatefromgif($temp_filepath);
            break;
    }
    
    // Try to convert and save as WebP
    if ($src_image) {
        $success = @imagewebp($src_image, $save_filepath, $webp_quality);
        imagedestroy($src_image);
        
        if ($success) {
            @chmod($save_filepath, 0755);
            $uploaded_files[] = [
                'url' => $upload_url . '/' . $save_filename,
                'width' => $image_info[0],
                'height' => $image_info[1]
            ];
            @unlink($temp_filepath);
            continue;
        }
    }
    
    // Fallback to original format if WebP conversion fails
    $org_save_filename = $uid . '_' . $i . '.' . $file_ext;
    $org_save_filepath = $upload_dir . '/' . $org_save_filename;
    
    if (@rename($temp_filepath, $org_save_filepath)) {
        @chmod($org_save_filepath, 0755);
        $uploaded_files[] = [
            'url' => $upload_url . '/' . $org_save_filename,
            'width' => $image_info[0],
            'height' => $image_info[1]
        ];
    } else {
        @unlink($temp_filepath);
    }
}

// Return results
if (empty($uploaded_files)) {
    die(json_encode(['success' => false, 'message' => '업로드된 이미지가 없습니다.']));
}

die(json_encode([
    'success' => true,
    'files' => $uploaded_files
]));
?>