const config = {
    type: Phaser.AUTO, // WebGL 기반, 지원하지 않으면 Canvas로 자동 폴백
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 540,
        parent: 'game-container',
    },
    pixelArt: false, // 레트로한 픽셀 아트를 쓸 거면 true, 부드러운 웹툰풍이면 false
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // 중력은 Player에서 개별 적용
            debug: false // 충돌 영역을 눈으로 보려면 true로 변경
        }
    },
    scene: [BootScene, OpeningScene, WorldMapScene, GameScene, Stage2Scene, Stage4Scene]
};

// 게임 인스턴스를 시작하는 함수
function startGame() {
    if (window.location.protocol === 'file:') {
        alert("⚠️ [안내]\n현재 파일을 직접 더블클릭하여(file://) 실행하셨습니다.\n보안 정책으로 인해 월드맵 등 일부 이미지가 검은색으로 깨져 보일 수 있습니다.\n반드시 주소창에 http://localhost:8080 을 입력해서 접속해 주세요!");
    }

    const game = new Phaser.Game(config);
    
    // 게임 전역 상태 초기화
    game.events.once('ready', () => {
        game.registry.set('currentWorld', 1);
        game.registry.set('unlockedStages', [1]); // 해금된 스테이지 번호 배열
        game.registry.set('guitarParts', []); // 수집한 기타 부품 (A, B, C, D, E)
        game.registry.set('currentWeapon', null); // 획득한 무기
    });
}

// assetsBase64가 정의되어 있다면, 모든 이미지를 브라우저 메모리에 먼저 로드한 뒤 게임을 시작합니다.
// 이렇게 하면 Phaser 3의 로컬 Data URI 차단 문제를 우회할 수 있습니다.
if (typeof assetsBase64 !== 'undefined') {
    window.loadedImages = {};
    const promises = Object.keys(assetsBase64).map(key => {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                window.loadedImages[key] = img;
                resolve();
            };
            // 에러 발생 시에도 무한 대기하지 않도록 resolve 호출
            img.onerror = () => resolve();
            img.src = assetsBase64[key];
        });
    });

    Promise.all(promises).then(() => {
        startGame();
    });
} else {
    // Base64 데이터가 없으면 바로 게임 시작 (임시 그래픽 사용)
    startGame();
}

// 명시적 전체화면 버튼 로직
const fsBtn = document.getElementById('fullscreen-btn');
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
// 홈 화면에 추가되어 앱처럼(standalone) 실행 중인지 확인
const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

if (fsBtn) {
    if (!isMobile || isStandalone) {
        fsBtn.style.display = 'none'; // PC이거나 이미 홈 화면에서 실행 중이면 버튼 아예 숨김
    } else {
        fsBtn.addEventListener('click', () => {
            const docEl = document.documentElement;
            const requestFS = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
            
            if (requestFS) {
                requestFS.call(docEl).then(() => {
                    fsBtn.style.display = 'none'; // 성공 시 버튼 숨김
                }).catch(err => {
                    console.log("Fullscreen request failed:", err);
                    alert("전체화면 전환에 실패했습니다.");
                });
            } else {
                alert("아이폰(Safari) 등 이 기기/브라우저에서는 자동 전체화면(Fullscreen API)을 지원하지 않습니다.\n대신 화면을 조금 아래로 스크롤하거나 '홈 화면에 추가' 기능을 사용해 주세요.");
                fsBtn.style.display = 'none';
            }
        });

        // 전체화면 상태가 해제되면 버튼 다시 표시 (모바일 한정)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                fsBtn.style.display = 'block';
            }
        });
    }
}
