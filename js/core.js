//Path: T2Editor/js/core.js
class T2Editor {
    constructor(container) {
        this.container = container;
        this.editor = container.querySelector('.t2-editor');
        this.toolbar = container.querySelector('.t2-toolbar');
        this.plugins = new Map();
        this.config = {
            autoSave: true,
            plugins: ['image', 'video', 'file', 'table', 'code', 'link', 'export']
        };
        
        // HTML 편집 모드 관련
        this.isHtmlEditMode = false;
        this.htmlEditor = null;
        this.htmlToggle = null;
        
        // 디바이스 및 브라우저 감지
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        // 상태 관리
        this.alignmentState = 'left';
        this.bulletState = { active: false, type: null, count: 1 };
        this.undoStack = [];
        this.redoStack = [];
        this.lastCheckpoint = null;
        this.savedSelection = null;
        
        // DOM 요소 참조
        this.undoBtn = container.querySelector('[data-command="undo"]');
        this.redoBtn = container.querySelector('[data-command="redo"]');
        this.charCount = container.querySelector('.t2-char-count span');
        
        // 자동 저장 설정
        this.autoSaveEnabled = localStorage.getItem('t2editor-autosave-enabled') !== 'false';
        
        this.init();
    }

    init() {
        this.setupEditor();
        this.setupEventListeners();
        this.setupAutoSaveToggle();
        this.setupBeforeUnload();
        
        if (this.autoSaveEnabled) {
            this.loadAutoSave();
        }
        
        this.updateUndoRedoButtons();
        this.updateCharCount();
        
        // 플러그인 로딩
        this.loadPlugins();
    }

    // HTML 편집 모드 초기화
    initHtmlEditMode(editorId) {
        this.htmlEditor = document.getElementById(editorId + '_html_editor');
        this.htmlToggle = document.getElementById(editorId + '_html_toggle');
        
        if (!this.htmlEditor || !this.htmlToggle) return;
        
        // HTML 편집 모드 토글 이벤트
        this.htmlToggle.addEventListener('change', (e) => {
            this.toggleHtmlEditMode(e.target.checked);
        });
        
        // HTML 편집기에 입력 이벤트 추가
        this.htmlEditor.addEventListener('input', () => {
            this.updateCharCountFromHtml();
            this.autoSave();
        });
        
        // 초기 상태 확인
        this.isHtmlEditMode = this.htmlToggle.checked;
        if (this.isHtmlEditMode) {
            this.switchToHtmlMode();
        }
    }

    // HTML 편집 모드 토글
    toggleHtmlEditMode(isHtmlMode) {
        this.isHtmlEditMode = isHtmlMode;
        
        if (isHtmlMode) {
            this.switchToHtmlMode();
        } else {
            this.switchToVisualMode();
        }
    }

    // HTML 편집 모드로 전환
    switchToHtmlMode() {
        if (!this.htmlEditor) return;
        
        // 현재 에디터 내용을 HTML 텍스트로 변환
        const currentContent = this.editor.innerHTML;
        const formattedHtml = this.formatHtml(currentContent);
        this.htmlEditor.value = formattedHtml;
        
        // 에디터 숨기고 HTML 편집기 표시
        this.editor.style.display = 'none';
        this.htmlEditor.style.display = 'block';
        
        // 툴바 버튼들 비활성화
        this.toolbar.style.opacity = '0.5';
        this.toolbar.style.pointerEvents = 'none';
        
        // HTML 편집기 스타일 적용
        this.htmlEditor.style.cssText = `
            display: block;
            width: 100%;
            height: 450px;
            padding: 15px;
            border: none;
            outline: none;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            background: var(--t2-editor-bg, #fff);
            color: var(--t2-editor-text, #000);
            resize: vertical;
            min-height: 350px;
            max-height: 600px;
            border-radius: 0 0 10px 10px;
        `;
        
        // 문자 수 업데이트
        this.updateCharCountFromHtml();
        
        // 포커스
        this.htmlEditor.focus();
        
        console.log('HTML 편집 모드로 전환됨');
    }

    // 시각적 편집 모드로 전환
    switchToVisualMode() {
        if (!this.htmlEditor) return;
        
        // HTML 텍스트를 에디터 내용으로 변환
        const htmlContent = this.htmlEditor.value;
        
        try {
            // HTML 유효성 검사 및 정리
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // 위험한 스크립트 제거
            tempDiv.querySelectorAll('script').forEach(script => script.remove());
            
            this.editor.innerHTML = tempDiv.innerHTML;
            this.normalizeContent();
        } catch (error) {
            console.error('HTML 파싱 오류:', error);
            T2Utils.showNotification('HTML 형식에 오류가 있습니다. 확인 후 다시 시도해주세요.', 'error');
            return;
        }
        
        // HTML 편집기 숨기고 에디터 표시
        this.htmlEditor.style.display = 'none';
        this.editor.style.display = 'block';
        
        // 툴바 버튼들 활성화
        this.toolbar.style.opacity = '1';
        this.toolbar.style.pointerEvents = 'auto';
        
        // 문자 수 업데이트
        this.updateCharCount();
        
        // 포커스
        this.editor.focus();
        
        // 실행 취소 포인트 생성
        this.createUndoPoint();
        
        console.log('시각적 편집 모드로 전환됨');
    }

    // HTML 포맷팅 (읽기 쉽게 정리)
    formatHtml(html) {
        if (!html) return '';
        
        try {
            // 임시 div에 HTML 삽입
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // 기본적인 정리만 수행
            let formatted = tempDiv.innerHTML;
            
            // 태그 사이 줄바꿈 추가 (기본적인 포맷팅)
            formatted = formatted
                .replace(/></g, '>\n<')
                .replace(/^\s+|\s+$/gm, '') // 각 줄의 앞뒤 공백 제거
                .split('\n')
                .filter(line => line.trim()) // 빈 줄 제거
                .join('\n');
            
            return formatted;
        } catch (error) {
            console.error('HTML 포맷팅 오류:', error);
            return html; // 오류 시 원본 반환
        }
    }

    // HTML 모드에서 문자 수 업데이트
    updateCharCountFromHtml() {
        if (!this.htmlEditor || !this.charCount) return;
        
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.htmlEditor.value;
            let text = tempDiv.textContent || tempDiv.innerText || '';
            text = text.replace(/\s+/g, '');
            this.charCount.textContent = text.length;
        } catch (error) {
            // HTML 파싱 오류 시 원본 텍스트로 계산
            let text = this.htmlEditor.value.replace(/<[^>]*>/g, '');
            text = text.replace(/\s+/g, '');
            this.charCount.textContent = text.length;
        }
    }

    setupEditor() {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        this.editor.appendChild(p);
        
        this.editor.style.whiteSpace = 'pre-wrap';
        this.editor.style.wordBreak = 'break-word';
    }

    setupEventListeners() {
        // 툴바 이벤트
        this.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.t2-btn');
            if (!button) return;
            
            // HTML 편집 모드에서는 툴바 비활성화
            if (this.isHtmlEditMode) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const command = button.dataset.command;
            this.handleCommand(command, button);
        });

        // 키보드 이벤트
        if (this.isIOS || this.isSafari) {
            this.editor.addEventListener('keydown', (e) => {
                if (this.isHtmlEditMode) return;
                if (e.key === 'Backspace') {
                    this.handleBackspace(e);
                }
            });
        } else {
            this.editor.addEventListener('keydown', (e) => {
                if (this.isHtmlEditMode) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleEnterKey();
                } else if (e.key === 'Backspace') {
                    this.handleBackspace(e);
                }
            });
        }

        // 에디터 입력 이벤트
        this.editor.addEventListener('input', (e) => {
            if (this.isHtmlEditMode) return;
            this.handleInput(e);
        });

        // 붙여넣기 이벤트
        this.editor.addEventListener('paste', (e) => {
            if (this.isHtmlEditMode) return;
            e.preventDefault();
            this.handlePaste(e.clipboardData);
        });

        // DOM 노드 삽입 이벤트
        this.editor.addEventListener('DOMNodeInserted', (e) => {
            if (this.isHtmlEditMode) return;
            this.handleNodeInserted(e);
        });
    }

    handleCommand(command, button) {
        // HTML 편집 모드에서는 명령어 무시
        if (this.isHtmlEditMode) return;
        
        // 플러그인에서 처리할 수 있는 명령인지 확인
        for (let [name, plugin] of this.plugins) {
            if (plugin.commands && plugin.commands.includes(command)) {
                plugin.handleCommand(command, button);
                this.createUndoPoint();
                return;
            }
        }

        // 기본 명령어 처리
        switch(command) {
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'fontSize':
                this.showFontSizeList(button);
                break;
            case 'justifyContent':
                this.toggleAlignment(button);
                break;
            case 'foreColor':
            case 'backColor':
                this.saveSelection();
                this.showColorPalette(command, button);
                break;
            default:
                this.execCommand(command);
                if (['bold', 'italic', 'underline', 'strikeThrough'].includes(command)) {
                    button.classList.toggle('active');
                }
                break;
        }
        
        this.createUndoPoint();
    }

    handleInput(e) {
        if (this.isHtmlEditMode) return;
        
        this.autoSave();
        this.handleBulletPoints();
        
        if (this.isIOS || this.isSafari) {
            requestAnimationFrame(() => {
                this.normalizeContent();
            });
        } else {
            this.normalizeContent();
        }
        
        this.createUndoPoint();
        this.updateCharCount();
    }

    handleEnterKey() {
        if (this.isHtmlEditMode) return;
        
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        let currentBlock = this.getClosestBlock(range.startContainer);
        
        if (!currentBlock || currentBlock === this.editor) {
            currentBlock = document.createElement('p');
            currentBlock.innerHTML = '<br>';
            this.editor.appendChild(currentBlock);
            this.setCaretToStart(currentBlock);
            return;
        }
        
        const newBlock = document.createElement('p');
        
        if (range.collapsed) {
            const beforeRange = document.createRange();
            beforeRange.selectNodeContents(currentBlock);
            beforeRange.setEnd(range.startContainer, range.startOffset);
            const afterRange = document.createRange();
            afterRange.selectNodeContents(currentBlock);
            afterRange.setStart(range.startContainer, range.startOffset);
            
            const beforeContent = beforeRange.cloneContents();
            const afterContent = afterRange.cloneContents();
            
            if (beforeContent.textContent.trim()) {
                currentBlock.innerHTML = '';
                currentBlock.appendChild(beforeContent);
            } else {
                currentBlock.innerHTML = '<br>';
            }
            
            if (afterContent.textContent.trim()) {
                newBlock.appendChild(afterContent);
            } else {
                newBlock.innerHTML = '<br>';
            }
        } else {
            newBlock.innerHTML = '<br>';
        }
        
        currentBlock.parentNode.insertBefore(newBlock, currentBlock.nextSibling);
        this.setCaretToStart(newBlock);
        
        this.normalizeContent();
        this.createUndoPoint();
        this.autoSave();
    }

    handleBackspace(e) {
        if (this.isHtmlEditMode) return;
        
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        if (this.editor.childNodes.length <= 1) {
            const onlyBlock = this.editor.firstElementChild;
            if (!onlyBlock || onlyBlock.textContent.trim() === '') {
                e.preventDefault();
                if (!onlyBlock || onlyBlock.tagName !== 'P') {
                    this.resetEditor();
                }
                return;
            }
        }
        
        if (range.collapsed && this.isAtBlockStart(range)) {
            e.preventDefault();
            
            const currentBlock = this.getClosestBlock(range.startContainer);
            if (!currentBlock || currentBlock === this.editor) return;
            
            const previousBlock = currentBlock.previousElementSibling;
            if (!previousBlock) return;
            
            this.mergeBlocks(previousBlock, currentBlock);
            this.createUndoPoint();
        }
        
        setTimeout(() => this.normalizeContent(), 0);
    }

    handlePaste(clipboardData) {
        if (this.isHtmlEditMode) return;
        
        // 플러그인에서 붙여넣기 처리
        for (let [name, plugin] of this.plugins) {
            if (plugin.handlePaste && plugin.handlePaste(clipboardData)) {
                return; // 플러그인에서 처리됨
            }
        }

        // 기본 텍스트 붙여넣기 처리
        const plainText = clipboardData.getData('text/plain');
        const htmlText = clipboardData.getData('text/html');
        
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        let currentBlock = this.getClosestBlock(range.startContainer);
        
        if (!currentBlock || currentBlock === this.editor) {
            currentBlock = document.createElement('p');
            this.editor.appendChild(currentBlock);
        }
        
        if (htmlText && !this.isIOS && !this.isSafari) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlText;
            
            this.cleanupPastedHTML(tempDiv);
            
            range.deleteContents();
            
            Array.from(tempDiv.childNodes).forEach((node, index) => {
                let block;
                
                if (node.nodeType === Node.TEXT_NODE) {
                    block = document.createElement('p');
                    block.appendChild(node.cloneNode());
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (this.isBlockElement(node)) {
                        block = node.cloneNode(true);
                    } else {
                        block = document.createElement('p');
                        block.appendChild(node.cloneNode(true));
                    }
                }
                
                if (block) {
                    if (index === 0 && range.collapsed) {
                        range.insertNode(block);
                    } else {
                        currentBlock.parentNode.insertBefore(block, currentBlock.nextSibling);
                    }
                    currentBlock = block;
                }
            });
        } else {
            const lines = plainText.split(/\r?\n/);
            
            lines.forEach((line, index) => {
                if (index === 0 && range.collapsed) {
                    document.execCommand('insertText', false, line);
                } else {
                    const p = document.createElement('p');
                    p.textContent = line || '\u200B';
                    if (!line) {
                        p.appendChild(document.createElement('br'));
                    }
                    
                    currentBlock.parentNode.insertBefore(p, currentBlock.nextSibling);
                    currentBlock = p;
                }
            });
        }
        
        this.normalizeContent();
        this.createUndoPoint();
    }

    handleNodeInserted(e) {
        if (this.isHtmlEditMode) return;
        
        if (e.target.nodeType === Node.TEXT_NODE && e.target.parentNode === this.editor) {
            const p = document.createElement('p');
            e.target.parentNode.insertBefore(p, e.target);
            p.appendChild(e.target);
            this.normalizeContent();
        }
    }

    // 유틸리티 메서드들
    getClosestBlock(node) {
        const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'];
        while (node && node !== this.editor) {
            if (blockTags.includes(node.nodeName)) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    isBlockElement(element) {
        const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'];
        return blockTags.includes(element.tagName);
    }

    isAtBlockStart(range) {
        const block = this.getClosestBlock(range.startContainer);
        if (!block) return false;
        
        const blockRange = document.createRange();
        blockRange.selectNodeContents(block);
        blockRange.collapse(true);
        
        return range.compareBoundaryPoints(Range.START_TO_START, blockRange) === 0;
    }

    setCaretToStart(element) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        let target = element.firstChild;
        while (target && target.nodeType === Node.ELEMENT_NODE && target.tagName !== 'BR') {
            target = target.firstChild;
        }
        
        if (!target) {
            range.setStart(element, 0);
        } else if (target.nodeType === Node.TEXT_NODE) {
            range.setStart(target, 0);
        } else {
            range.setStartBefore(target);
        }
        
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    setCaretPosition(element, offset) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        let targetNode = element.firstChild;
        while (targetNode && targetNode.nodeType !== Node.TEXT_NODE) {
            targetNode = targetNode.firstChild;
        }
        
        if (!targetNode) {
            targetNode = element;
            offset = 0;
        }
        
        range.setStart(targetNode, Math.min(offset, targetNode.length));
        range.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(range);
    }

    mergeBlocks(target, source) {
        const caretPosition = target.textContent.length;
        
        if (target.innerHTML === '<br>') {
            target.innerHTML = '';
        }
        if (source.innerHTML === '<br>') {
            source.innerHTML = '';
        }
        
        while (source.firstChild) {
            target.appendChild(source.firstChild);
        }
        source.remove();
        
        this.setCaretPosition(target, caretPosition);
        this.normalizeContent();
    }

    normalizeContent() {
        let lastBlock = null;
        const blocks = Array.from(this.editor.childNodes);

        blocks.forEach((node, index) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const p = document.createElement('p');
                node.parentNode.insertBefore(p, node);
                p.appendChild(node);
                lastBlock = p;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList?.contains('t2-media-block')) {
                    const prev = node.previousElementSibling;
                    const next = node.nextElementSibling;

                    if (prev && prev.tagName === 'P' && !prev.textContent.trim() && prev.querySelector('br')) {
                        prev.remove();
                    }
                    if (next && next.tagName === 'P' && !next.textContent.trim() && next.querySelector('br')) {
                        next.remove();
                    }
                }

                if (!node.textContent.trim() && !node.querySelector('br') && !node.classList?.contains('t2-media-block')) {
                    if (this.isIOS || this.isSafari) {
                        node.innerHTML = '<br>';
                    } else {
                        node.innerHTML = '\u200B<br>';
                    }
                }

                lastBlock = node;
            }
        });

        if (!this.editor.firstChild) {
            const p = document.createElement('p');
            if (this.isIOS || this.isSafari) {
                p.innerHTML = '<br>';
            } else {
                p.innerHTML = '\u200B<br>';
            }
            this.editor.appendChild(p);
        }
    }

    cleanupPastedHTML(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        
        const nodesToRemove = [];
        let node;
        
        while (node = walker.nextNode()) {
            node.removeAttribute('style');
            node.removeAttribute('class');
            
            if (['STYLE', 'SCRIPT', 'META'].includes(node.tagName)) {
                nodesToRemove.push(node);
            }
            
            if (this.isBlockElement(node) && !node.textContent.trim()) {
                node.innerHTML = '<br>';
            }
        }
        
        nodesToRemove.forEach(node => node.parentNode.removeChild(node));
    }

    resetEditor() {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        this.editor.innerHTML = '';
        this.editor.appendChild(p);
        this.setCaretToStart(p);
    }

    // 실행 취소/재실행
    createUndoPoint() {
        if (this.isHtmlEditMode) return;
        
        const currentContent = this.editor.innerHTML;
        if (currentContent === this.lastCheckpoint) return;
        
        this.undoStack.push(this.lastCheckpoint);
        this.lastCheckpoint = currentContent;
        this.redoStack = [];
        
        if (this.undoStack.length > 100) {
            this.undoStack.shift();
        }
        
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.isHtmlEditMode || this.undoStack.length === 0) return;
        
        const currentContent = this.editor.innerHTML;
        this.redoStack.push(currentContent);
        
        const previousContent = this.undoStack.pop();
        this.lastCheckpoint = previousContent;
        this.editor.innerHTML = previousContent;
        
        this.updateUndoRedoButtons();
    }

    redo() {
        if (this.isHtmlEditMode || this.redoStack.length === 0) return;
        
        const currentContent = this.editor.innerHTML;
        this.undoStack.push(currentContent);
        
        const nextContent = this.redoStack.pop();
        this.lastCheckpoint = nextContent;
        this.editor.innerHTML = nextContent;
        
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        this.undoBtn.disabled = this.undoStack.length === 0 || this.isHtmlEditMode;
        this.redoBtn.disabled = this.redoStack.length === 0 || this.isHtmlEditMode;
    }

    // 기본 명령어 실행
    execCommand(command, value = null) {
        if (this.isHtmlEditMode) return;
        
        document.execCommand('styleWithCSS', false, true);
        
        switch(command) {
            case 'fontSize':
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                
                const span = document.createElement('span');
                span.style.fontSize = value + 'px';
                
                const existingSpan = range.commonAncestorContainer.parentElement;
                if (existingSpan && existingSpan.style.fontSize) {
                    existingSpan.style.fontSize = value + 'px';
                } else {
                    range.surroundContents(span);
                }
                break;
            default:
                document.execCommand(command, false, value);
        }
        
        this.normalizeContent();
    }

    // 선택 영역 저장/복원
    saveSelection() {
        if (this.isHtmlEditMode) return;
        
        if (window.getSelection) {
            this.savedSelection = window.getSelection().getRangeAt(0).cloneRange();
        }
    }

    restoreSelection() {
        if (this.isHtmlEditMode) return;
        
        if (this.savedSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.savedSelection);
        }
    }

    // 자동 저장
    setupAutoSaveToggle() {
        const statusBar = this.container.querySelector('.t2-editor-status');
        const autoSaveToggle = document.createElement('div');
        autoSaveToggle.className = 't2-autosave-toggle';

        autoSaveToggle.innerHTML = `
            <label class="t2-switch">
                <input type="checkbox" ${this.autoSaveEnabled ? 'checked' : ''}>
                <span class="t2-slider"></span>
            </label>
            <span class="t2-autosave-text">자동 저장</span>
        `;

        const toggleCheckbox = autoSaveToggle.querySelector('input[type="checkbox"]');
        
        toggleCheckbox.addEventListener('change', (e) => {
            this.autoSaveEnabled = e.target.checked;
            localStorage.setItem('t2editor-autosave-enabled', this.autoSaveEnabled);

            if (!this.autoSaveEnabled) {
                this.clearAutoSave();
            } else {
                this.autoSave();
            }
        });

        const htmlEditToggle = statusBar.querySelector('.t2-html-edit-toggle');
        if (htmlEditToggle) {
            statusBar.insertBefore(autoSaveToggle, htmlEditToggle);
        } else {
            const logo = statusBar.querySelector('.t2-logo').parentElement;
            logo.parentNode.insertBefore(autoSaveToggle, logo.nextSibling);
        }
    }

    autoSave() {
        if (!this.autoSaveEnabled) return;

        let content;
        if (this.isHtmlEditMode && this.htmlEditor) {
            content = this.htmlEditor.value;
        } else {
            content = this.editor.innerHTML;
        }
        
        const normalizedContent = content.replace(/<p>\s*<\/p>/g, '<p><br></p>');
        localStorage.setItem('t2editor-autosave', normalizedContent);
    }

    loadAutoSave() {
        if (!this.autoSaveEnabled) return;

        const saved = localStorage.getItem('t2editor-autosave');
        if (saved) {
            this.editor.innerHTML = saved;
            this.normalizeContent();
        }
    }

    clearAutoSave() {
        localStorage.removeItem('t2editor-autosave');
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            if (this.autoSaveEnabled) {
                this.autoSave();
            }
        });
    }

    updateCharCount() {
        if (this.isHtmlEditMode) {
            this.updateCharCountFromHtml();
            return;
        }
        
        let text = this.editor.textContent;
        text = text.replace(/\s+/g, '');
        this.charCount.textContent = text.length;
    }

    // 글꼴 크기 관련
    showFontSizeList(button) {
        if (this.isHtmlEditMode) return;
        
        const sizes = ['11', '13', '15', '16', '19', '24', '30', '34', '38'];
        const list = document.createElement('div');
        list.className = 't2-font-size-list';
        list.style.cssText = `
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 5px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-width: 120px;
        `;
        
        const currentFontSize = this.getCurrentFontSize();
        
        sizes.forEach(size => {
            const option = document.createElement('div');
            option.className = 't2-font-size-option';
            
            const isCurrentSize = parseInt(size) === currentFontSize;
            
            const optionContent = document.createElement('div');
            optionContent.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
            `;
            
            const sizeText = document.createElement('span');
            sizeText.textContent = `${size}px`;
            optionContent.appendChild(sizeText);
            
            if (isCurrentSize) {
                const checkmark = document.createElement('span');
                checkmark.className = 'material-icons';
                checkmark.textContent = 'check';
                checkmark.style.fontSize = '16px';
                checkmark.style.color = '#1a73e8';
                optionContent.appendChild(checkmark);
            }
            
            option.appendChild(optionContent);
            
            option.style.cssText = `
                padding: 5px 15px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.1s ease;
                ${isCurrentSize ? 'background-color: #e8f0fe; font-weight: 500;' : ''}
            `;
            
            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = isCurrentSize ? '#d2e3fc' : '#f5f5f5';
            });
            
            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = isCurrentSize ? '#e8f0fe' : 'transparent';
            });
            
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.execCommand('fontSize', size);
                list.parentElement.remove();
                this.createUndoPoint();
            });
            
            list.appendChild(option);
        });
        
        this.showDropdown(list, button);
    }

    getCurrentFontSize() {
        if (this.isHtmlEditMode) return null;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }
        
        while (node && node !== this.editor) {
            const fontSize = window.getComputedStyle(node).fontSize;
            if (fontSize && fontSize !== 'inherit') {
                return parseInt(fontSize);
            }
            node = node.parentNode;
        }
        
        return parseInt(window.getComputedStyle(this.editor).fontSize);
    }

    // 색상 팔레트
    showColorPalette(command, button) {
        if (this.isHtmlEditMode) return;
        
        const colors = [
            '#000000', '#434343', '#666666', '#999999',
            '#b7b7b7', '#cccccc', '#d9d9d9', '#f3f3f3',
            '#ffffff', '#ed2f27', '#ff8d3f', '#eeea7e',
            '#acbc8a', '#56bf56', '#588c7e', '#5ed0fe',
            '#0187fe', '#3c55dc', '#7d4afe', '#f2a5d8'
        ];
        
        const palette = document.createElement('div');
        palette.className = 't2-color-palette';
        palette.style.cssText = `
            background: white;
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 4px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-width: 120px;
        `;
        
        colors.forEach(color => {
            const option = document.createElement('div');
            option.className = 't2-color-option';
            option.style.cssText = `
                width: 25px;
                height: 25px;
                border-radius: 4px;
                cursor: pointer;
                border: 1px solid #ddd;
                background-color: ${color};
            `;
            
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.restoreSelection();
                this.execCommand(command, color);
                palette.parentElement.remove();
                this.createUndoPoint();
            });
            
            palette.appendChild(option);
        });
        
        this.showDropdown(palette, button);
    }

    // 정렬
    toggleAlignment(button) {
        if (this.isHtmlEditMode) return;
        
        const alignments = ['left', 'center', 'right'];
        const commands = ['justifyLeft', 'justifyCenter', 'justifyRight'];
        const icons = ['format_align_left', 'format_align_center', 'format_align_right'];
        
        let currentIndex = alignments.indexOf(this.alignmentState);
        currentIndex = (currentIndex + 1) % alignments.length;
        
        this.alignmentState = alignments[currentIndex];
        button.querySelector('.material-icons').textContent = icons[currentIndex];
        
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const block = this.getClosestBlock(range.commonAncestorContainer);
        
        if (block) {
            block.style.textAlign = this.alignmentState;
        }
        
        this.execCommand(commands[currentIndex]);
        this.createUndoPoint();
    }

    // 드롭다운 표시
    showDropdown(element, button) {
        if (this.isHtmlEditMode) return;
        
        const buttonRect = button.getBoundingClientRect();
        const toolbarRect = this.toolbar.getBoundingClientRect();
        
        const dropdownContainer = document.createElement('div');
        dropdownContainer.style.cssText = `
            position: absolute;
            top: ${buttonRect.bottom - toolbarRect.top}px;
            left: ${buttonRect.left - toolbarRect.left}px;
            z-index: 10000;
        `;
        
        dropdownContainer.appendChild(element);
        this.toolbar.appendChild(dropdownContainer);
        
        const dropdownRect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        if (dropdownRect.right > viewportWidth) {
            const overflow = dropdownRect.right - viewportWidth;
            dropdownContainer.style.left = `${parseInt(dropdownContainer.style.left) - overflow - 10}px`;
        }
        
        const closeHandler = (e) => {
            if (!element.contains(e.target) && e.target !== button) {
                dropdownContainer.remove();
                document.removeEventListener('mousedown', closeHandler);
            }
        };
        
        requestAnimationFrame(() => {
            document.addEventListener('mousedown', closeHandler);
        });
    }

    // 커서에 요소 삽입
    insertAtCursor(element) {
        if (this.isHtmlEditMode) return;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const currentBlock = this.getClosestBlock(range.startContainer);

        if (currentBlock && currentBlock !== this.editor) {
            const wrapper = document.createElement('p');
            wrapper.appendChild(element);

            const nextSibling = currentBlock.nextElementSibling;
            if (!nextSibling || (nextSibling.tagName === 'P' && !nextSibling.textContent.trim() && !nextSibling.querySelector('br'))) {
                currentBlock.parentNode.insertBefore(wrapper, currentBlock.nextSibling);
            } else {
                currentBlock.parentNode.insertBefore(wrapper, nextSibling);
            }

            const newRange = document.createRange();
            newRange.setStartAfter(wrapper);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            const wrapper = document.createElement('p');
            wrapper.appendChild(element);
            this.editor.appendChild(wrapper);

            const newRange = document.createRange();
            newRange.setStartAfter(wrapper);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }

        this.normalizeContent();
        this.createUndoPoint();
    }

    // 컨텐츠 설정
    setContent(html) {
        if (!html) return;
        
        this.editor.innerHTML = html;
        
        // 플러그인들에게 컨텐츠 설정 알림
        for (let [name, plugin] of this.plugins) {
            if (plugin.onContentSet) {
                plugin.onContentSet(html);
            }
        }
        
        this.normalizeContent();
    }

    // 플러그인 관리
    loadPlugins() {
        this.config.plugins.forEach(pluginName => {
            this.loadPlugin(pluginName);
        });
    }

    async loadPlugin(name) {
        try {
            const script = document.createElement('script');
            script.src = `${t2editor_url}/plugin/${name}/${name}.js`;
            script.onload = () => {
                if (window[`T2${name.charAt(0).toUpperCase() + name.slice(1)}Plugin`]) {
                    const PluginClass = window[`T2${name.charAt(0).toUpperCase() + name.slice(1)}Plugin`];
                    const plugin = new PluginClass(this);
                    this.plugins.set(name, plugin);
                    console.log(`Plugin ${name} loaded successfully`);
                }
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error(`Failed to load plugin ${name}:`, error);
        }
    }

    registerPlugin(name, plugin) {
        this.plugins.set(name, plugin);
    }

    getPlugin(name) {
        return this.plugins.get(name);
    }

    // 유틸리티 함수들 - 원본과 동일한 generateUid
    generateUid() {
        const random = Math.floor(Math.random() * 1000000000);
        const timestamp = new Date().getTime();
        return `${random}${timestamp}`;
    }

    handleBulletPoints() {
        // 추후 구현
    }
}

// 글로벌 에디터 인스턴스 생성 함수
window.T2Editor = T2Editor;