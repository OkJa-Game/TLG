// 전역으로 접근 가능한 퀴즈 데이터 객체
const QuizData = {
    // ID를 키로 하는 퀴즈 목록
    'npc_oldman': {
        title: "스트라토캐스터",
        question: "허허, 이 앞은 몬스터가 득실거리는 위험한 숲이란다. 숲을 무사히 지나가려면 가장 필요한 덕목이 무엇이겠느냐?",
        options: [
            { text: "적을 쓰러뜨릴 강력한 힘!", isCorrect: false, response: "힘만으로는 부족하단다. 몬스터가 더 많아질 뿐이야." },
            { text: "함정을 간파할 지혜!", isCorrect: true, response: "오호, 제법이구나. 지혜의 부적을 주마." },
            { text: "재빠르게 도망칠 스피드!", isCorrect: false, response: "도망만 쳐서는 숲의 끝에 닿을 수 없지." }
        ]
    },
    'box_riddle': {
        title: "오래된 보물 상자",
        question: "지금 나오는 인트로 곡의 제목은?\n(팁, 너바나의 대표곡)",
        options: [
            { text: "Time is running out", isCorrect: false, response: "틀렸습니다. 아무 일도 일어나지 않습니다." },
            { text: "Smells Like Teen Spirit", isCorrect: true, response: "정답입니다! 상자가 열리며 보상을 획득했습니다." },
            { text: "It's My Life", isCorrect: false, response: "틀렸습니다. 아무 일도 일어나지 않습니다." },
            { text: "With or Without You", isCorrect: false, response: "틀렸습니다. 아무 일도 일어나지 않습니다." }
        ]
    }
};
