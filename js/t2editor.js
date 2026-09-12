        class T2Editor {
            constructor(container) {
                this.container = container;
                this.editor = container.querySelector('.t2-editor');
                this.toolbar = container.querySelector('.t2-toolbar');
    this.basePath = './';
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        // 자동 저장 설정 상태 초기화
        this.autoSaveEnabled = localStorage.getItem('t2editor-autosave-enabled') !== 'false';
                this.setupEditor();
                this.setupEventListeners();
                this.loadAutoSave();
        this.setupAutoSaveToggle();
        
        // 자동 저장이 활성화된 경우에만 저장된 내용 불러오기
        if (this.autoSaveEnabled) {
            this.loadAutoSave();
        }
                this.setupBeforeUnload();
                this.alignmentState = 'left';
                this.bulletState = { active: false, type: null, count: 1 };
                this.undoStack = [];
                this.redoStack = [];
                this.lastCheckpoint = null;
                this.undoBtn = container.querySelector('[data-command="undo"]');
                this.redoBtn = container.querySelector('[data-command="redo"]');
                this.updateUndoRedoButtons();
    this.charCount = container.querySelector('.t2-char-count span');
    this.updateCharCount();
    
    // 글자수 업데이트 이벤트 추가
    this.editor.addEventListener('input', () => {
        this.updateCharCount();
    });
            }

            setupEditor() {
                // 에디터 초기화
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                this.editor.appendChild(p);

                // 기본 스타일 설정
                this.editor.style.whiteSpace = 'pre-wrap';
                this.editor.style.wordBreak = 'break-word';
            }

            updateUndoRedoButtons() {
                this.undoBtn.disabled = this.undoStack.length === 0;
                this.redoBtn.disabled = this.redoStack.length === 0;
            }
            
            // 이벤트 리스너 설정
    setupEventListeners() {
        this.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.t2-btn');
            if (!button) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const command = button.dataset.command;
            this.handleCommand(command, button);
        });

        // iOS/Safari와 다른 브라우저에 대한 분기 처리
        if (this.isIOS || this.isSafari) {
            // iOS/Safari에서는 기본 Enter 키 동작 사용
            this.editor.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    this.handleBackspace(e);
                }
            });
        } else {
            // 다른 브라우저에서는 커스텀 Enter 키 동작 사용
            this.editor.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleEnterKey();
                } else if (e.key === 'Backspace') {
                    this.handleBackspace(e);
                }
            });
        }

        this.editor.addEventListener('input', (e) => {
            this.handleInput(e);
        });

        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            this.handlePaste(e.clipboardData);
        });

        this.editor.addEventListener('DOMNodeInserted', (e) => {
            this.handleNodeInserted(e);
        });
    }

    handleInput(e) {
        this.autoSave();
        this.handleBulletPoints();
        
        // iOS/Safari에서 한글 입력 후 정규화 처리
        if (this.isIOS || this.isSafari) {
            requestAnimationFrame(() => {
                this.normalizeContent();
            });
        } else {
            this.normalizeContent();
        }
        
        this.createUndoPoint();
    }

            // 수정된 키보드 이벤트 처리
            handleKeyDown(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleEnterKey();
                } else if (e.key === 'Backspace') {
                    this.handleBackspace(e);
                }
            }

            // 개선된 Enter 키 처리
handleEnterKey() {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // 현재 캐럿이 위치한 블록 찾기
    let currentBlock = this.getClosestBlock(range.startContainer);
    
    // 블록이 없으면 새로 생성
    if (!currentBlock || currentBlock === this.editor) {
        currentBlock = document.createElement('p');
        currentBlock.innerHTML = '<br>';
        this.editor.appendChild(currentBlock);
        this.setCaretToStart(currentBlock);
        return;
    }
    
    // 새로운 블록 생성
    const newBlock = document.createElement('p');
    
    // 현재 블록의 내용 분할
    if (range.collapsed) {
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(currentBlock);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const afterRange = document.createRange();
        afterRange.selectNodeContents(currentBlock);
        afterRange.setStart(range.startContainer, range.startOffset);
        
        const beforeContent = beforeRange.cloneContents();
        const afterContent = afterRange.cloneContents();
        
        // 이전 내용 설정
        if (beforeContent.textContent.trim()) {
            currentBlock.innerHTML = '';
            currentBlock.appendChild(beforeContent);
        } else {
            currentBlock.innerHTML = '<br>';
        }
        
        // 이후 내용 설정
        if (afterContent.textContent.trim()) {
            newBlock.appendChild(afterContent);
        } else {
            newBlock.innerHTML = '<br>';
        }
    } else {
        newBlock.innerHTML = '<br>';
    }
    
    // 새 블록 삽입
    currentBlock.parentNode.insertBefore(newBlock, currentBlock.nextSibling);
    
    // 커서를 새 블록의 시작점으로 이동
    this.setCaretToStart(newBlock);
    
    this.normalizeContent();
    this.createUndoPoint();
    this.autoSave();
}

setCaretToStart(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    // 첫 번째 텍스트 노드나 BR 태그 찾기
    let target = element.firstChild;
    while (target && target.nodeType === Node.ELEMENT_NODE && target.tagName !== 'BR') {
        target = target.firstChild;
    }
    
    if (!target) {
        // 내용이 없는 경우
        range.setStart(element, 0);
    } else if (target.nodeType === Node.TEXT_NODE) {
        // 텍스트 노드인 경우
        range.setStart(target, 0);
    } else {
        // BR 태그인 경우
        range.setStartBefore(target);
    }
    
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

normalizeContent() {
    let lastBlock = null;
    const blocks = Array.from(this.editor.childNodes);

    blocks.forEach((node, index) => {
        if (node.nodeType === Node.TEXT_NODE) {
            // 텍스트 노드를 p 태그로 감싸기
            const p = document.createElement('p');
            node.parentNode.insertBefore(p, node);
            p.appendChild(node);
            lastBlock = p;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 미디어 블록 주변의 빈 <p><br></p> 제거
            if (node.classList?.contains('t2-media-block')) {
                const prev = node.previousElementSibling;
                const next = node.nextElementSibling;

                // 이전 요소가 빈 <p>면 제거
                if (prev && prev.tagName === 'P' && !prev.textContent.trim() && prev.querySelector('br')) {
                    prev.remove();
                }
                // 다음 요소가 빈 <p>면 제거
                if (next && next.tagName === 'P' && !next.textContent.trim() && next.querySelector('br')) {
                    next.remove();
                }
            }

            // 빈 블록 처리
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

    // 에디터가 비어있으면 기본 블록 추가
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

            // 블록 요소 분할
            splitBlock(block, range) {
                const newBlock = block.cloneNode(false);
                const after = range.extractContents();
                
                if (after.textContent.trim() === '') {
                    newBlock.innerHTML = '<br>';
                } else {
                    newBlock.appendChild(after);
                }

                block.parentNode.insertBefore(newBlock, block.nextSibling);
                return newBlock;
            }

            // 가장 가까운 블록 레벨 요소 찾기
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

// 백스페이스 키 처리
handleBackspace(e) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // 에디터가 비어있거나 마지막 블록인 경우 기본 동작 방지
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
    
    // 캐럿이 블록의 시작점에 있는 경우
    if (range.collapsed && this.isAtBlockStart(range)) {
        e.preventDefault();
        
        const currentBlock = this.getClosestBlock(range.startContainer);
        if (!currentBlock || currentBlock === this.editor) return;
        
        const previousBlock = currentBlock.previousElementSibling;
        if (!previousBlock) return;
        
        // 이전 블록과 병합
        this.mergeBlocks(previousBlock, currentBlock);
        this.createUndoPoint();
    }
    
    // 백스페이스 후 내용 정규화
    setTimeout(() => this.normalizeContent(), 0);
}

// 블록 병합
mergeBlocks(target, source) {
    const caretPosition = target.textContent.length;
    
    // 빈 <br> 제거
    if (target.innerHTML === '<br>') {
        target.innerHTML = '';
    }
    if (source.innerHTML === '<br>') {
        source.innerHTML = '';
    }
    
    // 내용 병합
    while (source.firstChild) {
        target.appendChild(source.firstChild);
    }
    source.remove();
    
    // 캐럿 위치 설정
    this.setCaretPosition(target, caretPosition);
    this.normalizeContent();
}

// 캐럿이 블록의 시작점에 있는지 확인
isAtBlockStart(range) {
    const block = this.getClosestBlock(range.startContainer);
    if (!block) return false;
    
    const blockRange = document.createRange();
    blockRange.selectNodeContents(block);
    blockRange.collapse(true);
    
    return range.compareBoundaryPoints(Range.START_TO_START, blockRange) === 0;
}

// 캐럿 위치 설정
setCaretPosition(element, offset) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    // 텍스트 노드 찾기
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

// 실행 취소 지점 생성
            createUndoPoint() {
                const currentContent = this.editor.innerHTML;
                if (currentContent === this.lastCheckpoint) return;
                
                this.undoStack.push(this.lastCheckpoint);
                this.lastCheckpoint = currentContent;
                this.redoStack = [];
                
                // 스택 크기 제한
                if (this.undoStack.length > 100) {
                    this.undoStack.shift();
                }
                
                this.updateUndoRedoButtons();
            }

            // 실행 취소
            undo() {
                if (this.undoStack.length === 0) return;
                
                const currentContent = this.editor.innerHTML;
                this.redoStack.push(currentContent);
                
                const previousContent = this.undoStack.pop();
                this.lastCheckpoint = previousContent;
                this.editor.innerHTML = previousContent;
                
                this.updateUndoRedoButtons();
            }

            // 다시 실행
            redo() {
                if (this.redoStack.length === 0) return;
                
                const currentContent = this.editor.innerHTML;
                this.undoStack.push(currentContent);
                
                const nextContent = this.redoStack.pop();
                this.lastCheckpoint = nextContent;
                this.editor.innerHTML = nextContent;
                
                this.updateUndoRedoButtons();
            }

// 노드 삽입 처리
handleNodeInserted(e) {
    if (e.target.nodeType === Node.TEXT_NODE && e.target.parentNode === this.editor) {
        const p = document.createElement('p');
        e.target.parentNode.insertBefore(p, e.target);
        p.appendChild(e.target);
        this.normalizeContent();
    }
}

// 요소를 현재 커서 위치에 삽입
insertAtCursor(element) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const currentBlock = this.getClosestBlock(range.startContainer);

    if (currentBlock && currentBlock !== this.editor) {
        // 현재 블록 다음에 삽입
        const wrapper = document.createElement('p');
        wrapper.appendChild(element);

        // 현재 블록 뒤에 삽입하되, 빈 줄바꿈이 중복되지 않도록 체크
        const nextSibling = currentBlock.nextElementSibling;
        if (!nextSibling || (nextSibling.tagName === 'P' && !nextSibling.textContent.trim() && !nextSibling.querySelector('br'))) {
            currentBlock.parentNode.insertBefore(wrapper, currentBlock.nextSibling);
        } else {
            currentBlock.parentNode.insertBefore(wrapper, nextSibling);
        }

        // 커서 이동
        const newRange = document.createRange();
        newRange.setStartAfter(wrapper);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        // 에디터가 비어있는 경우
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

// 블록 레벨 요소인지 확인
isBlockElement(element) {
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'];
    return blockTags.includes(element.tagName);
}

// 명령어 처리
handleCommand(command, button) {
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
            // 색상 선택 전에 현재 선택 영역 저장
            this.saveSelection();
            this.showColorPalette(command, button);
            break;
        case 'insertYouTube':
            this.insertYouTube();
            break;
        case 'insertCodeBlock':
            this.insertCodeBlock();
            break;
        case 'insertImage':
            this.showImageUploadModal();
            break;
        case 'createLink':
            this.showLinkModal();
            break;
        case 'attachFile':
            this.handleAttachFile();
            break;
        case 'insertTable':
            this.showTableModal();
            break;
        case "exportHTML":
            this.exportToHTML();
            break;
        default:
            // 기본 명령어 처리
            this.execCommand(command);
            // 토글 버튼 상태 업데이트
            if (['bold', 'italic', 'underline', 'strikeThrough'].includes(command)) {
                button.classList.toggle('active');
            }
            break;
    }
    
    this.createUndoPoint();
}

// 선택 영역 저장/복원 메서드 추가
saveSelection() {
    if (window.getSelection) {
        this.savedSelection = window.getSelection().getRangeAt(0).cloneRange();
    }
}

restoreSelection() {
    if (this.savedSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.savedSelection);
    }
}

// Modified execCommand method for T2Editor class
execCommand(command, value = null) {
    document.execCommand('styleWithCSS', false, true);
    
    switch(command) {
        case 'fontSize':
            // Get selection
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            // Create span with font-size style
            const span = document.createElement('span');
            span.style.fontSize = value + 'px';
            
            // Handle existing font size spans
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

// toggleAlignment 메서드 추가
toggleAlignment(button) {
    const alignments = ['left', 'center', 'right'];
    const commands = ['justifyLeft', 'justifyCenter', 'justifyRight'];
    const icons = ['format_align_left', 'format_align_center', 'format_align_right'];
    
    let currentIndex = alignments.indexOf(this.alignmentState);
    currentIndex = (currentIndex + 1) % alignments.length;
    
    this.alignmentState = alignments[currentIndex];
    button.querySelector('.material-icons').textContent = icons[currentIndex];
    
    // 현재 선택된 블록에 정렬 적용
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const block = this.getClosestBlock(range.commonAncestorContainer);
    
    if (block) {
        block.style.textAlign = this.alignmentState;
    }
    
    this.execCommand(commands[currentIndex]);
    this.createUndoPoint();
}

// 글꼴 크기 목록 표시
showFontSizeList(button) {
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
    
    // Get current font size
    const currentFontSize = this.getCurrentFontSize();
    
    sizes.forEach(size => {
        const option = document.createElement('div');
        option.className = 't2-font-size-option';
        
        // Check if this is the current size
        const isCurrentSize = parseInt(size) === currentFontSize;
        
        // Create container for the option content
        const optionContent = document.createElement('div');
        optionContent.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        `;
        
        // Size text
        const sizeText = document.createElement('span');
        sizeText.textContent = `${size}px`;
        optionContent.appendChild(sizeText);
        
        // Add checkmark or indicator for current size
        if (isCurrentSize) {
            const checkmark = document.createElement('span');
            checkmark.className = 'material-icons';
            checkmark.textContent = 'check';
            checkmark.style.fontSize = '16px';
            checkmark.style.color = '#1a73e8';
            optionContent.appendChild(checkmark);
        }
        
        option.appendChild(optionContent);
        
        // Apply style (with current size indicated)
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

// 드롭다운 표시 헬퍼 메서드
showDropdown(element, button) {
    const buttonRect = button.getBoundingClientRect();
    const toolbarRect = this.toolbar.getBoundingClientRect();
    
    // 드롭다운 컨테이너 생성
    const dropdownContainer = document.createElement('div');
    dropdownContainer.style.cssText = `
        position: absolute;
        top: ${buttonRect.bottom - toolbarRect.top}px;
        left: ${buttonRect.left - toolbarRect.left}px;
        z-index: 10000;
    `;
    
    // 드롭다운 요소를 컨테이너에 추가
    dropdownContainer.appendChild(element);
    this.toolbar.appendChild(dropdownContainer);
    
    // 드롭다운이 화면 밖으로 나가는지 확인
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

// 색상 팔레트 표시
showColorPalette(command, button) {
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
    
    const customColorDiv = document.createElement('div');
    customColorDiv.style.cssText = `
        grid-column: span 4;
        display: flex;
        gap: 5px;
        margin-top: 10px;
    `;

    const inputContainer = document.createElement('div');
    inputContainer.className = 't2-color-input-container';
    
    const hashSpan = document.createElement('span');
    hashSpan.textContent = '#';
    hashSpan.className = 't2-color-hash';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'text';
    colorInput.className = 't2-color-input';
    colorInput.maxLength = 6;
    
    inputContainer.appendChild(hashSpan);
    inputContainer.appendChild(colorInput);
    
    const applyButton = document.createElement('button');
    applyButton.textContent = '적용';
    applyButton.className = 't2-color-apply-btn';
    
    const expandHexColor = (hex) => {
        if (hex.length === 3) {
            return hex.split('').map(char => char + char).join('');
        }
        return hex;
    };
    
    const applyColor = () => {
        const colorValue = colorInput.value.trim();
        if (/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(colorValue)) {
            const finalColor = '#' + expandHexColor(colorValue);
            this.restoreSelection();
            this.execCommand(command, finalColor);
            palette.parentElement.remove();
            this.createUndoPoint();
        } else {
            alert('올바른 색상 코드를 입력해주세요. (예: FF0000 또는 F00)');
        }
    };
    
    applyButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyColor();
    });
    
    colorInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9A-Fa-f]/gi, '');
        if (value.length > 6) {
            value = value.slice(0, 6);
        }
        e.target.value = value;
    });
    
    colorInput.addEventListener('keypress', (e) => {
        if (colorInput.value.length >= 6 && colorInput.selectionStart === colorInput.selectionEnd) {
            e.preventDefault();
            return;
        }
        
        if (!/[0-9A-Fa-f]/i.test(e.key)) {
            e.preventDefault();
            return;
        }
        
        if (e.key === 'Enter') {
            e.preventDefault();
            applyColor();
        }
    });
    
    // 개선된 붙여넣기 처리
    colorInput.addEventListener('paste', (e) => {
        e.preventDefault();
        let pastedText = (e.clipboardData || window.clipboardData).getData('text');
        
        // #으로 시작하면 제거
        if (pastedText.startsWith('#')) {
            pastedText = pastedText.substring(1);
        }
        
        // 중간에 있는 # 제거
        pastedText = pastedText.replace(/#/g, '');
        
        // 16진수만 필터링
        pastedText = pastedText.replace(/[^0-9A-Fa-f]/gi, '');
        
        // 6자로 제한
        pastedText = pastedText.slice(0, 6);
        
        // 현재 선택된 텍스트 영역 고려
        const start = colorInput.selectionStart;
        const end = colorInput.selectionEnd;
        const currentValue = colorInput.value;
        
        // 선택 영역을 새로운 텍스트로 대체하고 6자 제한 유지
        const beforeSelection = currentValue.slice(0, start);
        const afterSelection = currentValue.slice(end);
        const newValue = (beforeSelection + pastedText + afterSelection).slice(0, 6);
        
        colorInput.value = newValue;
    });
    
    customColorDiv.appendChild(inputContainer);
    customColorDiv.appendChild(applyButton);
    palette.appendChild(customColorDiv);
    
    this.showDropdown(palette, button);
    colorInput.focus();
}

// YouTube 영상 ID 추출 및 동영상 URL 검증
getVideoType(url) {
    // YouTube URL 패턴
    const youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const youtubeMatch = url.match(youtubeRegExp);
    
    if (youtubeMatch && youtubeMatch[2].length === 11) {
        return { type: 'youtube', id: youtubeMatch[2] };
    }
    
    // 직접 비디오 URL 패턴
    const videoRegExp = /\.(mp4|webm|ogg)$/i;
    const videoMatch = url.match(videoRegExp);
    
    if (videoMatch) {
        return { type: 'video', url: url };
    }
    
    return null;
}

// 비디오 블록 생성
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

    // 컨트롤 생성 및 이벤트 핸들러 설정
    const controls = this.createVideoControls(videoContainer, videoElement, videoInfo, defaultWidth, defaultHeight);
    
    wrapper.appendChild(videoContainer);
    wrapper.appendChild(controls);
    
    return wrapper;
}

// 비디오 컨트롤 생성
createVideoControls(container, videoElement, videoInfo, defaultWidth, defaultHeight) {
    const controls = document.createElement('div');
    controls.className = 't2-media-controls';
    controls.contentEditable = false;

    controls.innerHTML = `
        <button class="t2-btn" onclick="event.preventDefault(); event.stopPropagation(); this.closest('.t2-media-block').remove()">
            <span class="material-icons">delete</span>
        </button>
        <button class="t2-btn edit-url-btn">
            <span class="material-icons">edit</span>
        </button>
        <input type="range" min="30" max="200" value="100" style="width: 100px;">
    `;

    // 크기 조절 이벤트
    const rangeInput = controls.querySelector('input[type="range"]');
    rangeInput.addEventListener('input', (e) => {
        const percentage = e.target.value;
        container.style.width = (defaultWidth * percentage / 100) + 'px';
        container.style.height = (defaultHeight * percentage / 100) + 'px';
    });

    // URL 편집 이벤트
    const editUrlBtn = controls.querySelector('.edit-url-btn');
    editUrlBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showVideoUrlEditModal(videoElement, videoInfo);
    });

    return controls;
}

// 비디오 URL 편집 모달
showVideoUrlEditModal(videoElement, currentVideoInfo) {
    const currentUrl = currentVideoInfo.type === 'youtube' 
        ? `https://youtube.com/watch?v=${currentVideoInfo.id}`
        : currentVideoInfo.url;
    
    const modal = document.createElement('div');
    modal.className = 't2-modal-overlay';
    
    modal.innerHTML = `
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

    const updateVideo = () => {
        const url = modal.querySelector('.t2-youtube-url').value;
        const videoInfo = this.getVideoType(url);
        
        if (!videoInfo) {
            alert('올바른 비디오 URL을 입력해주세요.');
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
        this.createUndoPoint();
        this.autoSave();
    };

    modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();
    modal.querySelector('[data-action="insert"]').onclick = updateVideo;
    
    modal.querySelector('.t2-youtube-url').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            updateVideo();
        }
    });

    document.body.appendChild(modal);
    modal.querySelector('.t2-youtube-url').focus();
}

// 비디오 삽입 메서드 
insertYouTube() {
    // 현재 커서 위치 저장
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const savedRange = range.cloneRange();

    const modal = document.createElement('div');
    modal.className = 't2-modal-overlay';
    
    modal.innerHTML = `
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

const insertVideo = () => {
    const url = modal.querySelector('.t2-youtube-url').value;
    const videoInfo = this.getVideoType(url);
    
    if (!videoInfo) {
        alert('올바른 비디오 URL을 입력해주세요.');
        return;
    }

    const videoBlock = this.createVideoBlock(videoInfo);
    
    // 저장된 커서 위치에 삽입
    selection.removeAllRanges();
    selection.addRange(savedRange);
    
    const currentBlock = this.getClosestBlock(savedRange.startContainer);
    if (currentBlock && currentBlock !== this.editor) {
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

    this.normalizeContent();
    this.createUndoPoint();
    this.autoSave();
    modal.remove();
};

    modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();
    modal.querySelector('[data-action="insert"]').onclick = insertVideo;
    
    modal.querySelector('.t2-youtube-url').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            insertVideo();
        }
    });

    document.body.appendChild(modal);
    modal.querySelector('.t2-youtube-url').focus();
}

// 코드 블록 삽입
insertCodeBlock() {
    const code = document.createElement('div');
    code.className = 't2-code-block';
    
    const pre = document.createElement('pre');
    const codeElement = document.createElement('code');
    codeElement.textContent = '코드를 입력하세요';
    codeElement.classList.add('code-placeholder');
    codeElement.setAttribute('contenteditable', 'true');  // 명시적으로 편집 가능하도록 설정
    pre.appendChild(codeElement);
    
    
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
    codeElement.addEventListener('keydown', function(e) {
        // Tab 키 처리
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    '); // 4칸 들여쓰기
        }
    });
    
    code.appendChild(pre);
    this.insertAtCursor(code);
}

resetEditor() {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    this.editor.innerHTML = '';
    this.editor.appendChild(p);
    this.setCaretToStart(p);
}

// 이미지 업로드 모달 표시
showImageUploadModal() {
    const modal = document.createElement('div');
    modal.className = 't2-modal-overlay';
    
    modal.innerHTML = `
        <div class="t2-image-editor-modal">
            <h3>이미지 추가</h3>
            <div class="t2-image-tabs">
                <button class="t2-tab active" data-tab="upload">파일 업로드</button>
                <button class="t2-tab" data-tab="url">이미지 URL</button>
            </div>
            <div class="t2-tab-content">
                <div class="t2-tab-pane active" data-pane="upload">
                    <div class="t2-image-preview-grid"></div>
                    <form enctype="multipart/form-data" method="post" class="t2-image-upload-form">
                        <div class="t2-image-upload-area">
                            <span class="material-icons">cloud_upload</span>
                            <div class="t2-image-upload-text">클릭하여 이미지 선택</div>
                            <div class="t2-image-upload-hint">또는 이미지를 여기로 드래그하세요</div>
                            <input type="file" name="bf_file[]" accept="image/*" multiple>
                            <input type="hidden" name="uid" value="${this.generateUid()}">
                        </div>
                    </form>
                </div>
                <div class="t2-tab-pane" data-pane="url">
                    <div class="t2-url-input-container">
                        <input type="text" class="t2-image-url-input" placeholder="이미지 URL을 입력하세요">
                        <div class="t2-url-preview"></div>
                    </div>
                </div>
            </div>
            <div class="t2-btn-group">
                <button type="button" class="t2-btn" data-action="cancel">취소</button>
                <button type="button" class="t2-btn" data-action="upload" disabled>추가</button>
            </div>
        </div>
    `;

    const previewGrid = modal.querySelector('.t2-image-preview-grid');
    const fileInput = modal.querySelector('input[type="file"]');
    const uploadBtn = modal.querySelector('[data-action="upload"]');
    const uploadArea = modal.querySelector('.t2-image-upload-area');
    const form = modal.querySelector('.t2-image-upload-form');
    const urlInput = modal.querySelector('.t2-image-url-input');
    const urlPreview = modal.querySelector('.t2-url-preview');
    
    const previewFiles = new Map();
    let imageUrl = '';

    // 탭 전환 처리
    modal.querySelectorAll('.t2-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // 활성 탭 변경
            modal.querySelectorAll('.t2-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 탭 컨텐츠 변경
            const targetPane = tab.dataset.tab;
            modal.querySelectorAll('.t2-tab-pane').forEach(pane => {
                pane.classList.remove('active');
                if (pane.dataset.pane === targetPane) {
                    pane.classList.add('active');
                }
            });

            // 업로드 버튼 상태 업데이트
            if (targetPane === 'upload') {
                uploadBtn.disabled = previewFiles.size === 0;
            } else {
                uploadBtn.disabled = !imageUrl;
            }
        });
    });

    // URL 입력 처리
    let urlPreviewDebounce;
    urlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        clearTimeout(urlPreviewDebounce);
        
        urlPreviewDebounce = setTimeout(() => {
            if (url) {
                // URL 유효성 검사
                const img = new Image();
                img.onload = () => {
                    imageUrl = url;
                    urlPreview.innerHTML = `
                        <div class="t2-url-preview-image">
                            <img src="${url}" alt="URL Preview">
                        </div>
                    `;
                    uploadBtn.disabled = false;
                };
                img.onerror = () => {
                    imageUrl = '';
                    urlPreview.innerHTML = `
                        <div class="t2-url-preview-error">
                            올바른 이미지 URL이 아닙니다
                        </div>
                    `;
                    uploadBtn.disabled = true;
                };
                img.src = url;
            } else {
                imageUrl = '';
                urlPreview.innerHTML = '';
                uploadBtn.disabled = true;
            }
        }, 300);
    });

    const handleFiles = (files) => {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 't2-preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="t2-preview-remove">
                        <span class="material-icons">close</span>
                    </button>
                `;

                const removeBtn = previewItem.querySelector('.t2-preview-remove');
                removeBtn.onclick = () => {
                    previewFiles.delete(file);
                    previewItem.remove();
                    uploadBtn.disabled = previewFiles.size === 0;
                };

                previewFiles.set(file, previewItem);
                previewGrid.appendChild(previewItem);
                uploadBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        });
    };

    fileInput.onchange = (e) => handleFiles(e.target.files);

    // 드래그 앤 드롭 처리
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    };

    uploadArea.ondragleave = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    };

    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    };

    // 취소 버튼
    modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();

    // 추가 버튼
// showImageUploadModal 메서드 내의 업로드 버튼 핸들러 수정
modal.querySelector('[data-action="upload"]').onclick = () => {
    const activeTab = modal.querySelector('.t2-tab.active').dataset.tab;
    
    if (activeTab === 'upload') {
        if (previewFiles.size > 0) {
            this.handleMultipleImageUpload(form, Array.from(previewFiles.keys()));
        }
    } else if (activeTab === 'url' && imageUrl) {
        this.handleUrlImageUpload(imageUrl);
    }
    
    modal.remove();
};

    document.body.appendChild(modal);
}

// URL 이미지 업로드 처리
async handleUrlImageUpload(url) {
    try {
        // 이미지 다운로드 및 캡처 함수
        const captureImage = async (url) => {
            // 프록시 URL 목록
            const proxyUrls = [
                url => url, // 직접 시도
                url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
                url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
                url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                url => `https://proxy.cors.sh/${url}`,
                url => `https://cors-anywhere.herokuapp.com/${url}`
            ];

            // 다양한 방법으로 이미지 로드 시도
            const tryLoadImage = async (url, method) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    const container = document.createElement('div');
                    container.style.cssText = 'position: fixed; left: -9999px; top: -9999px; visibility: hidden;';
                    document.body.appendChild(container);

                    const cleanup = () => {
                        if (container.parentNode) {
                            container.parentNode.removeChild(container);
                        }
                        URL.revokeObjectURL(img.src);
                    };

                    img.onload = () => {
                        try {
                            // 캔버스 생성 및 이미지 그리기
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // 이미지 크기 제한 및 비율 계산
                            const maxSize = 2000;
                            let width = img.naturalWidth;
                            let height = img.naturalHeight;
                            
                            if (width > maxSize || height > maxSize) {
                                const ratio = Math.min(maxSize / width, maxSize / height);
                                width = Math.floor(width * ratio);
                                height = Math.floor(height * ratio);
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            
                            // 배경을 흰색으로 설정
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, width, height);
                            
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            canvas.toBlob((blob) => {
                                cleanup();
                                if (blob && blob.size > 0) {
                                    resolve({ blob, width, height });
                                } else {
                                    reject(new Error('빈 이미지'));
                                }
                            }, 'image/jpeg', 0.92);
                        } catch (error) {
                            cleanup();
                            reject(error);
                        }
                    };

                    img.onerror = () => {
                        cleanup();
                        reject(new Error(`로드 실패 (${method})`));
                    };

                    // 이미지 로드 시도
                    switch (method) {
                        case 'crossOrigin':
                            img.crossOrigin = 'anonymous';
                            img.src = url;
                            break;
                        case 'direct':
                            img.removeAttribute('crossOrigin');
                            img.src = url;
                            break;
                        case 'blob':
                            fetch(url, {
                                mode: 'cors',
                                credentials: 'omit'
                            })
                            .then(response => response.blob())
                            .then(blob => {
                                img.src = URL.createObjectURL(blob);
                            })
                            .catch(() => {
                                cleanup();
                                reject(new Error('Blob fetch 실패'));
                            });
                            break;
                        default:
                            cleanup();
                            reject(new Error('알 수 없는 방법'));
                    }

                    container.appendChild(img);

                    // 타임아웃 설정
                    setTimeout(() => {
                        cleanup();
                        reject(new Error('시간 초과'));
                    }, 10000);
                });
            };

            // 모든 프록시와 방법을 시도
            const methods = ['crossOrigin', 'direct', 'blob'];
            let lastError = null;

            for (const proxyUrl of proxyUrls) {
                for (const method of methods) {
                    try {
                        alert(`이미지 다운로드 시도... (${method})`);
                        const result = await tryLoadImage(proxyUrl(url), method);
                        if (result) return result;
                    } catch (error) {
                        lastError = error;
                        console.log(`시도 실패 (${method}):`, error.message);
                        continue;
                    }
                }
            }

            throw lastError || new Error('모든 다운로드 시도 실패');
        };

        // 이미지 캡처 시작
        const { blob, width, height } = await captureImage(url);
        
        // Blob을 File 객체로 변환
        const fileName = `image_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        alert(`이미지 캡처 완료: ${fileName} (${file.size} bytes)`);

        // FormData 생성 및 설정
        const formData = new FormData();
        formData.append('bf_file[]', file);
        formData.append('uid', this.generateUid());

        // 서버에 업로드
        alert('서버 업로드 시작...');
        const response = await fetch(this.basePath + 'image_upload.php', {
            method: 'POST',
            body: formData
        });

        const data = await uploadResponse.json();
        if (!data.success) {
            throw new Error(data.message || '업로드 실패');
        }

        // 이미지 블록 생성
        alert('이미지 블록 생성 중...');
        const selection = window.getSelection();
        let currentBlock = this.editor.lastElementChild;

        if (!currentBlock) {
            currentBlock = document.createElement('p');
            currentBlock.innerHTML = '<br>';
            this.editor.appendChild(currentBlock);
        }

        const topBreak = document.createElement('p');
        topBreak.innerHTML = '<br>';
        currentBlock.parentNode.insertBefore(topBreak, currentBlock.nextSibling);
        
        data.files.forEach(file => {
            const mediaBlock = document.createElement('div');
            mediaBlock.className = 't2-media-block';
            
            const container = document.createElement('div');
            container.style.width = file.width + 'px';
            container.style.maxWidth = '100%';
            container.style.margin = '0 auto';
            
            const img = document.createElement('img');
            img.src = file.url;
            img.style.width = '100%';
            img.dataset.width = file.width;
            img.dataset.height = file.height;
            
            container.appendChild(img);
            mediaBlock.appendChild(container);
            
            const controls = this.createMediaControls(container, img);
            mediaBlock.appendChild(controls);
            
            const wrapper = document.createElement('p');
            wrapper.appendChild(mediaBlock);
            
            topBreak.parentNode.insertBefore(wrapper, topBreak.nextSibling);
            
            const bottomBreak = document.createElement('p');
            bottomBreak.innerHTML = '<br>';
            wrapper.parentNode.insertBefore(bottomBreak, wrapper.nextSibling);
            
            if (selection) {
                const newRange = document.createRange();
                newRange.setStartAfter(bottomBreak);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        });
        
        this.normalizeContent();
        this.createUndoPoint();
        this.autoSave();

        alert('이미지 업로드 및 삽입 완료!');
    } catch (error) {
        console.error('이미지 처리 중 오류:', error);
        alert(`이미지 처리 중 오류가 발생했습니다.\n상세 오류: ${error.message}`);
    }
}

handleMultipleImageUpload(form, files) {
    const formData = new FormData(form);
    formData.delete('bf_file[]');
    files.forEach(file => formData.append('bf_file[]', file));

    fetch(this.basePath + 'image_upload.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const currentBlock = this.getClosestBlock(range.startContainer);
            
            if (currentBlock && currentBlock !== this.editor) {
                const topBreak = document.createElement('p');
                topBreak.innerHTML = '<br>';
                currentBlock.parentNode.insertBefore(topBreak, currentBlock.nextSibling);
                
                let lastElement = topBreak;
                
                data.files.forEach(file => {
                    const mediaBlock = document.createElement('div');
                    mediaBlock.className = 't2-media-block';
                    
                    const container = document.createElement('div');
                    container.style.width = file.width + 'px';
                    container.style.maxWidth = '100%';
                    container.style.margin = '0 auto';
                    
                    const img = document.createElement('img');
                    img.src = file.url;
                    img.style.width = '100%';
                    img.dataset.width = file.width;
                    img.dataset.height = file.height;
                    
                    container.appendChild(img);
                    mediaBlock.appendChild(container);
                    
                    // 각 이미지에 대한 컨트롤 생성 및 이벤트 연결
                    const controls = this.createMediaControls(container, img);
                    mediaBlock.appendChild(controls);
                    
                    const wrapper = document.createElement('p');
                    wrapper.appendChild(mediaBlock);
                    
                    lastElement.parentNode.insertBefore(wrapper, lastElement.nextSibling);
                    
                    const breakLine = document.createElement('p');
                    breakLine.innerHTML = '<br>';
                    wrapper.parentNode.insertBefore(breakLine, wrapper.nextSibling);
                    
                    lastElement = breakLine;
                });
                
                const range = document.createRange();
                range.setStartAfter(lastElement);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                
                this.normalizeContent();
                this.createUndoPoint();
            }
        } else {
            alert('이미지 업로드 실패: ' + data.message);
        }
    })
    .catch(error => {
        console.error('업로드 에러:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
    });
}

// uid 생성
generateUid() {
    const random = Math.floor(Math.random() * 1000000000);
    const timestamp = new Date().getTime();
    return `${random}${timestamp}`;
}

// 이미지 변형 업데이트
updateImageTransform(image, rotation, flipped) {
   image.style.transform = `
       rotate(${rotation}deg)
       scaleX(${flipped ? -1 : 1})
   `;
}

// 붙여넣기 처리
handlePaste(clipboardData) {
    // 이미지 붙여넣기 처리
    if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
            const item = clipboardData.items[i];
            
            // 이미지 타입 체크
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    // 이미지 파일을 FormData에 추가
                    const formData = new FormData();
                    formData.append('bf_file[]', file);
                    formData.append('uid', this.generateUid());

                    // 이미지 업로드 요청
                    fetch(this.basePath + 'image_upload.php', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // 성공적으로 업로드된 경우 이미지 블록 생성
                            const selection = window.getSelection();
                            let currentBlock = this.editor.lastElementChild;

                            if (!currentBlock) {
                                currentBlock = document.createElement('p');
                                currentBlock.innerHTML = '<br>';
                                this.editor.appendChild(currentBlock);
                            }

                            const topBreak = document.createElement('p');
                            topBreak.innerHTML = '<br>';
                            currentBlock.parentNode.insertBefore(topBreak, currentBlock.nextSibling);
                            
                            data.files.forEach(file => {
                                const mediaBlock = document.createElement('div');
                                mediaBlock.className = 't2-media-block';
                                
                                const container = document.createElement('div');
                                container.style.width = file.width + 'px';
                                container.style.maxWidth = '100%';
                                container.style.margin = '0 auto';
                                
                                const img = document.createElement('img');
                                img.src = file.url;
                                img.style.width = '100%';
                                img.dataset.width = file.width;
                                img.dataset.height = file.height;
                                
                                container.appendChild(img);
                                mediaBlock.appendChild(container);
                                
                                const controls = this.createMediaControls(container, img);
                                mediaBlock.appendChild(controls);
                                
                                const wrapper = document.createElement('p');
                                wrapper.appendChild(mediaBlock);
                                
                                topBreak.parentNode.insertBefore(wrapper, topBreak.nextSibling);
                                
                                const bottomBreak = document.createElement('p');
                                bottomBreak.innerHTML = '<br>';
                                wrapper.parentNode.insertBefore(bottomBreak, wrapper.nextSibling);
                                
                                if (selection) {
                                    const newRange = document.createRange();
                                    newRange.setStartAfter(bottomBreak);
                                    newRange.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(newRange);
                                }
                            });
                            
                            this.normalizeContent();
                            this.createUndoPoint();
                            this.autoSave();
                        } else {
                            alert('이미지 업로드 실패: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('이미지 업로드 에러:', error);
                        alert('이미지 업로드 중 오류가 발생했습니다.');
                    });

                    return; // 이미지 처리 후 종료
                }
            }
        }
    }

    // 테이블 및 HTML 붙여넣기 처리
    const htmlText = clipboardData.getData('text/html');
    
    // 붙여넣은 HTML에 테이블이 있는 경우 특별 처리
    if (htmlText && htmlText.includes('<table')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        
        const tables = tempDiv.querySelectorAll('table');
        tables.forEach(origTable => {
            // 원본 테이블 복사 및 클래스 추가
            const table = origTable.cloneNode(true);
            table.className = 't2-table';
            table.setAttribute('data-t2-table', 'true');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            
            // 모든 셀에 스타일 적용
            const cells = table.querySelectorAll('td, th');
            cells.forEach(cell => {
                cell.style.border = '1px solid #ccc';
                cell.style.padding = '8px';
                if (cell.tagName === 'TH') {
                    cell.style.backgroundColor = '#f5f5f5';
                }
            });
            
            // 테이블 래퍼 생성
            const tableWrapper = document.createElement('div');
            tableWrapper.className = 't2-table-wrapper';
            tableWrapper.contentEditable = false;
            tableWrapper.appendChild(table);
            
            // 테이블 컨트롤 메뉴 생성
            const tableControls = document.createElement('div');
            tableControls.className = 't2-table-controls';
            tableControls.innerHTML = `
                <div class="t2-table-control-group">
                    <span>가로:</span>
                    <button class="t2-btn t2-table-control-btn" data-action="add-col">
                        <span class="material-icons">add</span>
                    </button>
                    <button class="t2-btn t2-table-control-btn" data-action="remove-col">
                        <span class="material-icons">remove</span>
                    </button>
                </div>
                <div class="t2-table-control-group">
                    <span>세로:</span>
                    <button class="t2-btn t2-table-control-btn" data-action="add-row">
                        <span class="material-icons">add</span>
                    </button>
                    <button class="t2-btn t2-table-control-btn" data-action="remove-row">
                        <span class="material-icons">remove</span>
                    </button>
                </div>
                <button class="t2-btn t2-table-delete-btn" data-action="delete-table">
                    <span class="material-icons">close</span>
                </button>
            `;
            
            tableWrapper.appendChild(tableControls);
            
            // 원본 테이블을 래퍼로 교체
            this.insertAtCursor(tableWrapper);
            
            // 테이블 컨트롤 이벤트 및 셀 편집 설정
            this.setupTableControlEvents(tableControls, table);
            this.setupTableCellEditing(table);
        });
        
        // 기타 HTML 내용도 함께 처리하기
        const otherContent = Array.from(tempDiv.childNodes).filter(node => 
            node.nodeName !== 'TABLE'
        );
        
        if (otherContent.length > 0) {
            const fragment = document.createDocumentFragment();
            otherContent.forEach(node => {
                fragment.appendChild(node.cloneNode(true));
            });
            
            if (fragment.childNodes.length > 0) {
                // 선택 영역 가져오기
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                
                // 현재 블록 찾기
                let currentBlock = this.getClosestBlock(range.startContainer);
                
                // HTML을 현재 위치에 삽입
                range.deleteContents();
                range.insertNode(fragment);
                
                // 커서 위치 설정
                const lastInsertedNode = range.commonAncestorContainer.lastChild || range.commonAncestorContainer;
                const newRange = document.createRange();
                newRange.setStartAfter(lastInsertedNode);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
        
        this.normalizeContent();
        this.createUndoPoint();
        return; // 테이블 처리 후 종료
    }

    // 일반 텍스트 붙여넣기 처리
    const plainText = clipboardData.getData('text/plain');
    
    // 선택 영역 가져오기
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // 현재 블록 찾기
    let currentBlock = this.getClosestBlock(range.startContainer);
    
    // 현재 블록이 없으면 새로 생성
    if (!currentBlock || currentBlock === this.editor) {
        currentBlock = document.createElement('p');
        this.editor.appendChild(currentBlock);
    }
    
    // HTML이 있는 경우와 일반 텍스트만 있는 경우를 구분하여 처리
    if (htmlText && !this.isIOS && !this.isSafari) {
        // HTML 파싱을 위한 임시 컨테이너 생성
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        
        // 불필요한 스타일과 속성 제거
        this.cleanupPastedHTML(tempDiv);
        
        // 파싱된 내용을 현재 위치에 삽입
        range.deleteContents();
        
        // 각 최상위 노드를 적절한 블록으로 변환하여 삽입
        Array.from(tempDiv.childNodes).forEach((node, index) => {
            let block;
            
            if (node.nodeType === Node.TEXT_NODE) {
                // 텍스트 노드는 p 태그로 감싸기
                block = document.createElement('p');
                block.appendChild(node.cloneNode());
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (this.isBlockElement(node)) {
                    // 블록 요소는 그대로 사용
                    block = node.cloneNode(true);
                } else {
                    // 인라인 요소는 p 태그로 감싸기
                    block = document.createElement('p');
                    block.appendChild(node.cloneNode(true));
                }
            }
            
            if (block) {
                if (index === 0 && range.collapsed) {
                    // 첫 번째 블록은 현재 위치에 삽입
                    range.insertNode(block);
                } else {
                    // 나머지 블록은 이전 블록 다음에 삽입
                    currentBlock.parentNode.insertBefore(block, currentBlock.nextSibling);
                }
                currentBlock = block;
            }
        });
    } else {
        // 일반 텍스트 처리
        const lines = plainText.split(/\r?\n/);
        
        lines.forEach((line, index) => {
            if (index === 0 && range.collapsed) {
                // 첫 번째 줄은 현재 커서 위치에 삽입
                document.execCommand('insertText', false, line);
            } else {
                // 새로운 블록 생성
                const p = document.createElement('p');
                p.textContent = line || '\u200B'; // 빈 줄의 경우 제로폭 공백 추가
                if (!line) {
                    p.appendChild(document.createElement('br'));
                }
                
                // 새 블록을 현재 블록 다음에 삽입
                currentBlock.parentNode.insertBefore(p, currentBlock.nextSibling);
                currentBlock = p;
            }
        });
    }
    
    // 내용 정규화 및 언두 포인트 생성
    this.normalizeContent();
    this.createUndoPoint();
}

// HTML 정리를 위한 새로운 메서드 추가
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
        // 스타일 속성 제거
        node.removeAttribute('style');
        node.removeAttribute('class');
        
        // 불필요한 태그 제거
        if (['STYLE', 'SCRIPT', 'META'].includes(node.tagName)) {
            nodesToRemove.push(node);
        }
        
        // 빈 블록 처리
        if (this.isBlockElement(node) && !node.textContent.trim()) {
            node.innerHTML = '<br>';
        }
    }
    
    // 제거할 노드들 삭제
    nodesToRemove.forEach(node => node.parentNode.removeChild(node));
}

getYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

    // 자동 저장 토글 UI 설정
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

        // 로고 다음에 토글 삽입
        const logo = statusBar.querySelector('.t2-logo').parentElement;
        logo.parentNode.insertBefore(autoSaveToggle, logo.nextSibling);
    }

    // 자동 저장 메서드 수정
    autoSave() {
        if (!this.autoSaveEnabled) return;

        const content = this.editor.innerHTML;
        // 모든 빈 p 태그를 <p><br></p>로 정규화
        const normalizedContent = content.replace(/<p>\s*<\/p>/g, '<p><br></p>');
        localStorage.setItem('t2editor-autosave', normalizedContent);
    }

    // 자동 저장 데이터 로드 메서드 수정
    loadAutoSave() {
        if (!this.autoSaveEnabled) return;

        const saved = localStorage.getItem('t2editor-autosave');
        if (saved) {
            this.editor.innerHTML = saved;
            this.normalizeContent();
        }
    }

    // 자동 저장 데이터 삭제 메서드 수정
    clearAutoSave() {
        localStorage.removeItem('t2editor-autosave');
    }

    // 페이지 이탈 시 처리 메서드 수정
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            if (this.autoSaveEnabled) {
                this.autoSave();
            }
        });
    }

setContent(html) {
    if (!html) return;
    
    this.editor.innerHTML = html;
    
    // 미디어 요소 처리
    this.editor.querySelectorAll('img, iframe[src*="youtube"], video').forEach(media => {
        if (!media.closest('.t2-media-block')) {
            const width = media.style.width ? parseInt(media.style.width) : (media.width || 320);
            const height = media.style.height ? parseInt(media.style.height) : (media.height || 180);
            
            const wrapper = document.createElement('div');
            wrapper.className = 't2-media-block';
            
            const container = document.createElement('div');
            container.style.width = `${width}px`;
            container.style.maxWidth = '100%';
            container.style.margin = '0 auto';
            
            const clonedMedia = media.cloneNode(true);
            clonedMedia.style.width = '100%';
            
            if (clonedMedia.tagName === 'IFRAME' || clonedMedia.tagName === 'VIDEO') {
                container.style.height = `${height}px`;
                clonedMedia.style.height = '100%';
            }
            
            container.appendChild(clonedMedia);
            wrapper.appendChild(container);
            
            const controls = this.createMediaControls(container, clonedMedia);
            wrapper.appendChild(controls);
            
            const p = document.createElement('p');
            p.appendChild(wrapper);
            media.parentNode.replaceChild(p, media);
        }
    });
    
    // 기존 미디어 블록 처리
    this.editor.querySelectorAll('.t2-media-block').forEach(block => {
        const container = block.querySelector('div:first-child');
        const mediaElement = container?.querySelector('img, iframe, video');
        
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
            if (mediaElement.tagName === 'IFRAME' || mediaElement.tagName === 'VIDEO') {
                mediaElement.style.height = '100%';
            }
            
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
            const controls = this.createMediaControls(container, mediaElement);
            block.appendChild(controls);
        }
    });

    // 파일 아이콘 블록 처리 - 새로 추가
    this.editor.querySelectorAll('.t2-file-block').forEach(block => {
        // 이미 올바르게 초기화된 블록이면 건너뛰기
        if (block.querySelector('.t2-media-controls')) return;
        
        // 링크 정보 추출
        const linkElements = block.querySelectorAll('a[href]');
        if (linkElements.length === 0) return;
        
        // 첫 번째 링크를 기준으로 사용 (가장 안정적)
        const fileLink = linkElements[0];
        const url = fileLink.getAttribute('href');
        
        // 파일 정보 추출
        let fileName = '';
        let dateSpan = '';
        let sizeSpan = '';
        
        // 파일명 추출
        const fileNameElement = block.querySelector('.file-name');
        if (fileNameElement) {
            fileName = fileNameElement.textContent.trim();
        }
        
        // 날짜와 크기 정보 추출
        const detailSpans = block.querySelectorAll('.file-details span');
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

    // 테이블 처리 추가
    this.editor.querySelectorAll('.table-responsive').forEach(responsiveWrapper => {
        const table = responsiveWrapper.querySelector('table');
        if (table) {
            if (!table.classList.contains('t2-table')) table.classList.add('t2-table');

            const tableWrapper = document.createElement('div');
            tableWrapper.className = 't2-table-wrapper';
            tableWrapper.contentEditable = false;

            const cols = table.querySelector('tr')?.children.length || 0;
            const rows = table.querySelectorAll('tr').length;
            const cellWidth = 50;
            const padding = 12 * 2;
            const tableWidth = cols * (cellWidth + padding);
            const mediaBlockWidth = 320;
            const editorWidth = this.editor.clientWidth;
            const needsScroll = tableWidth > mediaBlockWidth || tableWidth > editorWidth;

            if (needsScroll) {
                const scrollWrapper = document.createElement('div');
                scrollWrapper.className = 't2-table-scroll-wrapper';
                scrollWrapper.appendChild(table);
                tableWrapper.appendChild(scrollWrapper);
                table.classList.add('t2-table-large');
            } else {
                tableWrapper.appendChild(table);
                table.classList.remove('t2-table-large');
            }

            responsiveWrapper.parentNode.insertBefore(tableWrapper, responsiveWrapper);
            responsiveWrapper.remove();

            const tableControls = this.createTableControls(table, rows, cols);
            tableWrapper.appendChild(tableControls);

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 't2-table-download-btn';
            downloadBtn.innerHTML = '<span class="material-icons">download</span>';
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.exportTableToCSV(table);
            });
            tableWrapper.appendChild(downloadBtn);

            this.setupTableControlEvents(tableControls, table);
            this.setupTableCellEditing(table);
            this.setupTableResizing(table);
        }
    });
    
    // 테이블 초기화 처리 추가
    this.initializeTableBlocks();
    
    this.normalizeContent();
}

createMediaControls(container, mediaElement) {
    const controls = document.createElement('div');
    controls.className = 't2-media-controls';
    controls.contentEditable = false;

    // Get the original dimensions
    const width = parseInt(mediaElement.dataset.width) || parseInt(container.style.width) || 320;
    const height = parseInt(mediaElement.dataset.height) || parseInt(container.style.height) || 180;
    
    // Calculate max width based on editor width
    const editorWidth = this.editor.clientWidth;
    const maxWidthPercentage = Math.min(100, Math.floor((editorWidth / width) * 100));
    
    // Calculate current width percentage
    const currentWidth = parseInt(container.style.width);
    const percentage = Math.round((currentWidth / width) * 100);

    controls.innerHTML = `
        <button class="t2-btn delete-btn">
            <span class="material-icons">delete</span>
        </button>
        ${mediaElement.tagName === 'IFRAME' ? `
            <button class="t2-btn edit-url-btn">
                <span class="material-icons">edit</span>
            </button>
        ` : ''}
        <input type="range" min="30" max="${maxWidthPercentage}" value="${percentage}" class="size-slider" style="width: 100px;">
    `;

    const sizeSlider = controls.querySelector('.size-slider');
    if (sizeSlider) {
        // Add resize observer to handle editor width changes
        const resizeObserver = new ResizeObserver(() => {
            const newEditorWidth = this.editor.clientWidth;
            const newMaxPercentage = Math.min(100, Math.floor((newEditorWidth / width) * 100));
            sizeSlider.max = newMaxPercentage;
            
            // Adjust current value if it exceeds new max
            if (parseInt(sizeSlider.value) > newMaxPercentage) {
                sizeSlider.value = newMaxPercentage;
                const newWidth = Math.round((width * newMaxPercentage) / 100);
                const newHeight = Math.round((height * newMaxPercentage) / 100);
                
                container.style.width = `${newWidth}px`;
                container.style.maxWidth = '100%'; // Ensure container doesn't overflow
                mediaElement.style.width = '100%'; // Keep media element within container
                
                if (mediaElement.tagName === 'IFRAME' || mediaElement.tagName === 'VIDEO') {
                    container.style.height = `${newHeight}px`;
                    mediaElement.style.height = '100%';
                }
            }
        });
        
        resizeObserver.observe(this.editor);

        sizeSlider.addEventListener('input', (e) => {
            const percentage = parseInt(e.target.value);
            const newWidth = Math.round((width * percentage) / 100);
            const newHeight = Math.round((height * percentage) / 100);
            
            container.style.width = `${newWidth}px`;
            container.style.maxWidth = '100%';
            mediaElement.style.width = '100%';
            
            if (mediaElement.tagName === 'IFRAME' || mediaElement.tagName === 'VIDEO') {
                container.style.height = `${newHeight}px`;
                mediaElement.style.height = '100%';
            }
            
            // Update data attributes
            mediaElement.dataset.currentWidth = newWidth;
            mediaElement.dataset.currentHeight = newHeight;
        });
    }

    // Delete button event
    const deleteBtn = controls.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            controls.closest('.t2-media-block').remove();
        });
    }

    // Edit URL button event for iframes
    const editUrlBtn = controls.querySelector('.edit-url-btn');
    if (editUrlBtn && mediaElement.tagName === 'IFRAME') {
        editUrlBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const videoId = mediaElement.src.match(/embed\/([^?]+)/)?.[1];
            if (videoId) {
                this.showVideoUrlEditModal(mediaElement, { type: 'youtube', id: videoId });
            }
        });
    }

    return controls;
}

// attachControlEvents 메서드 추가
attachControlEvents(controls, container, mediaElement, originalWidth, originalHeight) {
    // 삭제 버튼
    controls.querySelector('.delete-btn')?.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        controls.closest('.t2-media-block').remove();
    });

    // 크기 조절
    const sizeSlider = controls.querySelector('.size-slider');
    if (sizeSlider) {
        sizeSlider.addEventListener('input', e => {
            const percentage = e.target.value;
            container.style.width = `${(originalWidth * percentage / 100)}px`;
            if (mediaElement.tagName === 'IFRAME' || mediaElement.tagName === 'VIDEO') {
                container.style.height = `${(originalHeight * percentage / 100)}px`;
            }
        });
    }

    // URL 편집 버튼
    const editUrlBtn = controls.querySelector('.edit-url-btn');
    if (editUrlBtn && mediaElement.tagName === 'IFRAME') {
        editUrlBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const videoId = mediaElement.src.match(/embed\/([^?]+)/)?.[1];
            if (videoId) {
                this.showVideoUrlEditModal(mediaElement, { type: 'youtube', id: videoId });
            }
        });
    }
}

// 미디어 컨트롤 초기화 메서드 추가
initializeMediaControls() {
    this.editor.querySelectorAll('.t2-media-block').forEach(block => {
        const container = block.querySelector('div:first-child');
        const mediaElement = container.querySelector('img, iframe, video');
        const existingControls = block.querySelector('.t2-media-controls');
        
        if (existingControls) {
            const newControls = this.createMediaControls(container, mediaElement);
            block.replaceChild(newControls, existingControls);
        }
    });
}

// t2editor.js의 initializeBlocks 메서드 수정
initializeBlocks() {
    // 이미지 블록 초기화
    this.editor.querySelectorAll('img:not(.t2-media-block img)').forEach(img => {
        const width = parseInt(img.style.width) || img.naturalWidth || 320;
        const height = parseInt(img.style.height) || img.naturalHeight || 180;
        const wrapper = this.createMediaBlock(img.src, width, height, 'image');
        img.parentNode.replaceChild(wrapper, img);
    });

    // 유튜브 블록 초기화
    this.editor.querySelectorAll('iframe[src*="youtube"]:not(.t2-media-block iframe)').forEach(frame => {
        const width = parseInt(frame.style.width) || 320;
        const height = parseInt(frame.style.height) || 180;
        const wrapper = this.createMediaBlock(frame.src, width, height, 'youtube');
        frame.parentNode.replaceChild(wrapper, frame);
    });

    // 테이블 블록 초기화 추가
    this.initializeTableBlocks();
}

initializeTableBlocks() {
    this.editor.querySelectorAll('table.t2-table, .table-responsive table').forEach(table => {
        let tableWrapper = table.closest('.t2-table-wrapper');
        const isInResponsive = table.closest('.table-responsive');

        if (!tableWrapper) {
            tableWrapper = document.createElement('div');
            tableWrapper.className = 't2-table-wrapper';
            tableWrapper.contentEditable = false;

            const cols = table.querySelector('tr')?.children.length || 0;
            const rows = table.querySelectorAll('tr').length;
            const cellWidth = 50;
            const padding = 12 * 2;
            const tableWidth = cols * (cellWidth + padding);
            const mediaBlockWidth = 320;
            const editorWidth = this.editor.clientWidth;
            const needsScroll = tableWidth > mediaBlockWidth || tableWidth > editorWidth;

            if (isInResponsive) {
                const responsiveWrapper = table.closest('.table-responsive');
                responsiveWrapper.parentNode.insertBefore(tableWrapper, responsiveWrapper);
                responsiveWrapper.remove();
            } else {
                table.parentNode.insertBefore(tableWrapper, table);
            }

            if (needsScroll) {
                const scrollWrapper = document.createElement('div');
                scrollWrapper.className = 't2-table-scroll-wrapper';
                scrollWrapper.appendChild(table);
                tableWrapper.appendChild(scrollWrapper);
                table.classList.add('t2-table-large');
            } else {
                tableWrapper.appendChild(table);
                table.classList.remove('t2-table-large');
            }

            const tableControls = this.createTableControls(table, rows, cols);
            tableWrapper.appendChild(tableControls);

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 't2-table-download-btn';
            downloadBtn.innerHTML = '<span class="material-icons">download</span>';
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.exportTableToCSV(table);
            });
            tableWrapper.appendChild(downloadBtn);

            this.setupTableControlEvents(tableControls, table);
            this.setupTableCellEditing(table);
            this.setupTableResizing(table);
        }
    });
}

exportTableToCSV(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    const csvRows = [];

    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowData = cells.map(cell => {
            let text = cell.textContent.trim();
            // CSV에서 쉼표와 따옴표 처리
            if (text.includes('"') || text.includes(',')) {
                text = `"${text.replace(/"/g, '""')}"`;
            }
            return text;
        });
        csvRows.push(rowData.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `table_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

createTableControls(table, rows, cols) {
    const tableControls = document.createElement('div');
    tableControls.className = 't2-table-controls';
    tableControls.innerHTML = `
        <div class="t2-table-control-group">
            <span>가로:</span>
            <button class="t2-btn t2-table-control-btn" data-action="add-col">
                <span class="material-icons">add</span>
            </button>
            <button class="t2-btn t2-table-control-btn" data-action="remove-col">
                <span class="material-icons">remove</span>
            </button>
        </div>
        <div class="t2-table-control-group">
            <span>세로:</span>
            <button class="t2-btn t2-table-control-btn" data-action="add-row">
                <span class="material-icons">add</span>
            </button>
            <button class="t2-btn t2-table-control-btn" data-action="remove-row">
                <span class="material-icons">remove</span>
            </button>
        </div>
        <button class="t2-btn t2-table-delete-btn" data-action="delete-table">
            <span class="material-icons">close</span>
        </button>
    `;
    return tableControls;
}

wrapMediaBlock(element) {
    const wrapper = document.createElement('div');
    wrapper.className = 't2-media-block';
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    
    const controls = this.createMediaControls(wrapper, element);
    wrapper.appendChild(controls);
}

updateCharCount() {
    let text = this.editor.textContent;
    // HTML 태그와 공백 제거
    text = text.replace(/\s+/g, '');
    this.charCount.textContent = text.length;
}
// 자동 저장 데이터 삭제
clearAutoSave() {
   localStorage.removeItem('t2editor-autosave');
}

// 링크 모달 표시
showLinkModal() {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // 선택된 텍스트가 없으면 알림
    if (range.collapsed) {
        alert('텍스트를 선택한 후 링크를 추가해주세요.');
        return;
    }
    
    // 현재 선택영역 저장
    this.saveSelection();
    
    // 선택 영역의 링크 검색을 위한 개선된 로직
    let existingLink = null;
    const startNode = range.startContainer;
    const endNode = range.endContainer;
    
    // 현재 선택된 노드가 속한 링크 찾기
    const findLinkParent = (node) => {
        while (node && node !== this.editor) {
            if (node.nodeName === 'A') {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    };
    
    // 선택 영역의 시작점이 링크 내부인지 확인
    const startLink = findLinkParent(startNode);
    const endLink = findLinkParent(endNode);
    
    // 선택 영역이 단일 노드 내부에 있는 경우
    if (startNode === endNode || (startLink && startLink === endLink)) {
        existingLink = startLink;
    } else {
        // 선택 영역이 정확히 하나의 링크와 일치하는지 확인
        const selectedText = range.toString();
        
        // 시작점부터 끝점까지의 모든 링크 요소 수집
        const allLinks = [];
        const treeWalker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    return node.nodeName === 'A' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        let currentNode;
        while (currentNode = treeWalker.nextNode()) {
            if (range.intersectsNode(currentNode)) {
                // 선택 영역과 현재 링크의 텍스트 내용 비교
                if (currentNode.textContent === selectedText) {
                    existingLink = currentNode;
                    break;
                }
                allLinks.push(currentNode);
            }
        }
        
        // 정확히 하나의 링크만 선택된 경우
        if (!existingLink && allLinks.length === 1 && allLinks[0].textContent === selectedText) {
            existingLink = allLinks[0];
        }
    }
    
    const modal = document.createElement('div');
    modal.className = 't2-modal-overlay';
    
    modal.innerHTML = `
        <div class="t2-link-editor-modal">
            <h3>${existingLink ? '링크 수정' : '링크 추가'}</h3>
            <div class="t2-link-input-container">
                <input type="text" class="t2-link-url-input" 
                       placeholder="https://" 
                       value="${existingLink ? existingLink.href : ''}">
                <div class="t2-link-options">
                    <label>
                        <input type="checkbox" class="t2-link-new-tab" ${existingLink && existingLink.target === '_blank' ? 'checked' : ''}>
                        새 탭에서 열기
                    </label>
                </div>
            </div>
            <div class="t2-btn-group">
                ${existingLink ? '<button class="t2-btn" data-action="remove">링크 제거</button>' : ''}
                <button class="t2-btn" data-action="cancel">취소</button>
                <button class="t2-btn" data-action="insert">${existingLink ? '수정' : '추가'}</button>
            </div>
        </div>
    `;

    // 이벤트 핸들러
    const handleLink = () => {
        const url = modal.querySelector('.t2-link-url-input').value.trim();
        const newTab = modal.querySelector('.t2-link-new-tab').checked;
        
        if (!url) {
            alert('URL을 입력해주세요.');
            return;
        }
        
        // URL 형식 검증
        let finalUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            finalUrl = 'http://' + url;
        }
        
        this.restoreSelection();
        
        try {
            const range = selection.getRangeAt(0);
            
            if (existingLink) {
                // 기존 링크 수정
                if (range.toString() === existingLink.textContent) {
                    // 전체 링크를 수정하는 경우
                    existingLink.href = finalUrl;
                    existingLink.target = newTab ? '_blank' : '';
                    existingLink.rel = newTab ? 'noopener noreferrer' : '';
                } else {
                    // 링크의 일부만 수정하는 경우
                    const selectedText = range.toString();
                    const newLink = document.createElement('a');
                    newLink.href = finalUrl;
                    newLink.target = newTab ? '_blank' : '';
                    newLink.rel = newTab ? 'noopener noreferrer' : '';
                    newLink.textContent = selectedText;
                    
                    range.deleteContents();
                    range.insertNode(newLink);
                }
            } else {
                // 새 링크 생성
                const selectedText = range.toString();
                const newLink = document.createElement('a');
                newLink.href = finalUrl;
                newLink.target = newTab ? '_blank' : '';
                newLink.rel = newTab ? 'noopener noreferrer' : '';
                newLink.textContent = selectedText;
                
                range.deleteContents();
                range.insertNode(newLink);
            }
            
            modal.remove();
            this.createUndoPoint();
            this.autoSave();
            this.normalizeContent();
        } catch (error) {
            console.error('링크 적용 중 오류:', error);
            alert('링크를 적용하는 중 오류가 발생했습니다. 선택 영역을 다시 확인해주세요.');
        }
    };
    
    // 모달 버튼 이벤트 설정
    modal.querySelector('[data-action="insert"]').onclick = handleLink;
    modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();
    
    if (existingLink) {
        modal.querySelector('[data-action="remove"]').onclick = () => {
            this.restoreSelection();
            
            try {
                const range = selection.getRangeAt(0);
                const fullText = existingLink.textContent;
                const selectedText = range.toString();
                
                // 선택 영역이 링크의 전체 텍스트와 동일한 경우
                if (selectedText === fullText) {
                    const parent = existingLink.parentNode;
                    while (existingLink.firstChild) {
                        parent.insertBefore(existingLink.firstChild, existingLink);
                    }
                    existingLink.remove();
                } else {
                    // 선택 영역이 링크의 일부분인 경우
                    const startOffset = range.startOffset;
                    const endOffset = range.endOffset;
                    const linkText = existingLink.firstChild;
                    
                    // 링크를 세 부분으로 나눔
                    const beforeText = fullText.substring(0, startOffset);
                    const selectedPart = fullText.substring(startOffset, endOffset);
                    const afterText = fullText.substring(endOffset);
                    
                    const parent = existingLink.parentNode;
                    
                    // 앞부분 링크 생성
                    if (beforeText) {
                        const beforeLink = existingLink.cloneNode(false);
                        beforeLink.textContent = beforeText;
                        parent.insertBefore(beforeLink, existingLink);
                    }
                    
                    // 선택된 부분은 일반 텍스트로
                    const textNode = document.createTextNode(selectedPart);
                    parent.insertBefore(textNode, existingLink);
                    
                    // 뒷부분 링크 생성
                    if (afterText) {
                        const afterLink = existingLink.cloneNode(false);
                        afterLink.textContent = afterText;
                        parent.insertBefore(afterLink, existingLink);
                    }
                    
                    // 원래 링크 제거
                    existingLink.remove();
                }
                
                modal.remove();
                this.createUndoPoint();
                this.autoSave();
            } catch (error) {
                console.error('링크 제거 중 오류:', error);
                alert('링크를 제거하는 중 오류가 발생했습니다. 선택 영역을 다시 확인해주세요.');
            }
        };
    }
    
    // Enter 키 이벤트
    modal.querySelector('.t2-link-url-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLink();
        }
    });
    
    document.body.appendChild(modal);
    modal.querySelector('.t2-link-url-input').focus();
}

// 파일 아이콘 삽입
insertFileIcon(fileInfo) {
    const fileBlock = document.createElement('div');
    fileBlock.className = 't2-media-block t2-file-block';
    
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const fileSize = this.formatFileSize(fileInfo.size);
    const isAudioFile = /\.(mp3|m4a)$/i.test(fileInfo.original_name);
    const isPdfFile = /\.pdf$/i.test(fileInfo.original_name);
    
    // URL 처리 - PDF 파일인 경우 뷰어 URL로 변환
    let fileUrl = fileInfo.url;
    if (isPdfFile) {
        // URL에서 data/editor/t2editor_YYMMDD/filename.pdf 부분 추출
        const matches = fileUrl.match(/data\/editor\/t2editor_(\d+)\/(.+\.pdf)$/i);
        if (matches) {
            const [, date, filename] = matches;
            fileUrl =`/service/editor/demo/pdf_view.php?pdf=${date}/${filename}`;
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
    const currentBlock = this.getClosestBlock(range.startContainer);

    if (currentBlock && currentBlock !== this.editor) {
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

    this.normalizeContent();
    this.createUndoPoint();
}

// 파일 업로드 처리
async uploadFile(file) {
    const formData = new FormData();
    formData.append('bf_file', file);
    formData.append('uid', this.generateUid());

    try {
        const response = await fetch('/service/editor/demo/file_upload.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            this.insertFileIcon(data.file);
        } else {
            alert('파일 업로드 실패: ' + data.message);
        }
    } catch (error) {
        console.error('업로드 에러:', error);
        alert('파일 업로드 중 오류가 발생했습니다.');
    }
}

// 파일 첨부 모달 및 처리
handleAttachFile() {
    const modal = document.createElement('div');
    modal.className = 't2-modal-overlay';
    
    modal.innerHTML = `
        <div class="t2-file-editor-modal">
            <h3>파일 첨부</h3>
            <div class="t2-file-upload-area">
                <span class="material-icons">attach_file</span>
                <div class="t2-file-upload-text">클릭하여 파일 선택</div>
                <div class="t2-file-upload-hint">지원 형식: ZIP, PDF, TXT, MP3</div>
                <input type="file" accept=".zip,.pdf,.txt,.mp3" />
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

    const previewGrid = modal.querySelector('.t2-file-preview-grid');
    const fileInput = modal.querySelector('input[type="file"]');
    const uploadBtn = modal.querySelector('[data-action="upload"]');
    const uploadArea = modal.querySelector('.t2-file-upload-area');
    const progressBar = modal.querySelector('.t2-progress-fill');
    const progressContainer = modal.querySelector('.t2-upload-progress');
    const progressText = modal.querySelector('.t2-progress-text');
    
    let selectedFile = null;

    const handleFile = (file) => {
        if (!['.zip', '.pdf', '.txt', '.mp3'].some(ext => 
            file.name.toLowerCase().endsWith(ext))) {
            alert('지원하지 않는 파일 형식입니다.');
            return;
        }

        // 기존 미리보기 제거
        previewGrid.innerHTML = '';
        
        const previewItem = document.createElement('div');
        previewItem.className = 't2-file-preview-item';
        previewItem.innerHTML = `
            <div class="t2-file-preview-icon" style="background-color: ${this.getFileColor(file.name.split('.').pop())}"></div>
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
            fileInput.value = ''; // 파일 입력 초기화
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
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    };

    uploadArea.ondragleave = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    };

    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

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
            formData.append('uid', this.generateUid());

            const response = await fetch(this.basePath + 'file_upload.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                progressBar.style.width = '100%';
                progressText.textContent = '업로드 완료';
                this.insertFileIcon(data.file);
                modal.remove();
                this.createUndoPoint();
                this.autoSave();
            } else {
                throw new Error(data.message || '업로드 실패');
            }
        } catch (error) {
            console.error('업로드 에러:', error);
            alert('파일 업로드 중 오류가 발생했습니다.');
            uploadBtn.disabled = false;
        }
    };

    document.body.appendChild(modal);
}

// 파일 타입에 따른 색상 반환
getFileColor(type) {
    const colors = {
        'zip': '#E8B56F',
        'pdf': '#F44336',
        'txt': '#585858',
        'mp3': '#9C27B0',
        'm4a': '#2196F3'
    };
    return colors[type.toLowerCase()] || '#E8B56F';
}

// 파일 크기 포맷팅
formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 고유 ID 생성
generateUid() {
    const random = Math.floor(Math.random() * 1000000000);
    const timestamp = new Date().getTime();
    return `${random}${timestamp}`;
}

// 테이블 생성 모달 표시 메서드
showTableModal() {
    const modal = document.createElement('div');
    modal.className = 't2-modal-overlay';
    
    modal.innerHTML = `
        <div class="t2-table-editor-modal">
            <h3>테이블 삽입</h3>
            <div class="t2-table-size-selector">
                <div class="t2-table-size-inputs">
                    <div class="t2-table-input-group">
                        <label>가로 셀 수:</label>
                        <div class="t2-input-with-controls">
                            <button class="t2-btn t2-table-control-btn" data-action="decrease-cols">
                                <span class="material-icons">remove</span>
                            </button>
                            <input type="number" class="t2-table-cols" value="3" min="1" max="30">
                            <button class="t2-btn t2-table-control-btn" data-action="increase-cols">
                                <span class="material-icons">add</span>
                            </button>
                        </div>
                    </div>
                    <div class="t2-table-input-group">
                        <label>세로 셀 수:</label>
                        <div class="t2-input-with-controls">
                            <button class="t2-btn t2-table-control-btn" data-action="decrease-rows">
                                <span class="material-icons">remove</span>
                            </button>
                            <input type="number" class="t2-table-rows" value="3" min="1" max="30">
                            <button class="t2-btn t2-table-control-btn" data-action="increase-rows">
                                <span class="material-icons">add</span>
                            </button>
                        </div>
                    </div>
                    <div class="t2-table-warning" style="display: none; color: #e67e22; margin-top: 10px; font-size: 13px;">
                        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">warning</span>
                        큰 테이블은 가로 스크롤이 생성됩니다.
                    </div>
                </div>
                <div class="t2-table-preview-container" style="width: 160px; height: 160px; overflow: hidden; border: 1px solid #ddd; border-radius: 4px;">
                    <div class="t2-table-preview" style="transform-origin: top left;"></div>
                </div>
            </div>
            <div class="t2-table-style-options">
                <div class="t2-table-style-option">
                    <p>테이블 너비:&nbsp;</p>
                    <select class="t2-table-width">
                        <option value="100%">100% (전체)</option>
                        <option value="75%">75%</option>
                        <option value="50%">50%</option>
                        <option value="custom">직접 입력</option>
                    </select>
                    <div class="t2-custom-width-container" style="display: none;">
                        <input type="number" class="t2-custom-width-value" value="100" min="10" max="100">
                        <span>%</span>
                    </div>
                </div>
                <div class="t2-table-style-option">
                    <p>테두리 스타일:&nbsp;</p>
                    <select class="t2-table-border-style">
                        <option value="solid">실선</option>
                        <option value="dashed">점선</option>
                        <option value="dotted">점선 (원형)</option>
                        <option value="double">이중선</option>
                    </select>
                </div>
            </div>
            <div class="t2-btn-group">
                <button class="t2-btn" data-action="cancel">취소</button>
                <button class="t2-btn" data-action="insert">삽입</button>
            </div>
        </div>
    `;

    const previewContainer = modal.querySelector('.t2-table-preview');
    const colsInput = modal.querySelector('.t2-table-cols');
    const rowsInput = modal.querySelector('.t2-table-rows');
    const tableWidthSelect = modal.querySelector('.t2-table-width');
    const customWidthContainer = modal.querySelector('.t2-custom-width-container');
    const customWidthInput = modal.querySelector('.t2-custom-width-value');
    const tableWarning = modal.querySelector('.t2-table-warning');

    // 미리보기 테이블 업데이트 함수
    const updateTablePreview = () => {
        const cols = parseInt(colsInput.value) || 3;
        const rows = parseInt(rowsInput.value) || 3;
        
        // 큰 테이블에 대한 경고
        if (cols > 10 || rows > 10) {
            tableWarning.style.display = 'block';
        } else {
            tableWarning.style.display = 'none';
        }
        
        // 미리보기 배율 계산 (크기에 따라 축소)
        const scale = Math.min(1, 140 / Math.max(cols * 16, rows * 16));
        
        // 미리보기 테이블 생성
        let tableHTML = `<table class="t2-preview-table" style="transform: scale(${scale}); transform-origin: top left;">`;
        
        // 헤더 행
        tableHTML += '<tr>';
        for (let col = 0; col < cols; col++) {
            tableHTML += `<th style="width: 16px; height: 16px; border: 1px solid #ccc; background: #f5f5f5;"></th>`;
        }
        tableHTML += '</tr>';
        
        // 데이터 행
        for (let row = 1; row < rows; row++) {
            tableHTML += '<tr>';
            for (let col = 0; col < cols; col++) {
                tableHTML += '<td style="width: 16px; height: 16px; border: 1px solid #ccc;"></td>';
            }
            tableHTML += '</tr>';
        }
        
        tableHTML += '</table>';
        previewContainer.innerHTML = tableHTML;
    };

    // 가로 및 세로 셀 수 컨트롤 이벤트
    modal.querySelector('[data-action="decrease-cols"]').onclick = () => {
        colsInput.value = Math.max(1, parseInt(colsInput.value) - 1);
        updateTablePreview();
    };
    
    modal.querySelector('[data-action="increase-cols"]').onclick = () => {
        colsInput.value = Math.min(30, parseInt(colsInput.value) + 1);
        updateTablePreview();
    };
    
    modal.querySelector('[data-action="decrease-rows"]').onclick = () => {
        rowsInput.value = Math.max(1, parseInt(rowsInput.value) - 1);
        updateTablePreview();
    };
    
    modal.querySelector('[data-action="increase-rows"]').onclick = () => {
        rowsInput.value = Math.min(30, parseInt(rowsInput.value) + 1);
        updateTablePreview();
    };

    // 너비 설정 변경 이벤트
    tableWidthSelect.addEventListener('change', () => {
        if (tableWidthSelect.value === 'custom') {
            customWidthContainer.style.display = 'flex';
        } else {
            customWidthContainer.style.display = 'none';
        }
    });

    // 직접 입력 값 및 입력 필드 이벤트
    colsInput.addEventListener('input', () => {
        colsInput.value = Math.min(30, Math.max(1, parseInt(colsInput.value) || 1));
        updateTablePreview();
    });
    
    rowsInput.addEventListener('input', () => {
        rowsInput.value = Math.min(30, Math.max(1, parseInt(rowsInput.value) || 1));
        updateTablePreview();
    });

    // 최초 미리보기 테이블 생성
    updateTablePreview();

    // 삽입 버튼 클릭 이벤트
    modal.querySelector('[data-action="insert"]').onclick = () => {
        const cols = parseInt(colsInput.value) || 3;
        const rows = parseInt(rowsInput.value) || 3;
        const borderStyle = modal.querySelector('.t2-table-border-style').value;
        
        // 테이블 너비 설정
        let tableWidth;
        if (tableWidthSelect.value === 'custom') {
            const customWidth = parseInt(customWidthInput.value) || 100;
            tableWidth = Math.min(100, Math.max(10, customWidth)) + '%';
        } else {
            tableWidth = tableWidthSelect.value;
        }
        
        this.insertTableAtCursor(cols, rows, tableWidth, borderStyle);
        modal.remove();
    };

    // 취소 버튼 클릭 이벤트
    modal.querySelector('[data-action="cancel"]').onclick = () => modal.remove();

    document.body.appendChild(modal);
}

// 테이블 삽입 메서드
insertTableAtCursor(cols, rows, width, borderStyle) {
    const table = document.createElement('table');
    table.className = 't2-table';
    table.style.width = width;
    table.style.borderCollapse = 'collapse';
    table.setAttribute('border', '1');
    table.setAttribute('data-t2-table', 'true');

    const borderColor = '#ccc';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let col = 0; col < cols; col++) {
        const th = document.createElement('th');
        th.style.border = `1px ${borderStyle} ${borderColor}`;
        th.style.padding = '8px';
        th.style.backgroundColor = '#f5f5f5';
        th.textContent = `헤더 ${col + 1}`;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let row = 1; row < rows; row++) {
        const tr = document.createElement('tr');
        for (let col = 0; col < cols; col++) {
            const td = document.createElement('td');
            td.style.border = `1px ${borderStyle} ${borderColor}`;
            td.style.padding = '8px';
            td.innerHTML = `<br>`;
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 't2-table-wrapper';
    tableWrapper.contentEditable = false;

    // 테이블 너비 계산
    const cellWidth = 50;
    const padding = 12 * 2;
    const tableWidth = cols * (cellWidth + padding);
    const mediaBlockWidth = 320;
    const editorWidth = this.editor.clientWidth;
    const needsScroll = tableWidth > mediaBlockWidth || tableWidth > editorWidth;

    if (needsScroll) {
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 't2-table-scroll-wrapper';
        scrollWrapper.appendChild(table);
        tableWrapper.appendChild(scrollWrapper);
        table.classList.add('t2-table-large');
    } else {
        tableWrapper.appendChild(table);
    }

    const tableControls = this.createTableControls(table, rows, cols);
    tableWrapper.appendChild(tableControls);

    // 다운로드 버튼 추가
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 't2-table-download-btn';
    downloadBtn.innerHTML = '<span class="material-icons">download</span>';
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.exportTableToCSV(table);
    });
    tableWrapper.appendChild(downloadBtn);

    this.insertAtCursor(tableWrapper);
    this.setupTableControlEvents(tableControls, table);
    this.setupTableCellEditing(table);
    this.setupTableResizing(table);

    return tableWrapper;
}

// 테이블 컨트롤 이벤트 설정
setupTableControlEvents(controls, table) {
    // 테이블 크기에 따라 스크롤 래퍼를 동적으로 추가/제거하는 함수
    const updateTableScroll = () => {
        const cols = table.querySelector('tr')?.children.length || 0; // 열 개수
        const rows = table.querySelectorAll('tr').length; // 행 개수
        const cellWidth = 50; // 최소 셀 너비 (CSS에서 min-width: 50px)
        const padding = 12 * 2; // 셀당 좌우 패딩 (CSS에서 padding: 10px 12px)
        const tableWidth = cols * (cellWidth + padding); // 테이블 전체 너비 계산
        const mediaBlockWidth = 320; // 미디어 블록 너비 기준
        const editorWidth = this.editor.clientWidth; // 에디터 뷰포트 너비
        const needsScroll = tableWidth > mediaBlockWidth || tableWidth > editorWidth; // 스크롤 필요 여부

        const wrapper = table.closest('.t2-table-wrapper'); // 테이블을 감싸는 래퍼
        const scrollWrapper = table.closest('.t2-table-scroll-wrapper'); // 스크롤 래퍼

        // 스크롤이 필요하고 스크롤 래퍼가 없는 경우 추가
        if (needsScroll && !scrollWrapper) {
            const newScrollWrapper = document.createElement('div');
            newScrollWrapper.className = 't2-table-scroll-wrapper';
            wrapper.insertBefore(newScrollWrapper, table);
            newScrollWrapper.appendChild(table);
            table.classList.add('t2-table-large');
        }
        // 스크롤이 필요 없고 스크롤 래퍼가 있는 경우 제거
        else if (!needsScroll && scrollWrapper) {
            wrapper.insertBefore(table, scrollWrapper);
            scrollWrapper.remove();
            table.classList.remove('t2-table-large');
        }
    };

    // 열 추가 이벤트
    controls.querySelector('[data-action="add-col"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rows = table.querySelectorAll('tr');
        const colCount = rows[0].children.length;
        rows.forEach((row, rowIndex) => {
            const cell = rowIndex === 0 ? document.createElement('th') : document.createElement('td');
            cell.style.border = rows[0].children[0].style.border; // 기존 셀 스타일 복사
            cell.style.padding = '8px';
            if (rowIndex === 0) {
                cell.style.backgroundColor = '#f5f5f5'; // 헤더 셀 스타일
                cell.textContent = `헤더 ${colCount + 1}`; // 헤더 이름
            } else {
                cell.innerHTML = '<br>'; // 일반 셀은 빈 상태로
            }
            row.appendChild(cell);
            this.setupCellEditing(cell); // 셀 편집 가능 설정
        });
        updateTableScroll(); // 스크롤 상태 업데이트
        this.createUndoPoint(); // Undo 포인트 생성
    });

    // 열 제거 이벤트
    controls.querySelector('[data-action="remove-col"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rows = table.querySelectorAll('tr');
        if (rows[0].children.length <= 1) return; // 최소 1열은 유지
        rows.forEach(row => row.removeChild(row.lastChild)); // 마지막 열 제거
        updateTableScroll();
        this.createUndoPoint();
    });

    // 행 추가 이벤트
    controls.querySelector('[data-action="add-row"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rows = table.querySelectorAll('tr');
        const colCount = rows[0].children.length;
        const tbody = table.querySelector('tbody') || table; // tbody가 없으면 table 사용
        const newRow = document.createElement('tr');
        for (let col = 0; col < colCount; col++) {
            const td = document.createElement('td');
            td.style.border = rows[0].children[0].style.border;
            td.style.padding = '8px';
            td.innerHTML = '<br>';
            newRow.appendChild(td);
            this.setupCellEditing(td);
        }
        tbody.appendChild(newRow);
        updateTableScroll();
        this.createUndoPoint();
    });

    // 행 제거 이벤트
    controls.querySelector('[data-action="remove-row"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rows = table.querySelectorAll('tr');
        if (rows.length <= 1) return; // 최소 1행은 유지
        const tbody = table.querySelector('tbody') || table;
        tbody.removeChild(tbody.lastChild); // 마지막 행 제거
        updateTableScroll();
        this.createUndoPoint();
    });

    // 테이블 삭제 이벤트
    controls.querySelector('[data-action="delete-table"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wrapper = table.closest('.t2-table-wrapper');
        if (wrapper) {
            wrapper.remove(); // 테이블 전체 제거
            this.createUndoPoint();
        }
    });

    // 초기 스크롤 상태 설정
    updateTableScroll();
}

// 테이블 셀 크기 조절 기능 추가
setupTableResizing(table) {
    let isResizing = false;
    let currentTh = null;
    let startX = 0;
    let startWidth = 0;
    
    // 모든 헤더 셀에 이벤트 리스너 추가
    const headers = table.querySelectorAll('th');
    headers.forEach(th => {
        // 크기 조절 영역 이벤트
        th.addEventListener('mousedown', (e) => {
            // 오른쪽 5px 영역에서만 크기 조절 활성화
            const thRect = th.getBoundingClientRect();
            if (thRect.right - e.clientX <= 5) {
                isResizing = true;
                currentTh = th;
                startX = e.clientX;
                startWidth = th.offsetWidth;
                
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });
    
    // 마우스 이동 및 크기 조절 처리
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const diffX = e.clientX - startX;
        const newWidth = Math.max(30, startWidth + diffX);
        
        // 현재 헤더 너비 조정
        currentTh.style.width = `${newWidth}px`;
        
        // 같은 열의 모든 셀 너비 조정
        const colIndex = Array.from(currentTh.parentNode.children).indexOf(currentTh);
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cell = row.children[colIndex];
            if (cell) {
                cell.style.width = `${newWidth}px`;
            }
        });
        
        e.preventDefault();
    });
    
    // 크기 조절 완료 처리
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentTh = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            this.createUndoPoint();
        }
    });
}

// 테이블 셀 편집 기능 설정
setupTableCellEditing(table) {
    // 모든 셀을 편집 가능하게 설정
    const cells = table.querySelectorAll('th, td');
    cells.forEach(cell => {
        this.setupCellEditing(cell);
    });
}

setupCellEditing(cell) {
    cell.contentEditable = true;
    
    // 셀 클릭 시 포커스 (선택 영역 설정)
    cell.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(cell);
        selection.removeAllRanges();
        selection.addRange(range);
    });
    
    // 셀 내부에서 Enter 키 누를 때 줄바꿈 구현
    cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '<br>');
        }
    });
}

exportToHTML() {
    // 문서 제목 먼저 입력받기
    let title = prompt('내보낼 HTML 파일의 제목을 입력하세요:', '문서 제목') || "T2Editor 내보내기";
    
    // HTML 스킨 템플릿 가져오기
    fetch(this.basePath + 'export_html_skin.html')
        .then(response => response.text())
        .then(template => {
            // 현재 에디터 내용 가져오기
            let editorContent = this.processContentForExport();
            
            // 템플릿에 내용 주입 - 문제 1: 문자열 대체 확실히 처리
            let exportHtml = template
                .replace(/\{\{TITLE\}\}/g, title)
                .replace(/\{\{CONTENT\}\}/g, editorContent)
                .replace(/\{\{EXPORT_DATE\}\}/g, new Date().toLocaleString());
            
            // 내보내기 파일 다운로드
            this.downloadHTML(exportHtml, this.sanitizeFileName(title) + '.html');
        })
        .catch(error => {
            console.error('내보내기 템플릿 로드 실패:', error);
            alert('내보내기 템플릿을 불러오는 데 실패했습니다: ' + error.message);
        });
}

// 문제 2, 4: 미디어 블록과 이미지 경로 처리 개선
processContentForExport() {
    console.log('내보내기 처리 시작');
    
    // 에디터 전체 콘텐츠 복제
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.editor.innerHTML;
    console.log('원본 콘텐츠 길이:', tempDiv.innerHTML.length);
    
    // 미디어 블록 처리 - 더 정확한 선택자 사용
    tempDiv.querySelectorAll('.t2-media-block').forEach(block => {
        console.log('미디어 블록 발견:', block.className);
        
        // 컨트롤 제거
        const controls = block.querySelector('.t2-media-controls');
        if (controls) {
            controls.remove();
            console.log('미디어 컨트롤 제거됨');
        }
    });
    
    // 이미지 경로 절대 경로로 변환 - 문제 4 해결
    tempDiv.querySelectorAll('img').forEach(img => {
        let src = img.getAttribute('src');
        console.log('이미지 경로 처리:', src);
        
        // 상대 경로인 경우만 절대 경로로 변환
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            // 현재 페이지의 origin (도메인)을 가져와 절대 경로 생성
            let origin = window.location.origin;
            
            // 경로가 /로 시작하는지 확인
            if (!src.startsWith('/')) {
                // 현재 페이지의 경로(pathname)에서 마지막 슬래시까지 추출
                let currentPath = window.location.pathname.substring(0, 
                    window.location.pathname.lastIndexOf('/') + 1);
                img.src = origin + currentPath + src;
            } else {
                img.src = origin + src;
            }
            
            console.log('이미지 경로 변환됨:', img.src);
        }
    });
    
    // 유튜브 iframe 보존
    tempDiv.querySelectorAll('iframe').forEach(iframe => {
        console.log('iframe 발견:', iframe.src);
        
        // iframe 컨테이너가 스타일을 가지고 있는지 확인
        let container = iframe.closest('.t2-media-block')?.querySelector('div:first-child');
        if (container) {
            iframe.style.width = container.style.width || '100%';
            iframe.style.height = container.style.height || '315px';
            console.log('iframe 스타일 적용:', iframe.style.width, iframe.style.height);
        }
    });
    
    // 테이블 처리
    tempDiv.querySelectorAll('.t2-table-wrapper').forEach(wrapper => {
        console.log('테이블 래퍼 발견');
        const table = wrapper.querySelector('table');
        if (table) {
            // 테이블 컨트롤 제거
            const controls = wrapper.querySelector('.t2-table-controls');
            if (controls) controls.remove();
            
            // 다운로드 버튼 제거
            const downloadBtn = wrapper.querySelector('.t2-table-download-btn');
            if (downloadBtn) downloadBtn.remove();
            
            // 스크롤 래퍼 처리
            const scrollWrapper = wrapper.querySelector('.t2-table-scroll-wrapper');
            if (scrollWrapper) {
                let scrollContainer = document.createElement('div');
                scrollContainer.className = 'table-responsive';
                scrollContainer.style.cssText = 'display:block; width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch;';
                
                // 원래 래퍼에서 테이블 꺼내기
                scrollWrapper.parentNode.insertBefore(table, scrollWrapper);
                scrollWrapper.remove();
                
                // 스크롤 컨테이너에 테이블 넣기
                scrollContainer.appendChild(table);
                
                // 원래 래퍼 대체
                wrapper.parentNode.insertBefore(scrollContainer, wrapper);
                wrapper.remove();
                
                console.log('테이블 스크롤 래퍼 처리 완료');
            } else {
                // 작은 테이블은 그냥 래퍼에서 꺼냄
                wrapper.parentNode.insertBefore(table, wrapper);
                wrapper.remove();
                console.log('일반 테이블 처리 완료');
            }
        }
    });
    
    // 파일 블록 처리
    tempDiv.querySelectorAll('.t2-file-block').forEach(block => {
        console.log('파일 블록 발견');
        // 컨트롤 제거
        const controls = block.querySelector('.t2-media-controls');
        if (controls) controls.remove();
    });
    
    console.log('최종 내보내기 콘텐츠 길이:', tempDiv.innerHTML.length);
    return tempDiv.innerHTML;
}

// 파일 이름 정리 (특수문자 제거)
sanitizeFileName(fileName) {
    return fileName.replace(/[\\/:*?"<>|]/g, '_');
}

// HTML 파일 다운로드
downloadHTML(html, fileName) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // 정리
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}


}
// 에디터 초기화
const editor = new T2Editor(document.querySelector('.t2-editor-container'));