class T2VideoPlugin {
    constructor(editor) {
        this.editor = editor;
        this.commands = ['insertYouTube'];
    }

    handleCommand(command, button) {
        switch(command) {
            case 'insertYouTube':
                this.insertVideo();
                break;
        }
    }

    onContentSet(html) {
        // 컨텐츠 설정 시 비디오 블록 초기화
        setTimeout(() => {
            this.initializeVideoBlocks();
        }, 100);
    }

    insertVideo() {
        // 현재 커서 위치 저장
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const savedRange = range.cloneRange();

        const modalContent = `
            <div class="t2-video-editor-modal">
                <h3>비디오 삽입</h3>
                <input type="text" placeholder="동영상 링크 삽입" class="t2-youtube-url">
                <div class="t2-video-type-info">
                    지원 동영상 유형: 유튜브, 비디오 파일(.mp4, .webm, .ogg) 링크
                </div>
                <div class="t2-btn-group">
                    <button class="t2-btn" data-action="cancel">취소</button>
                    <button class="t2-btn" data-action="insert">삽입</button>
                </div>
            </div>
        `;

        const modal = T2Utils.createModal(modalContent);
        this.setupVideoModalEvents(modal, savedRange);
    }

    setupVideoModalEvents(modal, savedRange) {
        const urlInput = modal.querySelector('.t2-youtube-url');
        
        const insertVideo = () => {
            const url = urlInput.value.trim();
            const videoInfo = T2Utils.getVideoType(url);
            
            if (!videoInfo) {
                T2Utils.showNotification('올바른 비디오 URL을 입력해주세요.', 'error');
                return;
            }

            const videoBlock = this.createVideoBlock(videoInfo);
            
            // 저장된 커서 위치에 삽입
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
            
            const currentBlock = this.editor.getClosestBlock(savedRange.startContainer);
            if (currentBlock && currentBlock !== this.editor.editor) {
                const topBreak = document.createElement('p');
                topBreak.innerHTML = '<br>';
                currentBlock.parentNode.insertBefore(topBreak, currentBlock.nextSibling);
                
                const wrapper = document.createElement('p');
                wrapper.appendChild(videoBlock);
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
            this.editor.autoSave();
            modal.remove();
        };

        modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();
        modal.querySelector('[data-action="insert"]').onclick = insertVideo;
        
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                insertVideo();
            }
        });

        urlInput.focus();
    }

    createVideoBlock(videoInfo) {
        const defaultWidth = 320;
        const defaultHeight = 180;

        const wrapper = document.createElement('div');
        wrapper.className = 't2-media-block';
        
        const videoContainer = document.createElement('div');
        videoContainer.style.width = defaultWidth + 'px';
        videoContainer.style.height = defaultHeight + 'px';
        videoContainer.style.maxWidth = '100%';
        videoContainer.style.margin = '0 auto';
        videoContainer.dataset.width = defaultWidth;
        videoContainer.dataset.height = defaultHeight;
        
        let videoElement;
        
        if (videoInfo.type === 'youtube') {
            videoElement = document.createElement('iframe');
            videoElement.src = `https://www.youtube.com/embed/${videoInfo.id}`;
            videoElement.frameBorder = "0";
            videoElement.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            videoElement.allowFullscreen = true;
        } else {
            videoElement = document.createElement('video');
            videoElement.src = videoInfo.url;
            videoElement.controls = true;
            videoElement.style.backgroundColor = '#000';
        }
        
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        
        videoContainer.appendChild(videoElement);

        const controls = this.createVideoControls(videoContainer, videoElement, videoInfo, defaultWidth, defaultHeight);
        
        wrapper.appendChild(videoContainer);
        wrapper.appendChild(controls);
        
        return wrapper;
    }

    createVideoControls(container, videoElement, videoInfo, defaultWidth, defaultHeight) {
        const controls = document.createElement('div');
        controls.className = 't2-media-controls';
        controls.contentEditable = false;

        const editorWidth = this.editor.editor.clientWidth;
        const maxWidthPercentage = Math.min(100, Math.floor((editorWidth / defaultWidth) * 100));
        const percentage = Math.round((parseInt(container.style.width) / defaultWidth) * 100);

        controls.innerHTML = `
            <button class="t2-btn" onclick="event.preventDefault(); event.stopPropagation(); this.closest('.t2-media-block').remove()">
                <span class="material-icons">delete</span>
            </button>
            <button class="t2-btn edit-url-btn">
                <span class="material-icons">edit</span>
            </button>
            <input type="range" min="30" max="${maxWidthPercentage}" value="${percentage}" style="width: 100px;">
        `;

        // 크기 조절 이벤트
        const rangeInput = controls.querySelector('input[type="range"]');
        if (rangeInput) {
            const resizeObserver = new ResizeObserver(() => {
                const newEditorWidth = this.editor.editor.clientWidth;
                const newMaxPercentage = Math.min(100, Math.floor((newEditorWidth / defaultWidth) * 100));
                rangeInput.max = newMaxPercentage;
                
                if (parseInt(rangeInput.value) > newMaxPercentage) {
                    rangeInput.value = newMaxPercentage;
                    const newWidth = Math.round((defaultWidth * newMaxPercentage) / 100);
                    const newHeight = Math.round((defaultHeight * newMaxPercentage) / 100);
                    
                    container.style.width = `${newWidth}px`;
                    container.style.height = `${newHeight}px`;
                    container.style.maxWidth = '100%';
                    videoElement.style.width = '100%';
                    videoElement.style.height = '100%';
                }
            });
            
            resizeObserver.observe(this.editor.editor);

            rangeInput.addEventListener('input', (e) => {
                const percentage = parseInt(e.target.value);
                const newWidth = Math.round((defaultWidth * percentage) / 100);
                const newHeight = Math.round((defaultHeight * percentage) / 100);
                
                container.style.width = `${newWidth}px`;
                container.style.height = `${newHeight}px`;
                container.style.maxWidth = '100%';
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
            });
        }

        // URL 편집 이벤트
        const editUrlBtn = controls.querySelector('.edit-url-btn');
        if (editUrlBtn) {
            editUrlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showVideoUrlEditModal(videoElement, videoInfo);
            });
        }

        return controls;
    }

    showVideoUrlEditModal(videoElement, currentVideoInfo) {
        const currentUrl = currentVideoInfo.type === 'youtube' 
            ? `https://youtube.com/watch?v=${currentVideoInfo.id}`
            : currentVideoInfo.url;
        
        const modalContent = `
            <div class="t2-video-editor-modal">
                <h3>비디오 URL 수정</h3>
                <input type="text" placeholder="동영상 링크 삽입" class="t2-youtube-url" value="${currentUrl}">
                <div class="t2-video-type-info">
                    지원 동영상 유형: 유튜브, 비디오 파일(.mp4, .webm, .ogg) 링크
                </div>
                <div class="t2-btn-group">
                    <button class="t2-btn" data-action="cancel">취소</button>
                    <button class="t2-btn" data-action="insert">수정</button>
                </div>
            </div>
        `;

        const modal = T2Utils.createModal(modalContent);
        
        const updateVideo = () => {
            const url = modal.querySelector('.t2-youtube-url').value;
            const videoInfo = T2Utils.getVideoType(url);
            
            if (!videoInfo) {
                T2Utils.showNotification('올바른 비디오 URL을 입력해주세요.', 'error');
                return;
            }

            if (videoInfo.type === 'youtube') {
                videoElement.src = `https://www.youtube.com/embed/${videoInfo.id}`;
            } else {
                const newVideo = document.createElement('video');
                newVideo.src = videoInfo.url;
                newVideo.controls = true;
                newVideo.style = videoElement.style;
                videoElement.parentNode.replaceChild(newVideo, videoElement);
            }

            modal.remove();
            this.editor.createUndoPoint();
            this.editor.autoSave();
        };

        modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();
        modal.querySelector('[data-action="insert"]').onclick = updateVideo;
        
        modal.querySelector('.t2-youtube-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateVideo();
            }
        });

        modal.querySelector('.t2-youtube-url').focus();
    }

    initializeVideoBlocks() {
        // 유튜브 iframe 초기화
        this.editor.editor.querySelectorAll('iframe[src*="youtube"]:not(.t2-media-block iframe)').forEach(frame => {
            const width = parseInt(frame.style.width) || 320;
            const height = parseInt(frame.style.height) || 180;
            
            const videoId = frame.src.match(/embed\/([^?]+)/)?.[1];
            if (videoId) {
                const wrapper = this.createVideoBlock({ type: 'youtube', id: videoId });
                frame.parentNode.replaceChild(wrapper, frame);
            }
        });

        // 비디오 요소 초기화
        this.editor.editor.querySelectorAll('video:not(.t2-media-block video)').forEach(video => {
            const width = parseInt(video.style.width) || 320;
            const height = parseInt(video.style.height) || 180;
            
            const wrapper = this.createVideoBlock({ type: 'video', url: video.src });
            video.parentNode.replaceChild(wrapper, video);
        });

        // 기존 미디어 블록 처리
        this.editor.editor.querySelectorAll('.t2-media-block').forEach(block => {
            const container = block.querySelector('div:first-child');
            const mediaElement = container?.querySelector('iframe, video');
            
            if (mediaElement) {
                const currentWidth = parseInt(container.style.width) || 320;
                const currentHeight = parseInt(container.style.height) || 180;
                
                if (!container.style.maxWidth) {
                    container.style.maxWidth = '100%';
                }
                if (!container.style.margin) {
                    container.style.margin = '0 auto';
                }
                
                mediaElement.style.width = '100%';
                mediaElement.style.height = '100%';
                
                // 블록이 p 태그 안에 있도록 처리
                if (block.parentNode.nodeName !== 'P') {
                    const p = document.createElement('p');
                    block.parentNode.insertBefore(p, block);
                    p.appendChild(block);
                }
                
                const existingControls = block.querySelector('.t2-media-controls');
                if (existingControls) {
                    existingControls.remove();
                }
                
                let videoInfo;
                if (mediaElement.tagName === 'IFRAME') {
                    const videoId = mediaElement.src.match(/embed\/([^?]+)/)?.[1];
                    videoInfo = { type: 'youtube', id: videoId };
                } else {
                    videoInfo = { type: 'video', url: mediaElement.src };
                }
                
                const controls = this.createVideoControls(container, mediaElement, videoInfo, currentWidth, currentHeight);
                block.appendChild(controls);
            }
        });
    }
}

window.T2VideoPlugin = T2VideoPlugin;