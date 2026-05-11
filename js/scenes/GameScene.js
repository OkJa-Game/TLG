class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.isQuizActive = false;
    }

    create() {
        const stageNum = this.registry.get('currentStage') || 1;
        
        // 1. 카메라와 맵 기본 설정
        this.cameras.main.setBounds(0, 0, 3000, 540);
        this.physics.world.setBounds(0, 0, 3000, 540);
        this.cameras.main.setBackgroundColor('#87CEEB'); // 하늘색 배경

        // 2. 바닥 플랫폼 그룹
        this.platforms = this.physics.add.staticGroup();
        for(let i=0; i<3000; i+=40) {
            this.platforms.create(i+20, 520, 'ground_tex');
        }

        // 3. 상호작용 객체 (대장장이 및 퀴즈 등)
        this.interactables = this.physics.add.staticGroup();
        // 대장장이 (목적지) - 스테이지 끝부분
        const blacksmith = this.interactables.create(2800, 500, 'npc_blacksmith');
        blacksmith.setOrigin(0.5, 1);
        // 플레이어 캐릭터와 동일하게 하단 10%의 투명 여백을 고려하여 바닥으로 내림
        blacksmith.setY(500 + blacksmith.height * 0.1);
        blacksmith.refreshBody();
        blacksmith.isBlacksmith = true;
        
        // 중간 퀴즈 상자
        const box = this.interactables.create(1000, 390, 'box_tex');
        box.quizId = 'box_riddle';

        // 4. 아이템 그룹 생성 (1~4번 부품 조각 수집)
        this.items = this.physics.add.group({ allowGravity: false, immovable: true });
        for(let i=1; i<=4; i++) {
            const item = new Item(this, 400 + i * 400, 340, 'item_tex', `part${i}`);
            this.items.add(item);
        }

        // 5. 적 및 미사일 그룹 생성
        this.enemies = this.physics.add.group();
        this.missiles = this.physics.add.group();
        
        // 스테이지에 적 2마리 배치
        const enemy1 = new Enemy(this, 1200, 440, 'enemy_tex');
        const enemy2 = new Enemy(this, 2000, 440, 'enemy_tex');
        this.enemies.add(enemy1);
        this.enemies.add(enemy2);

        // 6. 플레이어 생성
        const playerTexture = this.textures.exists('idle1') ? 'idle1' : 'player_tex';
        this.player = new Player(this, 100, 340, playerTexture);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        // 7. 물리 충돌 설정
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        
        // 아이템 획득 로직
        this.physics.add.overlap(this.player, this.items, (player, item) => {
            let count = this.registry.get('collectedItems') || 0;
            this.registry.set('collectedItems', count + 1);
            console.log("아이템 획득! 총 획득량:", count + 1);
            item.collect();
        });

        // 적 미사일 피격 로직
        this.physics.add.overlap(this.player, this.missiles, (player, missile) => {
            if (!player.isInteracting) {
                console.log("미사일에 맞았습니다!");
                player.setTint(0xff0000);
                this.time.delayedCall(200, () => player.clearTint());
                missile.destroy();
            }
        });

        // 적 몸체 충돌 로직
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!player.isInteracting && !player.isAttacking) {
                console.log("적과 부딪혔습니다!");
                // 뒤로 튕겨남
                player.setVelocityX(player.x < enemy.x ? -300 : 300);
                player.setVelocityY(-200);
            }
        });

        // 대장장이 및 퀴즈 상호작용
        this.physics.add.overlap(this.player, this.interactables, (player, interactable) => {
            if (player.isInteracting) return;
            
            if (interactable.isBlacksmith) {
                player.setInteracting(true);
                
                // 대장장이 로직
                const collected = this.registry.get('collectedItems') || 0;
                if (collected >= 4) { // 4개를 모아야 클리어
                    this.showSpeechBubble(interactable.x, interactable.y - interactable.displayHeight, "오! 재료를 모두 모아왔군. 부품 A를 만들어 주지!", 2000, () => {
                        let parts = this.registry.get('guitarParts') || [];
                        parts.push('Part A');
                        this.registry.set('guitarParts', parts);
                        
                        // 다음 스테이지 해금
                        let unlocked = this.registry.get('unlockedStages');
                        if (!unlocked.includes(stageNum + 1)) unlocked.push(stageNum + 1);
                        this.registry.set('unlockedStages', unlocked);
                        this.registry.set('collectedItems', 0); // 아이템 초기화
                        
                        this.scene.start('WorldMapScene');
                    });
                } else {
                    this.showSpeechBubble(interactable.x, interactable.y - interactable.displayHeight, `재료가 부족해... (현재 ${collected}/4개)`, 1500, () => {
                        // 약간 뒤로 물러나게 해서 무한 상호작용 방지
                        player.x -= 20;
                        player.setInteracting(false);
                    });
                }
            } else if (interactable.quizId) {
                player.setInteracting(true);
                QuizOverlay.show(interactable.quizId, (isCorrect) => {
                    interactable.destroy(); // 퀴즈를 풀면 사라짐
                    player.setInteracting(false);
                });
            }
        });

        // 멀티 터치 활성화 (모바일에서 여러 버튼 동시 누르기 지원, 예: 이동+점프)
        this.input.addPointer(2);

        // 모바일 환경일 경우 제스처 컨트롤 설정
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
        if (isMobile) {
            this.setupGestureControls();
        }
    }

    update(time, delta) {
        // 퀴즈 창이 떠있지 않을 때만 플레이어 업데이트
        if (!this.isQuizActive) {
            this.player.update(time, delta);
        }
    }

    handleInteraction(player, interactable) {
        // 이미 퀴즈를 풀었거나 현재 퀴즈 중이면 무시
        if (interactable.isSolved || this.isQuizActive) return;

        // 퀴즈 시작!
        this.isQuizActive = true;
        this.player.setInteracting(true); // 플레이어 움직임 멈춤

        // HTML 오버레이 띄우기
        QuizOverlay.show(interactable.quizId, (isCorrect) => {
            // 퀴즈가 끝나고 콜백으로 돌아옴
            this.isQuizActive = false;
            this.player.setInteracting(false);

            if (isCorrect) {
                // 정답 시 객체를 흐리게 만들고 다시 상호작용 안되게 처리
                interactable.isSolved = true;
                interactable.setAlpha(0.5);
                
                // 파티클 효과나 사운드 재생 가능
                const text = this.add.text(interactable.x, interactable.y - 50, 'Clear!', {
                    fontSize: '24px', fontStyle: 'bold', fill: '#4ade80', stroke: '#000', strokeThickness: 4
                });
                this.tweens.add({
                    targets: text,
                    y: text.y - 50,
                    alpha: 0,
                    duration: 1500,
                    onComplete: () => text.destroy()
                });

            } else {
                // 오답 시 플레이어를 뒤로 밀쳐냄 (벌칙)
                this.player.setVelocityY(-300);
                this.player.setVelocityX(this.player.flipX ? 300 : -300);
                
                const text = this.add.text(player.x, player.y - 50, '앗!', {
                    fontSize: '24px', fontStyle: 'bold', fill: '#ef4444', stroke: '#000', strokeThickness: 4
                });
                this.tweens.add({
                    targets: text,
                    y: text.y - 50,
                    alpha: 0,
                    duration: 1500,
                    onComplete: () => text.destroy()
                });
            }
        });
    }

    handleWin(player, door) {
        if(this.isQuizActive) return;
        
        // 간단한 클리어 연출
        this.physics.pause();
        this.isQuizActive = true;
        
        const winText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'STAGE CLEAR!', {
            fontSize: '64px',
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fill: '#fcd34d',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setScrollFactor(0);
        
        this.tweens.add({
            targets: winText,
            scaleX: 1.2,
            scaleY: 1.2,
            yoyo: true,
            repeat: -1,
            duration: 500
        });
    }

    showSpeechBubble(x, y, textMessage, duration, callback) {
        const padding = 15;
        const arrowHeight = 15;
        
        // 먼저 텍스트를 만들어 사이즈를 측정
        const content = this.add.text(0, 0, textMessage, { 
            fontFamily: 'Noto Sans KR', 
            fontSize: '18px', 
            color: '#000000', 
            align: 'center', 
            wordWrap: { width: 250 } 
        });
        
        const b = content.getBounds();
        const bubbleWidth = b.width + padding * 2;
        const bubbleHeight = b.height + padding * 2;
        
        // 말풍선 위치 조정 (말풍선의 꼬리가 x, y를 향하도록)
        const bubbleX = x - bubbleWidth / 2;
        const bubbleY = y - bubbleHeight - arrowHeight - 10; // 캐릭터 머리보다 10px 위
        
        const bubble = this.add.graphics({ x: bubbleX, y: bubbleY });

        // 말풍선 그림자
        bubble.fillStyle(0x222222, 0.3);
        bubble.fillRoundedRect(4, 4, bubbleWidth, bubbleHeight, 10);

        // 말풍선 배경
        bubble.fillStyle(0xffffff, 1);
        bubble.fillRoundedRect(0, 0, bubbleWidth, bubbleHeight, 10);

        // 말풍선 테두리
        bubble.lineStyle(2, 0x565656, 1);
        bubble.strokeRoundedRect(0, 0, bubbleWidth, bubbleHeight, 10);

        // 꼬리 모양 (말풍선의 아래쪽 중앙)
        const arrowX = bubbleWidth / 2;
        const arrowY = bubbleHeight;
        
        bubble.fillStyle(0xffffff, 1);
        bubble.fillTriangle(arrowX - 10, arrowY, arrowX + 10, arrowY, arrowX, arrowY + arrowHeight);
        bubble.lineBetween(arrowX - 10, arrowY, arrowX, arrowY + arrowHeight);
        bubble.lineBetween(arrowX + 10, arrowY, arrowX, arrowY + arrowHeight);
        
        // 꼬리와 몸통 사이 테두리 지우기 (흰색 선 덧그리기)
        bubble.lineStyle(3, 0xffffff, 1);
        bubble.lineBetween(arrowX - 9, arrowY, arrowX + 9, arrowY);

        content.setPosition(bubbleX + padding, bubbleY + padding);
        content.setDepth(10);
        bubble.setDepth(9);
        
        // 팝업 애니메이션 효과
        bubble.setScale(0);
        content.setScale(0);
        
        this.tweens.add({
            targets: [bubble, content],
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(duration, () => {
                    this.tweens.add({
                        targets: [bubble, content],
                        scale: 0,
                        duration: 150,
                        onComplete: () => {
                            bubble.destroy();
                            content.destroy();
                            if (callback) callback();
                        }
                    });
                });
            }
        });
    }

    setupGestureControls() {
        let startY = 0;
        let isSwiping = false;
        let lastTapTime = 0;

        this.input.on('pointerdown', (pointer) => {
            // 모바일 가로 모드일 때 전체화면 진입 시도 (Phaser 내장 API 사용)
            const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
            if (isMobile && !this.scale.isFullscreen && window.innerWidth > window.innerHeight) {
                this.scale.startFullscreen();
            }

            startY = pointer.y;
            isSwiping = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            
            // 위로 40픽셀 이상 드래그하면 점프 제스처로 인식
            if (startY - pointer.y > 40) {
                this.player.mobileKeys.up = true;
                isSwiping = true;
                startY = pointer.y; // 드래그 중복 방지
            }
        });

        this.input.on('pointerup', (pointer) => {
            this.player.mobileKeys.up = false; // 손을 떼면 점프 중단(가변 점프 지원용)
            
            // 스와이프 동작이었다면 이동 방향 토글을 하지 않고 종료
            if (isSwiping) return;

            const currentTime = this.time.now;
            // 더블 탭(300ms 이내 두 번 터치) 감지 시 공격
            if (currentTime - lastTapTime < 300) {
                this.player.mobileKeys.attackJustDown = true;
                this.player.mobileKeys.attack = true;
                lastTapTime = 0; // 더블 탭 연계 초기화
                return; // 공격 시에는 이동 상태를 변경하지 않음
            }
            lastTapTime = currentTime;

            // 스와이프도 아니고 더블 탭도 아닌 단일 터치일 경우 이동 방향 설정
            const isRightSide = pointer.x > this.cameras.main.width / 2;

            if (this.player.mobileKeys.right) {
                // 오른쪽으로 이동 중일 때
                if (isRightSide) {
                    // 같은 방향(오른쪽) 터치 시 멈춤
                    this.player.mobileKeys.right = false;
                } else {
                    // 반대 방향(왼쪽) 터치 시 바로 왼쪽으로 전환
                    this.player.mobileKeys.right = false;
                    this.player.mobileKeys.left = true;
                }
            } else if (this.player.mobileKeys.left) {
                // 왼쪽으로 이동 중일 때
                if (!isRightSide) {
                    // 같은 방향(왼쪽) 터치 시 멈춤
                    this.player.mobileKeys.left = false;
                } else {
                    // 반대 방향(오른쪽) 터치 시 바로 오른쪽으로 전환
                    this.player.mobileKeys.left = false;
                    this.player.mobileKeys.right = true;
                }
            } else {
                // 멈춰있을 때 터치한 방향으로 이동 시작
                if (isRightSide) {
                    this.player.mobileKeys.right = true;
                } else {
                    this.player.mobileKeys.left = true;
                }
            }
        });
    }
}
