class T2FilePlugin {
    constructor(editor) {
        this.editor = editor;
        this.commands = ['attachFile'];
        this.allowedTypes = ['zip', 'pdf', 'txt', 'mp3', 'm4a', 'mp4'];
    }

    handleCommand(command, button) {
        switch(command) {
            case 'attachFile':
                this.showFileUploadModal();
                break;
        }
    }

    onContentSet(html) {
        // 컨텐츠 설정 시 파일 블록 초기화
        setTimeout(() => {
            this.initializeFileBlocks();
        }, 100);
    }

    showFileUploadModal() {
        const modalContent = `
            <div class="t2-file-editor-modal">
                <h3>파일 첨부</h3>
                <div class="t2-file-upload-area">
                    <span class="material-icons">attach_file</span>
                    <div class="t2-file-upload-text">클릭하여 파일 선택</div>
                    <div class="t2-file-upload-hint">지원 형식: ZIP, PDF, TXT, MP3</div>
                    <input type="file" accept=".zip,.pdf,.txt,.mp3,.m4a,.mp4" />
                </div>
                <div class="t2-file-preview-grid"></div>
                <div class="t2-upload-progress" style="display: none;">
                    <div class="t2-progress-bar">
                        <div class="t2-progress-fill"></div>
                    </div>
                    <div class="t2-progress-text">파일 업로드 중...</div>
                </div>
                <div class="t2-btn-group">
                    <button class="t2-btn" data-action="cancel">취소</button>
                    <button class="t2-btn" data-action="upload" disabled>첨부</button>
                </div>
            </div>
        `;

        const modal = T2Utils.createModal(modalContent);
        this.setupFileModalEvents(modal);
    }

    setupFileModalEvents(modal) {
        const previewGrid = modal.querySelector('.t2-file-preview-grid');
        const fileInput = modal.querySelector('input[type="file"]');
        const uploadBtn = modal.querySelector('[data-action="upload"]');
        const uploadArea = modal.querySelector('.t2-file-upload-area');
        const progressBar = modal.querySelector('.t2-progress-fill');
        const progressContainer = modal.querySelector('.t2-upload-progress');
        const progressText = modal.querySelector('.t2-progress-text');
        
        let selectedFile = null;

        const handleFile = (file) => {
            if (!T2Utils.validateFile(file, this.allowedTypes)) {
                T2Utils.showNotification('지원하지 않는 파일 형식입니다.', 'error');
                return;
            }

            // 기존 미리보기 제거
            previewGrid.innerHTML = '';
            
            const previewItem = document.createElement('div');
            previewItem.className = 't2-file-preview-item';
            previewItem.innerHTML = `
                <div class="t2-file-preview-icon" style="background-color: ${T2Utils.getFileColor(file.name.split('.').pop())}"></div>
                <div class="t2-file-preview-name">${file.name}</div>
                <button type="button" class="t2-file-preview-remove">
                    <span class="material-icons">close</span>
                </button>
            `;

            const removeBtn = previewItem.querySelector('.t2-file-preview-remove');
            removeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedFile = null;
                previewItem.remove();
                uploadBtn.disabled = true;
                fileInput.value = '';
            };

            selectedFile = file;
            previewGrid.appendChild(previewItem);
            uploadBtn.disabled = false;
        };

        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        };

        // 드래그 앤 드롭 처리
        T2Utils.setupDragAndDrop(uploadArea, (files) => {
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        // 취소 버튼
        modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();
        
        // 업로드 버튼
        modal.querySelector('[data-action="upload"]').onclick = async () => {
            if (!selectedFile) return;
            
            uploadBtn.disabled = true;
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = '파일 업로드 중...';

            try {
                const formData = new FormData();
                formData.append('bf_file', selectedFile);
                formData.append('uid', this.editor.generateUid());

                const data = await T2Utils.request(`${t2editor_url}/plugin/file_upload.php`, {
                    body: formData
                });
                
                if (data.success) {
                    progressBar.style.width = '100%';
                    progressText.textContent = '업로드 완료';
                    this.insertFileBlock(data.file);
                    modal.remove();
                    this.editor.createUndoPoint();
                    this.editor.autoSave();
                } else {
                    throw new Error(data.message || '업로드 실패');
                }
            } catch (error) {
                T2Utils.handleError(error, 'file upload');
                T2Utils.showNotification('파일 업로드 중 오류가 발생했습니다.', 'error');
                uploadBtn.disabled = false;
                progressContainer.style.display = 'none';
            }
        };
    }

    insertFileBlock(fileInfo) {
        const fileBlock = document.createElement('div');
        fileBlock.className = 't2-media-block t2-file-block';
        
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
        const fileSize = T2Utils.formatFileSize(fileInfo.size);
        const isAudioFile = /\.(mp3|m4a)$/i.test(fileInfo.original_name);
        const isPdfFile = /\.pdf$/i.test(fileInfo.original_name);
        
        // URL 처리 - PDF 파일인 경우 뷰어 URL로 변환
        let fileUrl = fileInfo.url;
        if (isPdfFile) {
            const matches = fileUrl.match(/data\/editor\/t2editor_(\d+)\/(.+\.pdf)$/i);
            if (matches) {
                const [, date, filename] = matches;
                fileUrl = t2editor_url + `/plugin/pdf_view.php?pdf=${date}/${filename}`;
            }
        }
        
        if (isAudioFile) {
            fileBlock.innerHTML = `
                <div class="audio-player">
                    <audio src="${fileInfo.url}" preload="metadata"></audio>
                </div>
                <a href="${fileInfo.url}" download style="text-decoration: none; color: inherit;">
                    <div class="audio-file-container">
                        <div class="audio-file-icon"></div>
                        <div class="audio-file-info">
                            <div class="audio-file-name">${fileInfo.original_name}</div>
                            <div class="audio-file-details">
                                <span>DATE: ${date}</span>
                                <span>Size: ${fileSize}</span>
                                <span class="audio-duration">--:--</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;

            // 오디오 duration 로드
            const audio = fileBlock.querySelector('audio');
            const durationSpan = fileBlock.querySelector('.audio-duration');
            
            audio.addEventListener('loadedmetadata', () => {
                const minutes = Math.floor(audio.duration / 60);
                const seconds = Math.floor(audio.duration % 60);
                durationSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            });
            audio.addEventListener('error', () => {
                durationSpan.textContent = '--:--';
            });
        } else {
            // 파일 아이콘 UI
            fileBlock.innerHTML = `
                <a href="${fileUrl}" ${!isPdfFile ? 'download' : ''} style="text-decoration: none; color: inherit;">
                    <div class="file-container">
                        <div class="file-icon"></div>
                        <div class="file-info">
                            <div class="file-name">${fileInfo.original_name}</div>
                            <div class="file-details">
                                <span>DATE: ${date}&nbsp;</span>
                                <span>Size: ${fileSize}</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        }

        // 컨트롤 추가
        const controls = document.createElement('div');
        controls.className = 't2-media-controls';
        controls.innerHTML = `
            <button class="t2-btn" onclick="event.preventDefault(); event.stopPropagation(); this.closest('.t2-media-block').remove()">
                <span class="material-icons">delete</span>
            </button>
        `;
        fileBlock.appendChild(controls);

        // 현재 커서 위치에 삽입
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const currentBlock = this.editor.getClosestBlock(range.startContainer);

        if (currentBlock && currentBlock !== this.editor.editor) {
            const wrapper = document.createElement('p');
            wrapper.appendChild(fileBlock);
            
            const topBreak = document.createElement('p');
            topBreak.innerHTML = '<br>';
            currentBlock.parentNode.insertBefore(topBreak, currentBlock.nextSibling);
            
            topBreak.parentNode.insertBefore(wrapper, topBreak.nextSibling);
            
            const bottomBreak = document.createElement('p');
            bottomBreak.innerHTML = '<br>';
            wrapper.parentNode.insertBefore(bottomBreak, wrapper.nextSibling);
            
            const newRange = document.createRange();
            newRange.setStartAfter(bottomBreak);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }

        this.editor.normalizeContent();
        this.editor.createUndoPoint();
    }

    initializeFileBlocks() {
        this.editor.editor.querySelectorAll('.t2-file-block').forEach(block => {
            // 이미 올바르게 초기화된 블록이면 건너뛰기
            if (block.querySelector('.t2-media-controls')) return;
            
            // 링크 정보 추출
            const linkElements = block.querySelectorAll('a[href]');
            if (linkElements.length === 0) return;
            
            // 첫 번째 링크를 기준으로 사용
            const fileLink = linkElements[0];
            const url = fileLink.getAttribute('href');
            
            // 파일 정보 추출
            let fileName = '';
            let dateSpan = '';
            let sizeSpan = '';
            
            // 파일명 추출
            const fileNameElement = block.querySelector('.file-name, .audio-file-name');
            if (fileNameElement) {
                fileName = fileNameElement.textContent.trim();
            }
            
            // 날짜와 크기 정보 추출
            const detailSpans = block.querySelectorAll('.file-details span, .audio-file-details span');
            if (detailSpans.length >= 1) {
                dateSpan = detailSpans[0].textContent.trim();
            }
            if (detailSpans.length >= 2) {
                sizeSpan = detailSpans[1].textContent.trim();
            }
            
            // 파일 타입 확인
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const isAudioFile = ['mp3', 'm4a'].includes(fileExtension);
            const isPdfFile = fileExtension === 'pdf';
            
            // 새로운 블록 생성
            const newBlock = document.createElement('div');
            newBlock.className = 't2-file-block t2-media-block';
            
            if (isAudioFile) {
                // 오디오 파일 블록
                newBlock.innerHTML = `
                    <div class="audio-player">
                        <audio src="${url}" preload="metadata"></audio>
                    </div>
                    <a href="${url}" download style="text-decoration: none; color: inherit;">
                        <div class="audio-file-container">
                            <div class="audio-file-icon"></div>
                            <div class="audio-file-info">
                                <div class="audio-file-name">${fileName}</div>
                                <div class="audio-file-details">
                                    <span>${dateSpan}</span>
                                    <span>${sizeSpan}</span>
                                    <span class="audio-duration">--:--</span>
                                </div>
                            </div>
                        </div>
                    </a>
                `;
                
                // 오디오 duration 설정
                const audio = newBlock.querySelector('audio');
                const durationSpan = newBlock.querySelector('.audio-duration');
                
                if (audio && durationSpan) {
                    audio.addEventListener('loadedmetadata', () => {
                        const minutes = Math.floor(audio.duration / 60);
                        const seconds = Math.floor(audio.duration % 60);
                        durationSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    });
                    audio.addEventListener('error', () => {
                        durationSpan.textContent = '--:--';
                    });
                }
            } else {
                // 일반 파일 블록
                newBlock.innerHTML = `
                    <a href="${url}" ${!isPdfFile ? 'download' : ''} style="text-decoration: none; color: inherit;">
                        <div class="file-container">
                            <div class="file-icon"></div>
                            <div class="file-info">
                                <div class="file-name">${fileName}</div>
                                <div class="file-details">
                                    <span>${dateSpan}&nbsp;</span>
                                    <span>${sizeSpan}</span>
                                </div>
                            </div>
                        </div>
                    </a>
                `;
            }
            
            // 삭제 버튼 추가
            const controls = document.createElement('div');
            controls.className = 't2-media-controls';
            controls.innerHTML = `
                <button class="t2-btn" onclick="event.preventDefault(); event.stopPropagation(); this.closest('.t2-media-block').remove()">
                    <span class="material-icons">delete</span>
                </button>
            `;
            newBlock.appendChild(controls);
            
            // 기존 블록을 새 블록으로 교체
            block.parentNode.replaceChild(newBlock, block);
            
            // 부모가 p 태그가 아니면 p 태그로 감싸기
            if (newBlock.parentNode.nodeName !== 'P') {
                const p = document.createElement('p');
                newBlock.parentNode.insertBefore(p, newBlock);
                p.appendChild(newBlock);
            }
        });
    }
}

window.T2FilePlugin = T2FilePlugin;