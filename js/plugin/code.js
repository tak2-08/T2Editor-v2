class T2CodePlugin {
    constructor(editor) {
        this.editor = editor;
        this.commands = ['insertCodeBlock'];
    }

    handleCommand(command, button) {
        switch(command) {
            case 'insertCodeBlock':
                this.insertCodeBlock();
                break;
        }
    }

    onContentSet(html) {
        // 컨텐츠 설정 시 코드 블록 초기화
        setTimeout(() => {
            this.initializeCodeBlocks();
        }, 100);
    }

    insertCodeBlock() {
        const code = document.createElement('div');
        code.className = 't2-code-block';
        
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.textContent = '코드를 입력하세요';
        codeElement.classList.add('code-placeholder');
        codeElement.setAttribute('contenteditable', 'true');
        pre.appendChild(codeElement);
        
        this.setupCodeEvents(codeElement);
        
        code.appendChild(pre);
        this.editor.insertAtCursor(code);
    }

    setupCodeEvents(codeElement) {
        // 코드 블록 클릭 이벤트
        codeElement.addEventListener('click', function(e) {
            if (this.classList.contains('code-placeholder')) {
                this.textContent = '';
                this.classList.remove('code-placeholder');
                // 커서 위치를 처음으로 설정
                const range = document.createRange();
                const sel = window.getSelection();
                range.setStart(this, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });

        // 코드 블록 포커스 이벤트
        codeElement.addEventListener('focus', function(e) {
            if (this.classList.contains('code-placeholder')) {
                this.textContent = '';
                this.classList.remove('code-placeholder');
            }
        });

        // 코드 블록 블러 이벤트
        codeElement.addEventListener('blur', function() {
            if (this.textContent.trim() === '') {
                this.textContent = '코드를 입력하세요';
                this.classList.add('code-placeholder');
            }
        });

        // 키보드 이벤트 추가
        codeElement.addEventListener('keydown', (e) => {
            // Tab 키 처리
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    '); // 4칸 들여쓰기
            }
            
            // Enter 키 처리 (줄바꿈 허용)
            if (e.key === 'Enter') {
                // 기본 동작 허용 (줄바꿈)
                e.stopPropagation(); // 에디터의 Enter 처리와 충돌 방지
            }
        });

        // 입력 이벤트
        codeElement.addEventListener('input', () => {
            this.editor.createUndoPoint();
            this.editor.autoSave();
        });
    }

    showCodeLanguageModal(codeElement) {
        const languages = [
            { value: 'javascript', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'cpp', label: 'C++' },
            { value: 'csharp', label: 'C#' },
            { value: 'php', label: 'PHP' },
            { value: 'html', label: 'HTML' },
            { value: 'css', label: 'CSS' },
            { value: 'sql', label: 'SQL' },
            { value: 'json', label: 'JSON' },
            { value: 'xml', label: 'XML' },
            { value: 'bash', label: 'Bash' },
            { value: 'text', label: 'Plain Text' }
        ];

        const modalContent = `
            <div class="t2-code-editor-modal">
                <h3>코드 언어 설정</h3>
                <div class="t2-language-selector">
                    <label for="code-language">프로그래밍 언어:</label>
                    <select id="code-language" class="t2-language-select">
                        ${languages.map(lang => 
                            `<option value="${lang.value}">${lang.label}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="t2-code-options">
                    <label>
                        <input type="checkbox" id="show-line-numbers"> 줄 번호 표시
                    </label>
                    <label>
                        <input type="checkbox" id="enable-highlighting"> 문법 강조
                    </label>
                </div>
                <div class="t2-btn-group">
                    <button class="t2-btn" data-action="cancel">취소</button>
                    <button class="t2-btn" data-action="apply">적용</button>
                </div>
            </div>
        `;

        const modal = T2Utils.createModal(modalContent);
        
        modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();
        modal.querySelector('[data-action="apply"]').onclick = () => {
            const language = modal.querySelector('#code-language').value;
            const showLineNumbers = modal.querySelector('#show-line-numbers').checked;
            const enableHighlighting = modal.querySelector('#enable-highlighting').checked;
            
            this.applyCodeSettings(codeElement, language, showLineNumbers, enableHighlighting);
            modal.remove();
        };
    }

    applyCodeSettings(codeElement, language, showLineNumbers, enableHighlighting) {
        const codeBlock = codeElement.closest('.t2-code-block');
        
        // 언어 클래스 추가
        codeElement.className = `language-${language}`;
        
        // 데이터 속성 설정
        codeElement.dataset.language = language;
        codeBlock.dataset.language = language;
        
        if (showLineNumbers) {
            codeBlock.classList.add('show-line-numbers');
        } else {
            codeBlock.classList.remove('show-line-numbers');
        }
        
        if (enableHighlighting) {
            codeBlock.classList.add('syntax-highlighting');
            this.applySyntaxHighlighting(codeElement, language);
        } else {
            codeBlock.classList.remove('syntax-highlighting');
        }
        
        this.editor.createUndoPoint();
    }

    applySyntaxHighlighting(codeElement, language) {
        // 간단한 문법 강조 (실제 프로젝트에서는 Prism.js나 highlight.js 사용 권장)
        const text = codeElement.textContent;
        let highlightedText = text;
        
        switch(language) {
            case 'javascript':
                highlightedText = this.highlightJavaScript(text);
                break;
            case 'python':
                highlightedText = this.highlightPython(text);
                break;
            case 'html':
                highlightedText = this.highlightHTML(text);
                break;
            case 'css':
                highlightedText = this.highlightCSS(text);
                break;
        }
        
        codeElement.innerHTML = highlightedText;
    }

    highlightJavaScript(text) {
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export'];
        let highlighted = text;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        // 문자열 강조
        highlighted = highlighted.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>');
        
        // 주석 강조
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        
        return highlighted;
    }

    highlightPython(text) {
        const keywords = ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except'];
        let highlighted = text;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        highlighted = highlighted.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>');
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        
        return highlighted;
    }

    highlightHTML(text) {
        let highlighted = text;
        
        // 태그 강조
        highlighted = highlighted.replace(/(&lt;\/?)([\w-]+)(.*?)(&gt;)/g, 
            '<span class="tag">$1</span><span class="tag-name">$2</span><span class="attribute">$3</span><span class="tag">$4</span>');
        
        return highlighted;
    }

    highlightCSS(text) {
        let highlighted = text;
        
        // 선택자 강조
        highlighted = highlighted.replace(/(^|\s)([.#]?[\w-]+)(\s*{)/gm, '$1<span class="selector">$2</span>$3');
        
        // 속성 강조
        highlighted = highlighted.replace(/([\w-]+)(\s*:)/g, '<span class="property">$1</span>$2');
        
        // 값 강조
        highlighted = highlighted.replace(/(:)(\s*[^;{}]+)/g, '$1<span class="value">$2</span>');
        
        return highlighted;
    }

    createCodeToolbar(codeBlock) {
        const toolbar = document.createElement('div');
        toolbar.className = 't2-code-toolbar';
        toolbar.innerHTML = `
            <div class="t2-code-info">
                <span class="t2-code-language">${codeBlock.dataset.language || 'text'}</span>
            </div>
            <div class="t2-code-actions">
                <button class="t2-btn t2-code-btn" data-action="settings" title="설정">
                    <span class="material-icons">settings</span>
                </button>
                <button class="t2-btn t2-code-btn" data-action="copy" title="복사">
                    <span class="material-icons">content_copy</span>
                </button>
                <button class="t2-btn t2-code-btn" data-action="fullscreen" title="전체화면">
                    <span class="material-icons">fullscreen</span>
                </button>
            </div>
        `;

        // 툴바 이벤트 설정
        toolbar.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            const codeElement = codeBlock.querySelector('code');
            
            switch(action) {
                case 'settings':
                    this.showCodeLanguageModal(codeElement);
                    break;
                case 'copy':
                    this.copyCodeToClipboard(codeElement);
                    break;
                case 'fullscreen':
                    this.toggleCodeFullscreen(codeBlock);
                    break;
            }
        });

        return toolbar;
    }

    copyCodeToClipboard(codeElement) {
        const text = codeElement.textContent;
        navigator.clipboard.writeText(text).then(() => {
            T2Utils.showNotification('코드가 클립보드에 복사되었습니다.', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            T2Utils.showNotification('코드가 클립보드에 복사되었습니다.', 'success');
        });
    }

    toggleCodeFullscreen(codeBlock) {
        if (codeBlock.classList.contains('t2-code-fullscreen')) {
            codeBlock.classList.remove('t2-code-fullscreen');
            document.body.classList.remove('t2-code-fullscreen-active');
        } else {
            codeBlock.classList.add('t2-code-fullscreen');
            document.body.classList.add('t2-code-fullscreen-active');
        }
    }

    initializeCodeBlocks() {
        this.editor.editor.querySelectorAll('.t2-code-block').forEach(codeBlock => {
            const codeElement = codeBlock.querySelector('code');
            
            if (codeElement) {
                // 이벤트가 이미 설정되지 않은 경우에만 설정
                if (!codeElement.dataset.eventsSetup) {
                    this.setupCodeEvents(codeElement);
                    codeElement.dataset.eventsSetup = 'true';
                }
                
                // 툴바가 없는 경우 추가
                if (!codeBlock.querySelector('.t2-code-toolbar')) {
                    const toolbar = this.createCodeToolbar(codeBlock);
                    codeBlock.insertBefore(toolbar, codeBlock.firstChild);
                }
            }
        });
    }
}

window.T2CodePlugin = T2CodePlugin;