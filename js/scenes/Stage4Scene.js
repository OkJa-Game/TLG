class Stage4Scene extends Phaser.Scene {
    constructor() {
        super('Stage4Scene');
        this.isQuizActive = false;
    }

    create() {
        const stageNum = this.registry.get('currentStage') || 4;
        
        // 1. 카메라와 맵 기본 설정 (종스크롤 960x3000)
        this.cameras.main.setBounds(0, 0, 960, 3000);
        this.physics.world.setBounds(0, 0, 960, 3000);
        this.cameras.main.setBackgroundColor('#1e3a8a'); // 깊은 하늘/바다 느낌의 배경

        // 2. 바닥 플랫폼 그룹
        this.platforms = this.physics.add.staticGroup();
        
        // 최하단 바닥 (완전한 바닥)
        for(let i=0; i<960; i+=40) {
            this.platforms.create(i+20, 2980, 'ground_tex');
        }

        // 3. 상호작용 객체, 아이템, 적 그룹 초기화
        this.interactables = this.physics.add.staticGroup();
        this.items = this.physics.add.group({ allowGravity: false, immovable: true });
        this.enemies = this.physics.add.group();
        this.missiles = this.physics.add.group();

        // 지그재그 플랫폼 생성 (아래에서 위로 올라가는 계단식)
        let yPos = 2780; // 최하단(2980)에서 200만큼 위에서 시작
        let isLeft = true;
        let floorCount = 0;

        while (yPos > 300) {
            let startX = isLeft ? 0 : 400;
            let endX = isLeft ? 560 : 960;
            
            for(let x=startX; x<endX; x+=40) {
                this.platforms.create(x+20, yPos, 'ground_tex');
            }
            
            // 중간중간 점프를 돕는 작은 발판 생성
            // 천장이 막혀 점프할 수 없는 겹치는 구역(400~560)을 피해서 완전한 바깥쪽으로 배치
            if (yPos - 200 > 300) {
                const platformX = isLeft ? 200 : 760; // 첫 번째 장애물은 x=200, 그 위의 장애물은 대칭되게 우측으로(x=760)
                this.platforms.create(platformX, yPos - 100, 'ground_tex');
            }

            // 아이템, 적, 퀴즈 박스 동적 배치
            const itemX = isLeft ? 150 : 810; // 점프 도착지점(중앙 부근)에서 멀리 이동
            if (floorCount === 2) this.items.add(new Item(this, itemX, yPos - 50, 'item_tex', 'part1'));
            if (floorCount === 5) this.items.add(new Item(this, itemX, yPos - 50, 'item_tex', 'part2'));
            if (floorCount === 8) this.items.add(new Item(this, itemX, yPos - 50, 'item_tex', 'part3'));
            if (floorCount === 11) this.items.add(new Item(this, itemX, yPos - 50, 'item_tex', 'part4'));

            if (floorCount === 3 || floorCount === 6 || floorCount === 9 || floorCount === 12) {
                this.enemies.add(new Enemy(this, itemX, yPos - 50, 'enemy_tex'));
            }

            if (floorCount === 7) {
                const box = this.physics.add.staticSprite(itemX, yPos - 40, 'box_tex');
                this.interactables.add(box);
                box.quizId = 'box_riddle';
            }

            yPos -= 200; // 기존 165에서 200으로 층 높이 증가
            isLeft = !isLeft;
            floorCount++;
        }
        
        // 문 앞 발판 (너무 높지 않게 기존 150에서 200으로 낮춤)
        for(let i=360; i<600; i+=40) {
            this.platforms.create(i+20, 200, 'ground_tex');
        }

        // 맨 위 목적지 (문)
        const door = this.physics.add.staticSprite(480, 50, 'door_tex');
        this.interactables.add(door);
        door.setOrigin(0.5, 1);
        door.setY(200); // 발판 높이에 맞게 200으로 수정
        door.refreshBody();
        door.isDoor = true;

        // 6. 플레이어 생성 (최하단)
        const playerTexture = this.textures.exists('idle1') ? 'idle1' : 'player_tex';
        this.player = new Player(this, 480, 2900, playerTexture);
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
                player.setTint(0xff0000);
                this.time.delayedCall(200, () => player.clearTint());
                missile.destroy();
            }
        });

        // 적 몸체 충돌 로직
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!player.isInteracting && !player.isAttacking) {
                // 뒤로 튕겨남
                player.setVelocityX(player.x < enemy.x ? -300 : 300);
                player.setVelocityY(-200);
            }
        });

        // 퀴즈 및 도어 상호작용
        this.physics.add.overlap(this.player, this.interactables, (player, interactable) => {
            if (player.isInteracting) return;
            
            if (interactable.isDoor) {
                player.setInteracting(true);
                const collected = this.registry.get('collectedItems') || 0;
                
                if (collected >= 4) {
                    this.showSpeechBubble(interactable.x, interactable.y - interactable.displayHeight, "부품 C를 획득했다! 다음 지역으로 이동하자.", 2000, () => {
                        let parts = this.registry.get('guitarParts') || [];
                        parts.push('Part C');
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

        this.input.addPointer(2);
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
        if (isMobile) {
            this.setupGestureControls();
        }
    }

    update(time, delta) {
        if (!this.isQuizActive) {
            this.player.update(time, delta);
            
            // 맵 하단 밖으로 추락 시 재시작 (방어코드)
            if (this.player.y > 3100) {
                this.scene.restart();
            }
        }
    }

    showSpeechBubble(x, y, textMessage, duration, callback) {
        const padding = 15;
        const arrowHeight = 15;
        
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
        
        const bubbleX = x - bubbleWidth / 2;
        const bubbleY = y - bubbleHeight - arrowHeight - 10;
        
        const bubble = this.add.graphics({ x: bubbleX, y: bubbleY });

        bubble.fillStyle(0x222222, 0.3);
        bubble.fillRoundedRect(4, 4, bubbleWidth, bubbleHeight, 10);
        bubble.fillStyle(0xffffff, 1);
        bubble.fillRoundedRect(0, 0, bubbleWidth, bubbleHeight, 10);
        bubble.lineStyle(2, 0x565656, 1);
        bubble.strokeRoundedRect(0, 0, bubbleWidth, bubbleHeight, 10);

        const arrowX = bubbleWidth / 2;
        const arrowY = bubbleHeight;
        
        bubble.fillStyle(0xffffff, 1);
        bubble.fillTriangle(arrowX - 10, arrowY, arrowX + 10, arrowY, arrowX, arrowY + arrowHeight);
        bubble.lineBetween(arrowX - 10, arrowY, arrowX, arrowY + arrowHeight);
        bubble.lineBetween(arrowX + 10, arrowY, arrowX, arrowY + arrowHeight);
        bubble.lineStyle(3, 0xffffff, 1);
        bubble.lineBetween(arrowX - 9, arrowY, arrowX + 9, arrowY);

        content.setPosition(bubbleX + padding, bubbleY + padding);
        content.setDepth(10);
        bubble.setDepth(9);
        
        bubble.setScale(0);
        content.setScale(0);
        
        this.tweens.add({
            targets: [bubble, content],
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                const dismissBubble = () => {
                    this.input.off('pointerdown', dismissBubble);
                    this.input.keyboard.off('keydown', dismissBubble);
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
                };
                
                this.time.delayedCall(200, () => {
                    this.input.on('pointerdown', dismissBubble);
                    this.input.keyboard.on('keydown', dismissBubble);
                });
            }
        });
    }

    setupGestureControls() {
        let startY = 0;
        let isSwiping = false;
        let lastTapTime = 0;

        this.input.on('pointerdown', (pointer) => {
            const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
            if (isMobile && !this.scale.isFullscreen && window.innerWidth > window.innerHeight) {
                this.scale.startFullscreen();
            }
            startY = pointer.y;
            isSwiping = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            
            // 위로 40픽셀 이상 드래그
            if (startY - pointer.y > 40) {
                if (this.player.mobileKeys.down) {
                    // 기어가는 상태에서 위로 올리면 정상대기로 (점프 안함)
                    this.player.mobileKeys.down = false;
                } else {
                    // 서있는 상태에서 위로 올리면 점프
                    this.player.mobileKeys.up = true;
                }
                isSwiping = true;
                startY = pointer.y; // 드래그 중복 방지
            } 
            // 아래로 40픽셀 이상 드래그하면 기어가기(엎드리기) 제스처로 인식
            else if (pointer.y - startY > 40) {
                // 두 손가락으로 드래그할 때만 엎드리기 실행
                if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
                    this.player.mobileKeys.down = true;
                    isSwiping = true;
                    startY = pointer.y;
                }
            }
        });

        this.input.on('pointerup', (pointer) => {
            this.player.mobileKeys.up = false;
            if (isSwiping) return;

            const currentTime = this.time.now;
            if (currentTime - lastTapTime < 300) {
                this.player.mobileKeys.attackJustDown = true;
                this.player.mobileKeys.attack = true;
                lastTapTime = 0;
                return;
            }
            lastTapTime = currentTime;

            const isRightSide = pointer.x > this.cameras.main.width / 2;

            if (this.player.mobileKeys.right) {
                if (isRightSide) {
                    this.player.mobileKeys.right = false;
                } else {
                    this.player.mobileKeys.right = false;
                    this.player.mobileKeys.left = true;
                }
            } else if (this.player.mobileKeys.left) {
                if (!isRightSide) {
                    this.player.mobileKeys.left = false;
                } else {
                    this.player.mobileKeys.left = false;
                    this.player.mobileKeys.right = true;
                }
            } else {
                if (isRightSide) {
                    this.player.mobileKeys.right = true;
                } else {
                    this.player.mobileKeys.left = true;
                }
            }
        });
    }
}
