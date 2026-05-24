// 퀴즈 UI를 관리하는 컨트롤러 객체
const QuizOverlay = {
    overlayEl: null,
    titleEl: null,
    questionEl: null,
    optionsEl: null,
    
    // 퀴즈 종료 시 호출될 콜백 함수 저장
    onCompleteCallback: null,
    
    focusedIndex: 0,
    handleKeyDown: null,

    init() {
        this.overlayEl = document.getElementById('quiz-overlay');
        this.titleEl = document.getElementById('quiz-title');
        this.questionEl = document.getElementById('quiz-question');
        this.optionsEl = document.getElementById('quiz-options');

        this.handleKeyDown = (e) => {
            if (this.overlayEl.classList.contains('hidden')) return;

            const btns = this.optionsEl.querySelectorAll('.quiz-btn');
            if (btns.length === 0) return;
            
            // 이미 정답을 골라서 비활성화 된 상태인지 확인
            if (btns[0].disabled) return;

            if (e.key === 'ArrowUp') {
                this.focusedIndex--;
                if (this.focusedIndex < 0) this.focusedIndex = btns.length - 1;
                this.updateFocus();
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                this.focusedIndex++;
                if (this.focusedIndex >= btns.length) this.focusedIndex = 0;
                this.updateFocus();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                btns[this.focusedIndex].click();
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', this.handleKeyDown);
    },

    /**
     * 퀴즈 창을 띄웁니다.
     * @param {string} quizId quizData의 키 값
     * @param {function} onComplete 퀴즈가 끝나고 호출될 콜백 (결과 boolean 전달)
     */
    show(quizId, onComplete) {
        if (!this.overlayEl) this.init();
        
        const data = QuizData[quizId];
        if (!data) {
            console.error('Quiz data not found for id:', quizId);
            if(onComplete) onComplete(true); // 에러시 그냥 진행
            return;
        }

        this.onCompleteCallback = onComplete;
        
        // 데이터 채우기
        this.titleEl.textContent = data.title;
        // 개행문자를 <br>로 변경
        this.questionEl.innerHTML = data.question.replace(/\n/g, '<br>');
        
        // 기존 옵션 비우기
        this.optionsEl.innerHTML = '';
        
        // 옵션 버튼 생성
        data.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-btn';
            btn.textContent = `${index + 1}. ${opt.text}`;
            
            btn.onclick = () => this.handleAnswer(btn, opt);
            this.optionsEl.appendChild(btn);
        });

        // 키보드 포커스 초기화
        this.focusedIndex = 0;
        this.updateFocus();

        // UI 보이기
        this.overlayEl.classList.remove('hidden');
    },

    /**
     * 사용자가 답을 선택했을 때 처리
     */
    handleAnswer(btn, optionData) {
        // 모든 버튼 비활성화 (중복 클릭 방지)
        const allBtns = this.optionsEl.querySelectorAll('.quiz-btn');
        allBtns.forEach(b => b.disabled = true);

        // 정답 여부에 따른 UI 피드백 클래스 추가
        if (optionData.isCorrect) {
            btn.classList.add('correct');
        } else {
            btn.classList.add('wrong');
        }

        // 반응 메시지로 질문 텍스트 업데이트
        this.questionEl.innerHTML = `<strong>${optionData.response}</strong>`;

        // 1.5초 후 퀴즈 창 닫고 게임 재개
        setTimeout(() => {
            this.hide();
            if (this.onCompleteCallback) {
                this.onCompleteCallback(optionData.isCorrect);
            }
        }, 1500);
    },

    hide() {
        if (this.overlayEl) {
            this.overlayEl.classList.add('hidden');
        }
    },

    updateFocus() {
        const btns = this.optionsEl.querySelectorAll('.quiz-btn');
        btns.forEach((btn, idx) => {
            if (idx === this.focusedIndex) {
                btn.classList.add('focused');
            } else {
                btn.classList.remove('focused');
            }
        });
    }
};

// 문서 로드 완료 시 초기화 시도
window.addEventListener('DOMContentLoaded', () => {
    QuizOverlay.init();
});
