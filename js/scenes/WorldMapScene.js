class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
    }

    create() {
        const currentWorld = this.registry.get('currentWorld') || 1;
        const unlockedStages = this.registry.get('unlockedStages') || [1];

        // 배경색
        this.cameras.main.setBackgroundColor('#2a1b3d');

        // 월드맵 제목
        const titleText = currentWorld === 1 ? 'World 1: Stratocaster' : 'World 2: Telecaster';
        this.add.text(480, 50, titleText, {
            fontFamily: 'Inter', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(10);

        if (currentWorld === 1) {
            // 월드 1 배경 이미지 적용 및 화면 크기(960x540)에 맞게 꽉 채우기
            const bg = this.add.image(480, 270, 'map_world_01').setOrigin(0.5);
            bg.setDisplaySize(960, 540);
        } else {
            // 임시 기타 모양 배경 (추후 이미지로 교체)
            this.add.rectangle(480, 270, 700, 250, 0x4a3b5d).setAngle(-15);
            this.add.text(480, 270, '(기타 모양 월드맵 이미지 자리)', {
                fontFamily: 'Noto Sans KR', fontSize: '20px', color: '#999999'
            }).setOrigin(0.5).setAngle(-15);
        }

        // 스테이지 노드 위치 (이미지 상의 빨간 네모 위치에 맞춤)
        const nodes = [
            { id: 1, x: 215, y: 405 },
            { id: 2, x: 430, y: 410 },
            { id: 3, x: 315, y: 250 },
            { id: 4, x: 610, y: 360 },
            { id: 5, x: 750, y: 235 }
        ];

        // 플레이어 초기 위치 설정
        const housePos = { x: 80, y: 430 }; // 대략적인 왼쪽 하단 통나무집 위치
        let startPos = housePos;
        const lastNodeId = this.registry.get('playerCurrentNode');
        if (lastNodeId) {
            const lastNode = nodes.find(n => n.id === lastNodeId);
            if (lastNode) startPos = { x: lastNode.x, y: lastNode.y };
        }

        // 플레이어 스프라이트 생성
        const playerTexture = this.textures.exists('idle1') ? 'idle1' : 'player_tex';
        this.player = this.add.sprite(startPos.x, startPos.y, playerTexture);
        this.player.setDepth(20);
        
        if (this.textures.exists('idle1')) {
            this.player.setScale(0.5); // 월드맵에 맞게 크기 조절
            this.player.play('idle_loop');
        }

        this.isMoving = false;

        // 노드 그리기
        nodes.forEach((node, index) => {
            const isUnlocked = unlockedStages.includes(node.id);
            const color = isUnlocked ? 0x3b82f6 : 0x555555; // 파란색(해금) / 회색(잠김)

            // 노드 원
            const circle = this.add.circle(node.x, node.y, 25, color);
            
            // 노드 텍스트
            this.add.text(node.x, node.y, String(node.id), {
                fontFamily: 'Inter', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);

            if (isUnlocked) {
                circle.setInteractive({ useHandCursor: true });
                circle.on('pointerdown', () => {
                    if (this.isMoving) return;

                    const enterStage = () => {
                        this.isMoving = true;
                        if (this.textures.exists('jump1')) {
                            this.player.play('jump_air');
                        }
                        this.tweens.add({
                            targets: this.player,
                            y: this.player.y - 30, // 30픽셀 낮게 점프
                            duration: 200,
                            yoyo: true,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                this.isMoving = false;
                                this.registry.set('playerCurrentNode', node.id);
                                this.scene.start('GameScene', { stage: node.id });
                            }
                        });
                    };

                    if (this.player.x === node.x && this.player.y === node.y) {
                        enterStage();
                        return;
                    }

                    this.isMoving = true;
                    
                    if (node.x < this.player.x) {
                        this.player.setFlipX(true);
                    } else {
                        this.player.setFlipX(false);
                    }

                    if (this.textures.exists('walk1')) {
                        this.player.play('walk');
                    }

                    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
                    
                    this.tweens.add({
                        targets: this.player,
                        x: node.x,
                        y: node.y,
                        duration: distance * 4, // 이동 속도 조절
                        ease: 'Linear',
                        onComplete: () => {
                            enterStage();
                        }
                    });
                });
                
                // 마우스 호버 효과
                circle.on('pointerover', () => {
                    if (!this.isMoving) circle.setStrokeStyle(4, 0xffffff);
                });
                circle.on('pointerout', () => circle.setStrokeStyle(0));
            }
        });
        
        // 현재 획득한 아이템/부품 상태 표시 UI
        const parts = this.registry.get('guitarParts') || [];
        this.add.text(20, 500, `획득한 부품: ${parts.join(', ') || '없음'}`, {
            fontFamily: 'Noto Sans KR', fontSize: '18px', color: '#ffffff'
        });

        // 빈 화면 터치 시 모바일 가로 모드 전체화면 발동
        this.input.on('pointerdown', () => {
            const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
            if (isMobile && !this.scale.isFullscreen && window.innerWidth > window.innerHeight) {
                this.scale.startFullscreen();
            }
        });
    }
}
