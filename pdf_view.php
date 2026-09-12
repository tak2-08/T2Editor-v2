<?php
include_once('../../../common.php');

// PDF 원본 다운로드 메뉴 활성화 여부 설정 (true: 활성화, false: 비활성화)
$pdf_download_enabled = true; // 필요에 따라 false로 변경 가능

// URL에서 PDF 파일명 가져오기
$pdf_file = isset($_GET['pdf']) ? $_GET['pdf'] : '';
if (empty($pdf_file)) {
    die('PDF 파일이 지정되지 않았습니다.');
}

$parts = explode('/', $pdf_file);
if (count($parts) !== 2) {
    die('잘못된 파일 경로입니다.');
}

$date_part = $parts[0];
$filename_part = $parts[1];

$pdf_path = G5_DATA_PATH . '/editor/t2editor_' . $date_part . '/' . $filename_part;
$pdf_url = G5_DATA_URL . '/editor/t2editor_' . $date_part . '/' . $filename_part;

// 파일 존재 확인
if (!file_exists($pdf_path)) {
    die('PDF 파일을 찾을 수 없습니다.');
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>PDF 뷰어 - T2Editor</title>
    <script src="<?php echo G5_PLUGIN_URL ?>/editor/t2editor/js/pdf.min.js"></script>
    <script src="<?php echo G5_PLUGIN_URL ?>/editor/t2editor/js/jszip.min.js"></script>
    <style>
@font-face{font-family:'Material Icons';font-style:normal;font-weight:400;src:url('<?php echo G5_PLUGIN_URL ?>/editor/t2editor/fonts/material-icons/MaterialIcons-Regular.eot');src:local('Material Icons'),local('MaterialIcons-Regular'),url('<?php echo G5_PLUGIN_URL ?>/editor/t2editor/fonts/material-icons/MaterialIcons-Regular.woff2') format('woff2'),url('<?php echo G5_PLUGIN_URL ?>/editor/t2editor/fonts/material-icons/MaterialIcons-Regular.woff') format('woff'),url('<?php echo G5_PLUGIN_URL ?>/editor/t2editor/fonts/material-icons/MaterialIcons-Regular.ttf') format('truetype')}.material-icons{font-family:'Material Icons';font-weight:400;font-style:normal;font-size:24px;display:inline-block;line-height:1;text-transform:none;letter-spacing:normal;word-wrap:normal;white-space:nowrap;direction:ltr;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale;font-feature-settings:'liga'}:root{--system-gray:#8E8E93;--system-background:#FFF;--system-secondary:#F2F2F7;--system-tertiary:#E5E5EA;--system-label:#000;--toolbar-blur:saturate(180%) blur(20px)}body.dark{--system-gray:#98989D;--system-background:#000;--system-secondary:#1C1C1E;--system-tertiary:#2C2C2E;--system-label:#FFF}*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;background-color:var(--system-background);color:var(--system-label);line-height:1.5;transition:background-color 0.3s,color 0.3s}.toolbar{position:fixed;top:env(safe-area-inset-top,0);left:0;right:0;height:44px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;background-color:rgba(var(--system-background),.8);backdrop-filter:var(--toolbar-blur);-webkit-backdrop-filter:var(--toolbar-blur);z-index:1000}.toolbar-group{display:flex;align-items:center;background-color:var(--system-secondary);border-radius:10px;padding:4px;gap:4px}.btn{border:none;background:none;padding:6px 12px;border-radius:8px;font-size:15px;color:var(--system-label);font-weight:500;cursor:pointer;transition:background-color 0.2s ease;display:flex;align-items:center;justify-content:center;min-width:32px;height:28px}.btn:hover{background-color:var(--system-tertiary)}.btn:active{background-color:var(--system-gray);transform:scale(.97)}.btn:disabled{opacity:.5;cursor:default}.page-info{font-size:15px;color:var(--system-label);padding:6px 12px;border-radius:8px}.zoom-level{font-size:13px;color:var(--system-gray);min-width:48px;text-align:center}.viewer-container{margin-top:calc(44px + env(safe-area-inset-top, 0));padding:20px;display:flex;justify-content:center;min-height:calc(100vh - 44px - env(safe-area-inset-top, 0));background-color:var(--system-secondary)}#pdf-viewer{background-color:var(--system-background);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:100%;height:auto}.loading{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:rgba(0,0,0,.7);color:#fff;padding:12px 24px;border-radius:12px;font-size:15px;font-weight:500;z-index:2000;display:flex;align-items:center;gap:8px}.loading::after{content:'';width:16px;height:16px;border:2px solid #fff;border-right-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@supports (-webkit-touch-callout:none){.toolbar{padding-top:env(safe-area-inset-top);height:calc(44px + env(safe-area-inset-top))}.viewer-container{margin-top:calc(44px + env(safe-area-inset-top));padding-bottom:env(safe-area-inset-bottom)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}#pdf-viewer.page-transition{animation:fadeIn 0.2s ease-out}.dropdown{position:relative;display:inline-block}.dropdown-menu{display:none;position:absolute;top:100%;right:0;min-width:160px;background-color:var(--system-background);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.12);padding:8px 0;margin-top:8px;animation:dropdownFadeIn 0.2s ease-out;z-index:1001}.dropdown-menu.show{display:block}.dropdown-item{display:block;width:100%;padding:8px 16px;border:none;background:none;font-size:15px;color:var(--system-label);text-align:left;cursor:pointer;transition:background-color 0.2s ease}.dropdown-item:hover{background-color:var(--system-secondary)}@keyframes dropdownFadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@media (max-width:428px){.toolbar{padding:0 8px}.toolbar-group{padding:2px}.btn{padding:4px 8px;min-width:28px;height:24px;font-size:14px}.page-info{font-size:14px;padding:4px 8px}.viewer-container{padding:12px}}.floating-theme{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background-color:var(--system-secondary);color:var(--system-label);border:none;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);z-index:1000;cursor:pointer}
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="toolbar-group">
            <button id="prev-page" class="btn" aria-label="이전 페이지">‹</button>
            <span class="page-info">
                <span id="current-page">0</span>/<span id="total-pages">0</span>
            </span>
            <button id="next-page" class="btn" aria-label="다음 페이지">›</button>
        </div>
        <div class="toolbar-group">
            <button id="zoom-out" class="btn" aria-label="축소">−</button>
            <span id="zoom-level" class="zoom-level">100%</span>
            <button id="zoom-in" class="btn" aria-label="확대">+</button>
        </div>
        <div class="toolbar-group">
            <div class="dropdown">
                <button id="save-image" class="btn" aria-label="이미지로 저장">
                    <span class="material-icons">download</span>
                </button>
                <div class="dropdown-menu">
                    <button class="dropdown-item" id="save-current">현재 페이지 저장</button>
                    <button class="dropdown-item" id="save-all">전체 페이지 저장</button>
                    <?php if ($pdf_download_enabled): ?>
                        <a class="dropdown-item" href="<?php echo $pdf_url; ?>" download>원본 다운로드</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    <div class="viewer-container">
        <canvas id="pdf-viewer"></canvas>
    </div>
    <div class="loading" style="display: none;">로딩중</div>
    
    <!-- 하단 오른쪽 플로팅 다크모드 버튼 -->
    <button id="toggle-theme" class="floating-theme" aria-label="테마 전환">
        <span class="material-icons">dark_mode</span>
    </button>

    <script>
        // 테마 토글 로직
        const toggleThemeButton = document.getElementById('toggle-theme');
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');
        setTheme(currentTheme);

        toggleThemeButton.addEventListener('click', () => {
            const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
            setTheme(newTheme);
        });

        function setTheme(theme) {
            if (theme === 'dark') {
                document.body.classList.add('dark');
                toggleThemeButton.innerHTML = '<span class="material-icons">light_mode</span>';
            } else {
                document.body.classList.remove('dark');
                toggleThemeButton.innerHTML = '<span class="material-icons">dark_mode</span>';
            }
            localStorage.setItem('theme', theme);
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = '<?php echo G5_PLUGIN_URL ?>/editor/t2editor/js/pdf.worker.min.js';

        let pdfDoc = null;
        let pageNum = 1;
        let scale = 1.0;
        const canvas = document.getElementById('pdf-viewer');
        const ctx = canvas.getContext('2d');
        const loadingIndicator = document.querySelector('.loading');

        async function loadPDF() {
            try {
                loadingIndicator.style.display = 'flex';
                pdfDoc = await pdfjsLib.getDocument('<?php echo $pdf_url; ?>').promise;
                document.getElementById('total-pages').textContent = pdfDoc.numPages;
                renderPage(pageNum);
            } catch (error) {
                console.error('PDF 로드 실패:', error);
                alert('PDF를 불러올 수 없습니다.');
            } finally {
                loadingIndicator.style.display = 'none';
            }
        }

        async function renderPage(num) {
            try {
                loadingIndicator.style.display = 'flex';
                const page = await pdfDoc.getPage(num);
                
                const viewport = page.getViewport({ scale });
                const clientWidth = document.querySelector('.viewer-container').clientWidth - 40;
                const clientScale = clientWidth / viewport.width;
                const adjustedScale = scale * Math.min(clientScale, 1);
                const adjustedViewport = page.getViewport({ scale: adjustedScale });

                canvas.width = adjustedViewport.width;
                canvas.height = adjustedViewport.height;

                canvas.classList.add('page-transition');
                
                await page.render({
                    canvasContext: ctx,
                    viewport: adjustedViewport
                }).promise;

                document.getElementById('current-page').textContent = num;
                document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;

                document.getElementById('prev-page').disabled = num <= 1;
                document.getElementById('next-page').disabled = num >= pdfDoc.numPages;
                
                setTimeout(() => {
                    canvas.classList.remove('page-transition');
                }, 200);
            } catch (error) {
                console.error('페이지 렌더링 실패:', error);
                alert('페이지를 표시할 수 없습니다.');
            } finally {
                loadingIndicator.style.display = 'none';
            }
        }

        document.getElementById('prev-page').addEventListener('click', () => {
            if (pageNum <= 1) return;
            pageNum--;
            renderPage(pageNum);
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (pageNum >= pdfDoc.numPages) return;
            pageNum++;
            renderPage(pageNum);
        });

        document.getElementById('zoom-in').addEventListener('click', () => {
            if (scale >= 3.0) return;
            scale += 0.25;
            renderPage(pageNum);
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            if (scale <= 0.25) return;
            scale -= 0.25;
            renderPage(pageNum);
        });

        let touchStartX = null;
        let touchStartY = null;
        let touchStartTime = null;
        
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        });

        canvas.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY || !touchStartTime) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            const deltaX = touchStartX - touchEndX;
            const deltaY = touchStartY - touchEndY;
            const deltaTime = touchEndTime - touchStartTime;
            
            if (deltaTime < 300) {
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    if (deltaX > 0 && pageNum < pdfDoc.numPages) {
                        pageNum++;
                        renderPage(pageNum);
                    } else if (deltaX < 0 && pageNum > 1) {
                        pageNum--;
                        renderPage(pageNum);
                    }
                }
            }
            
            touchStartX = null;
            touchStartY = null;
            touchStartTime = null;
        });

        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    if (pageNum > 1) {
                        pageNum--;
                        renderPage(pageNum);
                    }
                    break;
                case 'ArrowRight':
                    if (pageNum < pdfDoc.numPages) {
                        pageNum++;
                        renderPage(pageNum);
                    }
                    break;
                case '+':
                case '=':
                    if (scale < 3.0) {
                        scale += 0.25;
                        renderPage(pageNum);
                    }
                    break;
                case '-':
                    if (scale > 0.25) {
                        scale -= 0.25;
                        renderPage(pageNum);
                    }
                    break;
            }
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                renderPage(pageNum);
            }, 200);
        });

        async function saveAsJPEG(canvas, filename) {
            const jpegUrl = canvas.toDataURL('image/jpeg', 0.8);
            const link = document.createElement('a');
            link.href = jpegUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        async function saveCurrentPage() {
            const filename = `page_${pageNum}.jpg`;
            await saveAsJPEG(canvas, filename);
        }

        async function saveAllPages() {
            const zip = new JSZip();
            const loadingIndicator = document.querySelector('.loading');
            loadingIndicator.style.display = 'flex';
            loadingIndicator.textContent = '이미지 변환 중...';

            try {
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    loadingIndicator.textContent = `페이지 변환 중 (${i}/${pdfDoc.numPages})`;
                    const page = await pdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 1.0 });
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = viewport.width;
                    tempCanvas.height = viewport.height;
                    
                    await page.render({
                        canvasContext: tempCanvas.getContext('2d'),
                        viewport: viewport
                    }).promise;

                    const jpegData = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    zip.file(`page_${i}.jpg`, jpegData, {base64: true});
                }

                loadingIndicator.textContent = '파일 생성 중...';
                const zipContent = await zip.generateAsync({type: 'blob'});
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipContent);
                link.download = 'pdf_images.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } catch (error) {
                console.error('변환 실패:', error);
                alert('이미지 변환 중 오류가 발생했습니다.');
            } finally {
                loadingIndicator.style.display = 'none';
                loadingIndicator.textContent = '로딩중';
            }
        }

        const saveImageBtn = document.getElementById('save-image');
        const dropdownMenu = document.querySelector('.dropdown-menu');
        
        saveImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                dropdownMenu.classList.remove('show');
            }
        });

        document.getElementById('save-current').addEventListener('click', saveCurrentPage);
        document.getElementById('save-all').addEventListener('click', saveAllPages);

        loadPDF();
    </script>
</body>
</html>
