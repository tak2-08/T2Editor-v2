<?php
include 'config/t2_config.php';
//Path: T2Editor/editor.lib.php

// HTML 편집 기능 설정 (true: 활성화, false: 비활성화)
define('T2EDITOR_ENABLE_HTML_EDIT', true);

// 라이선스 검증 함수
function _t2e_get_hash($s) { return hash('sha256', $s); }
function _t2e_x($s) { return base64_decode($s); }
function _t2e_enc($d) { return base64_encode($d); }

$_t2e_v = array(
    _t2e_x('VDJFZGl0b3IgTGljZW5zZQ=='),
    _t2e_x('VmVyc2lvbjogMS4w'),
    _t2e_x('Q29weXJpZ2h0IChjKSAyMDI1IFRhazIgKGRzY2x1Yi5rcik=')
);

$_t2e_h = array(
    _t2e_x('MzE5MzIxMzIxMzEyMw=='),
    _t2e_x('OTg3NDMyMTMyMTMy'),
    _t2e_x('NTQzMjE0MzIxMzIx')
);

function _t2e_check_integrity($c, $k) {
    global $_t2e_v, $_t2e_h;
    $v = $_t2e_v;
    $h = $_t2e_h;
    return strpos($c, $v[$k]) !== false;
}

function _t2e_validate_file($f) {
    if (!file_exists($f)) return false;
    $c = file_get_contents($f);
    for ($i = 0; $i < 3; $i++) {
        if (!_t2e_check_integrity($c, $i)) return false;
    }
    return true;
}

function _t2e_get_status() {
    $p = T2EDITOR_PATH.'/';
    $f1 = $p.'License_en.txt';
    $f2 = $p.'License_ko.txt';
    
    if (!_t2e_validate_file($f1) || !_t2e_validate_file($f2)) {
        return array(false, '라이선스 검증 실패');
    }
    return array(true, '');
}

//푸른산타(bodr)님의 게시판 관리자모드 에러 수정버전 (업데이트:2025.06.02)
function get_readme_version() {
    $readme_path = T2EDITOR_PATH . '/readme.txt';
    if (file_exists($readme_path)) {
        $content = file_get_contents($readme_path);
        if (preg_match('/ver_([0-9.]+)/', $content, $matches)) {
            return $matches[1];
        }
    }
    return 'readme.txt 오류! 재설치 해주세요.';
}
//푸른산타님(bodr)의 게시판 관리자모드 에러 수정버전 (원본)
/**
*if (!function_exists('get_readme_version')) {
*    function get_readme_version() {
*        $readme_path = G5_PLUGIN_PATH . '/editor/t2editor/readme.txt';
*        if (file_exists($readme_path)) {
*            $content = file_get_contents($readme_path);
*            if (preg_match('/ver_([0-9.]+)/', $content, $matches)) {
*                return $matches[1];
*            }
*        }
*        return 'readme.txt 오류! 재설치 해주세요.';
*    }
*}
*/

function editor_html($id, $content, $is_dhtml_editor=true) {
    global $g5, $config;
    static $js = true;

    // 라이선스 검증
    list($valid, $msg) = _t2e_get_status();
    if (!$valid) {
        return '<div class="alert alert-danger"><strong>Error:</strong> '.$msg.'</div>';
    }

    $editor_url = T2EDITOR_URL;
    $html = "<span class=\"sound_only\">웹에디터 시작</span>";
    
    if ($js) {
        // css 파일 로드
        $html .= "\n<link href=\"{$editor_url}/css/core.css\" rel=\"stylesheet\">";
        $html .= "\n<link href=\"{$editor_url}/css/dark.css\" rel=\"stylesheet\" id=\"t2editor-dark-css\">";
        
        // 자바스크립트 파일 로드
        $html .= "\n<script src=\"{$editor_url}/js/utils.js\"></script>";
        $html .= "\n<script src=\"{$editor_url}/js/core.js\"></script>";
        
        // 플러그인 로드
        $plugins = ['image', 'video', 'file', 'table', 'code', 'link', 'export'];
        foreach ($plugins as $plugin) {
            $html .= "\n<script src=\"{$editor_url}/plugin/{$plugin}/{$plugin}.js\"></script>";
        }
        
        $js = false;
    }

    if ($is_dhtml_editor) {
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $escaped_content = str_replace(
            array("\\", "'", "\r", "\n"),
            array("\\\\", "\\'", "\\r", "\\n"),
            $content
        );
        
        ob_start(); ?>
<script>
const t2editor_url = <?php echo json_encode(T2EDITOR_URL ?? ""); ?>;
const t2editor_html_edit_enabled = <?php echo T2EDITOR_ENABLE_HTML_EDIT ? 'true' : 'false'; ?>;
</script>
<?php
// 안드로이드 환경에서 CDN으로 Material Icons 로드
//안드로이드에서 자체 호스팅하는 아이콘 출력 불가 문제 발생
if (isset($_SERVER['HTTP_USER_AGENT']) && stripos($_SERVER['HTTP_USER_AGENT'], 'Android') !== false) {
    echo '<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">' . "\n";
    echo '<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">' . "\n";
}
?>

<!-- 다크모드 초기화 스크립트 -->
<script>
(function() {
    // 다크모드 설정 옵션
    const T2EditorConfig = {
        enableDarkModeButton: true,    // 다크모드 버튼 활성화 여부
        forcedTheme: null              // 강제 테마 설정 (null: 강제 설정 없음, 'light': 라이트모드 강제, 'dark': 다크모드 강제)
    };
    
    if (!T2EditorConfig.enableDarkModeButton && T2EditorConfig.forcedTheme) {
        document.documentElement.setAttribute('data-t2editor-theme', T2EditorConfig.forcedTheme);
        localStorage.setItem('t2editor-dark-mode', T2EditorConfig.forcedTheme === 'dark');
    } else {
        var isDarkMode = localStorage.getItem('t2editor-dark-mode') === 'true';
        
        if (isDarkMode === null) {
            isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        
        if (isDarkMode) {
            document.documentElement.setAttribute('data-t2editor-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-t2editor-theme', 'light');
        }
    }
    
    document.addEventListener('DOMContentLoaded', function() {
        var darkModeToggle = document.querySelector('.t2-dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.style.display = T2EditorConfig.enableDarkModeButton ? 'flex' : 'none';
        }
    });
})();
</script>

<!-- Material Icons 폰트 로딩 -->
<style>
@font-face {
  font-family: "Material Icons";
  font-style: normal;
  font-weight: 400;
  src: url("<?php echo T2EDITOR_URL ?>/fonts/material-icons/MaterialIcons-Regular.eot");
  src: local("Material Icons"),
       url("<?php echo T2EDITOR_URL ?>/fonts/material-icons/MaterialIcons-Regular.woff2") format("woff2"),
       url("<?php echo T2EDITOR_URL ?>/fonts/material-icons/MaterialIcons-Regular.woff") format("woff"),
       url("<?php echo T2EDITOR_URL ?>/fonts/material-icons/MaterialIcons-Regular.ttf") format("truetype");
  font-display: swap;
}
.material-icons {
  font-family: "Material Icons";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-feature-settings: "liga";
  font-feature-settings: "liga";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  -moz-osx-font-smoothing: grayscale;
}

@font-face {
  font-family: "Material Icons Outlined";
  font-style: normal;
  font-weight: 400;
  src: url("<?php echo T2EDITOR_URL ?>/fonts/material-icons/MaterialIconsOutlined-Regular.woff2") format("woff2"),
       url("<?php echo T2EDITOR_URL ?>/fonts/material-icons/MaterialIconsOutlined-Regular.ttf") format("truetype");
  font-display: swap;
}

.material-icons-outlined {
  font-family: "Material Icons Outlined";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: "liga";
  font-feature-settings: "liga";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
</style>

<div class="t2-editor-container" id="<?php echo $id ?>_container">
    <div class="t2-toolbar">
        <button class="t2-btn" data-command="undo" disabled>
            <span class="material-icons">undo</span>
        </button>
        <button class="t2-btn" data-command="redo" disabled>
            <span class="material-icons">redo</span>
        </button>
        <button class="t2-btn" data-command="fontSize">
            <span class="material-icons">format_size</span>
        </button>
        <button class="t2-btn" data-command="bold">
            <span class="material-icons">format_bold</span>
        </button>
        <button class="t2-btn" data-command="italic">
            <span class="material-icons">format_italic</span>
        </button>
        <button class="t2-btn" data-command="underline">
            <span class="material-icons">format_underlined</span>
        </button>
        <button class="t2-btn" data-command="strikeThrough">
            <span class="material-icons">format_strikethrough</span>
        </button>
        <button class="t2-btn" data-command="justifyContent">
            <span class="material-icons">format_align_left</span>
        </button>
        <button class="t2-btn" data-command="foreColor">
            <span class="material-icons">format_color_text</span>
        </button>
        <button class="t2-btn" data-command="backColor">
            <span class="material-icons">format_color_fill</span>
        </button>
        <button class="t2-btn" data-command="insertImage">
            <span class="material-icons">image</span>
        </button>
        <button class="t2-btn" data-command="insertYouTube" style="color:#f04f48">
            <span class="material-icons">smart_display</span>
        </button>
        <button class="t2-btn" data-command="attachFile">
            <span class="material-icons">attach_file</span>
        </button>
        <button class="t2-btn" data-command="createLink">
            <span class="material-icons">link</span>
        </button>
        <button class="t2-btn" data-command="insertTable">
            <span class="material-icons-outlined">table_chart</span>
        </button>
        <button class="t2-btn" data-command="insertCodeBlock">
            <span class="material-icons">code</span>
        </button>
        <button class="t2-btn" data-command="exportHTML">
            <span class="material-icons-outlined">ios_share</span>
        </button>
    </div>
    <div class="t2-editor" contenteditable="true" id="<?php echo $id ?>_editor"></div>
    <!-- HTML 편집 모드용 textarea (처음에는 숨김) -->
    <textarea class="t2-html-editor" id="<?php echo $id ?>_html_editor" style="display:none;"></textarea>
    <textarea name="<?php echo $id ?>" id="<?php echo $id ?>" style="display:none;">
<?php echo $content ?>
    </textarea>
    <div class="t2-editor-status">
        <div class="t2-status-left">
            <a href="//dsclub.kr/service/editor">
                <div class="t2-logo">
                    <span class="t2-logo-prefix">T2</span>
                    <span class="t2-logo-suffix">Editor</span>
                </div>
            </a>
        </div>        
        <!-- 다크모드 토글 -->
        <div class="t2-dark-mode-toggle">
            <button type="button" class="t2-dark-mode-btn" onclick="toggleT2EditorTheme(event)">
                <span class="material-icons t2-dark-mode-icon">dark_mode</span>
                <span class="material-icons t2-light-mode-icon">light_mode</span>
            </button>
        </div>
        <div class="t2-char-count">
            txt: <span>0</span>
        </div>
    </div>
    <span style="color: #999; position: absolute; right: 5px; margin:5px 0; font-size: 11px; font-weight: 500; display: flex; align-items: center;">
        <i class="material-icons-outlined" style="margin-right: 4px; font-size: 14px">info</i>
        <?php echo (strpos($v = get_readme_version(), '오류') !== false) ? $v : "T2Editor Ver $v"; ?>
    </span>
</div>

        <!-- HTML 편집 토글 (설정이 활성화된 경우에만 표시) -->
        <?php if (T2EDITOR_ENABLE_HTML_EDIT): ?>
        <div class="t2-html-edit-toggle">
            <label class="t2-switch">
                <input type="checkbox" id="<?php echo $id ?>_html_toggle">
                <span class="t2-slider"></span>
            </label>
            <span class="t2-html-edit-text">edit for HTML</span>
        </div>
        <?php endif; ?>

<script>
// 다크모드 토글 함수
function toggleT2EditorTheme(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const currentTheme = document.documentElement.getAttribute('data-t2editor-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-t2editor-theme', newTheme);
    localStorage.setItem('t2editor-dark-mode', newTheme === 'dark');
}

// 에디터 초기화
(function() {
    // 전역 변수 설정
    //window.g5_url = '<?php echo G5_URL; ?>'; g5_url은 t2editor_url에 의해 대체됨
    
    const editor = new T2Editor(document.getElementById('<?php echo $id ?>_container'));
    window.<?php echo $id ?>_editor = editor;
    
    // HTML 편집 기능 초기화
    if (t2editor_html_edit_enabled) {
        editor.initHtmlEditMode('<?php echo $id ?>');
    }
    
    // 컨텐츠 로드
    if ('<?php echo $escaped_content ?>') {
        try {
            var contentToLoad = '<?php echo $escaped_content ?>';
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentToLoad;
            
            // 중복 줄바꿈 제거
            var nodes = Array.from(tempDiv.childNodes);
            for (let i = nodes.length - 1; i >= 0; i--) {
                let current = nodes[i];
                if (current.nodeType === Node.ELEMENT_NODE && current.tagName === 'P' && !current.textContent.trim() && current.querySelector('br')) {
                    let prev = i > 0 ? nodes[i - 1] : null;
                    let next = i < nodes.length - 1 ? nodes[i + 1] : null;
                    
                    if ((prev && prev.classList?.contains('t2-media-block')) || 
                        (next && next.classList?.contains('t2-media-block'))) {
                        current.remove();
                    }
                }
            }
            
            // 기존 table-responsive 구조를 t2-table-wrapper로 변환
            tempDiv.querySelectorAll('.table-responsive').forEach(function(responsiveWrapper) {
                var table = responsiveWrapper.querySelector('table');
                if (table) {
                    if (!table.classList.contains('t2-table')) {
                        table.classList.add('t2-table');
                    }
                    
                    var isLargeTable = table.classList.contains('t2-table-large') || 
                                      (table.rows.length > 10 || (table.rows[0] && table.rows[0].cells.length > 10));
                    if (isLargeTable && !table.classList.contains('t2-table-large')) {
                        table.classList.add('t2-table-large');
                    }
                    
                    var tableWrapper = document.createElement('div');
                    tableWrapper.className = 't2-table-wrapper';
                    tableWrapper.contentEditable = false;
                    
                    responsiveWrapper.parentNode.insertBefore(tableWrapper, responsiveWrapper);
                    
                    if (isLargeTable) {
                        var scrollWrapper = document.createElement('div');
                        scrollWrapper.className = 't2-table-scroll-wrapper';
                        tableWrapper.appendChild(scrollWrapper);
                        scrollWrapper.appendChild(table);
                    } else {
                        tableWrapper.appendChild(table);
                    }
                    
                    responsiveWrapper.remove();
                }
            });
            
            editor.setContent(tempDiv.innerHTML);
            
            // 초기화 완료 후 처리
            setTimeout(function() {
                editor.normalizeContent();
                
                // 플러그인들에게 컨텐츠 로드 완료 알림
                for (let [name, plugin] of editor.plugins) {
                    if (plugin.onContentSet) {
                        plugin.onContentSet(tempDiv.innerHTML);
                    }
                }
            }, 100);
        } catch (e) {
            console.error('에디터 초기화 오류:', e);
        }
    }
})();
</script>
<?php
        $html .= ob_get_clean();
    } else {
        $html .= "\n<textarea id=\"{$id}\" name=\"{$id}\" style=\"width:100%;height:300px\">{$content}</textarea>";
    }
    
    return $html;
}

function get_editor_js($id, $is_dhtml_editor=true) {
    if ($is_dhtml_editor) {
        // PHP 상수를 JavaScript에서 사용할 수 있도록 미리 처리
        $t2editor_url = T2EDITOR_URL;
        
        return "
var _submitContent = function() {
    var editorContent;
    
    // HTML 편집 모드인지 확인
    var htmlEditor = document.getElementById('{$id}_html_editor');
    var visualEditor = document.getElementById('{$id}_editor');
    
    if (htmlEditor && htmlEditor.style.display !== 'none') {
        // HTML 편집 모드인 경우 textarea의 내용 사용
        editorContent = htmlEditor.value;
    } else {
        // 일반 모드인 경우 에디터 내용 사용
        editorContent = visualEditor.innerHTML;
    }
    
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorContent;
    
    // 파일 블록 처리
    tempDiv.querySelectorAll('.t2-file-block').forEach(function(block) {
        const controls = block.querySelector('.t2-media-controls');
        if (controls) {
            controls.remove();
        }
    });
    
    // 미디어 블록 처리
    tempDiv.querySelectorAll('.t2-media-block').forEach(function(block) {
        var container = block.querySelector('div:first-child');
        var mediaElement = container.querySelector('iframe, video, img');
        if (mediaElement) {
            mediaElement.style.width = container.style.width;
            if (container.style.height) {
                mediaElement.style.height = container.style.height;
            }
            
            var controls = block.querySelector('.t2-media-controls');
            if (controls) {
                controls.remove();
            }
        }
    });
    
    // 테이블 래퍼 및 컨트롤 처리
    tempDiv.querySelectorAll('.t2-table-wrapper').forEach(function(wrapper) {
        const table = wrapper.querySelector('table');
        if (table) {
            const controls = wrapper.querySelector('.t2-table-controls');
            if (controls) {
                controls.remove();
            }
            
            const downloadBtn = wrapper.querySelector('.t2-table-download-btn');
            if (downloadBtn) {
                downloadBtn.remove();
            }
            
            const isLargeTable = table.classList.contains('t2-table-large') || 
                               (table.rows.length > 10 || (table.rows[0] && table.rows[0].cells.length > 10));
                               
            const hasScrollWrapper = wrapper.querySelector('.t2-table-scroll-wrapper');
            
            if (isLargeTable || hasScrollWrapper) {
                const scrollContainer = document.createElement('div');
                scrollContainer.className = 'table-responsive';
                scrollContainer.style.cssText = 'display:block; width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch;';
                
                wrapper.parentNode.insertBefore(scrollContainer, wrapper);
                
                if (hasScrollWrapper) {
                    hasScrollWrapper.parentNode.insertBefore(table, hasScrollWrapper);
                    hasScrollWrapper.remove();
                }
                
                scrollContainer.appendChild(table);
                wrapper.remove();
            } else {
                wrapper.parentNode.insertBefore(table, wrapper);
                wrapper.remove();
            }
        }
    });
    
    // 코드 블록 처리
    tempDiv.querySelectorAll('.t2-code-block').forEach(function(block) {
        const toolbar = block.querySelector('.t2-code-toolbar');
        if (toolbar) {
            toolbar.remove();
        }
    });
    
    // 빈 문단 처리
    tempDiv.querySelectorAll('p').forEach(function(p) {
        if (!p.textContent.trim() && !p.querySelector('img, iframe, video')) {
            if (!p.querySelector('br')) {
                p.innerHTML = '<br>';
            }
        }
    });

    // 컨텐츠 스타일 추가
    var contentStyle = '<link href=\"{$t2editor_url}/css/content.css\" rel=\"stylesheet\">';
    
    var finalContent = tempDiv.innerHTML;
    
    if (finalContent.indexOf('t2-media-block') !== -1 || finalContent.indexOf('t2-table') !== -1 || finalContent.indexOf('t2-code-block') !== -1) {
        finalContent += contentStyle;
    }
    
    document.getElementById('{$id}').value = finalContent;
};
            _submitContent();\n";
    }
    return "var {$id}_editor = document.getElementById('{$id}');\n";
}

function chk_editor_js($id, $is_dhtml_editor=true) {
    if ($is_dhtml_editor) {
        return "
            var editorContent;
            var htmlEditor = document.getElementById('{$id}_html_editor');
            var visualEditor = document.getElementById('{$id}_editor');
            
            if (htmlEditor && htmlEditor.style.display !== 'none') {
                editorContent = htmlEditor.value;
            } else {
                editorContent = visualEditor.innerHTML;
            }
            
            function hasRealContent(html) {
                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                var textContent = tempDiv.textContent.trim();
                if (textContent) return true;
                
                if (tempDiv.querySelector('img, video, iframe')) return true;
                if (tempDiv.querySelector('.t2-file-block, .file-container')) return true;
                if (tempDiv.querySelector('table')) return true;
                
                return false;
            }
            
            if (!hasRealContent(editorContent)) { 
                alert('내용을 입력해 주십시오.'); 
                if (htmlEditor && htmlEditor.style.display !== 'none') {
                    htmlEditor.focus();
                } else {
                    visualEditor.focus();
                }
                return false; 
            }\n";
    }
    return "if (!{$id}_editor.value) { alert('내용을 입력해 주십시오.'); {$id}_editor.focus(); return false; }\n";
}
?>