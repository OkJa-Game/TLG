class OpeningScene extends Phaser.Scene {
    constructor() {
        super('OpeningScene');
    }

    create() {
        // 임시 오프닝 데이터 (제이드님이 이미지를 주시면 변경)
        this.slides = [
            { text: "옛날 옛적, 평화로운 음악의 세계가 있었습니다...", bg: 0x111111 },
            { text: "어느 날, 악의 무리가 나타나 전설의 기타 부품을 훔쳐갔죠.", bg: 0x221111 },
            { text: "세상은 침묵과 어둠에 잠겼습니다.", bg: 0x111122 },
            { text: "하지만 한 용감한 모험가가 나타났습니다.", bg: 0x112211 },
            { text: "그는 빼앗긴 스트라토캐스터를 되찾기 위해 여정을 떠납니다!", bg: 0x222211 }
        ];
        this.currentSlide = 0;

        // 배경 그래픽
        this.bgRect = this.add.rectangle(480, 270, 960, 540, this.slides[0].bg);

        // 이미지(임시로 사각형 표시)
        this.imagePlaceholder = this.add.rectangle(480, 220, 500, 280, 0x555555);
        this.imageText = this.add.text(480, 220, '그림 1', {
            fontFamily: 'Noto Sans KR', fontSize: '32px', color: '#ffffff'
        }).setOrigin(0.5);

        // 대사 텍스트
        this.descText = this.add.text(480, 420, this.slides[0].text, {
            fontFamily: 'Noto Sans KR', fontSize: '24px', color: '#ffffff',
            wordWrap: { width: 800, useAdvancedWrap: true },
            align: 'center'
        }).setOrigin(0.5);

        // 다음으로 넘어가기 안내 텍스트
        this.add.text(480, 500, '화면을 클릭하여 다음으로...', {
            fontFamily: 'Noto Sans KR', fontSize: '16px', color: '#aaaaaa'
        }).setOrigin(0.5);

        // 화면 클릭 시 다음 슬라이드로
        this.input.on('pointerdown', () => {
            // 모바일 가로 모드일 때 전체화면 진입 시도
            const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
            if (isMobile && !this.scale.isFullscreen && window.innerWidth > window.innerHeight) {
                this.scale.startFullscreen();
            }
            this.nextSlide();
        });
    }

    nextSlide() {
        this.currentSlide++;
        if (this.currentSlide >= this.slides.length) {
            // 오프닝이 끝나면 월드맵으로 이동
            this.scene.start('WorldMapScene');
        } else {
            const slide = this.slides[this.currentSlide];
            this.bgRect.fillColor = slide.bg;
            this.imageText.setText(`그림 ${this.currentSlide + 1}`);
            this.descText.setText(slide.text);
        }
    }
}
