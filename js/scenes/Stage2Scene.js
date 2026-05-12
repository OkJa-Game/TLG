class Stage2Scene extends Phaser.Scene {
    constructor() {
        super('Stage2Scene');
        this.isQuizActive = false;
    }

    create() {
        const stageNum = this.registry.get('currentStage') || 2;
        
        // 1. 카메라와 맵 기본 설정 (종스크롤 960x3000)
        this.cameras.main.setBounds(0, 0, 960, 3000);
        this.physics.world.setBounds(0, 0, 960, 3000);
        this.cameras.main.setBackgroundColor('#2d2d2d'); // 탄광 느낌의 어두운 배경

        // 2. 바닥 플랫폼 그룹
        this.platforms = this.physics.add.staticGroup();
        
        // 최상단, 최하단, 좌우 벽 (선택 사항이나 화면 이탈 방지용)
        // 바닥 (도착 지점 주변만 발판 생성, 나머지는 구멍)
        for(let i=360; i<600; i+=40) {
            this.platforms.create(i+20, 2980, 'ground_tex');
        }

        // 지그재그 플랫폼 생성
        let yPos = 300;
        let isLeft = true;
        while (yPos < 2800) {
            let startX = isLeft ? 0 : 400;
            let endX = isLeft ? 560 : 960;
            for(let x=startX; x<endX; x+=40) {
                this.platforms.create(x+20, yPos, 'ground_tex');
            }
            yPos += 300;
            isLeft = !isLeft;
        }

        // 중간중간 작은 발판 생성
        this.platforms.create(480, 450, 'ground_tex');
        this.platforms.create(480, 1050, 'ground_tex');
        this.platforms.create(480, 1650, 'ground_tex');
        this.platforms.create(480, 2250, 'ground_tex');

        // 3. 상호작용 객체 (클리어 지점)
        this.interactables = this.physics.add.staticGroup();
        // 맨 아래 목적지 (탄광 깊숙한 곳의 기술장이 또는 문)
        const door = this.physics.add.staticSprite(480, 2900, 'door_tex');
        this.interactables.add(door);
        door.setOrigin(0.5, 1);
        door.setY(2960);
        door.refreshBody();
        door.isDoor = true;

        // 중간 퀴즈 상자
        const box = this.physics.add.staticSprite(200, 1400, 'box_tex');
        this.interactables.add(box);
        box.quizId = 'box_riddle';

        // 4. 아이템 그룹 생성 (임의 위치에 부품 조각 수집)
        this.items = this.physics.add.group({ allowGravity: false, immovable: true });
        this.items.add(new Item(this, 300, 250, 'item_tex', 'part1'));
        this.items.add(new Item(this, 700, 850, 'item_tex', 'part2'));
        this.items.add(new Item(this, 200, 1450, 'item_tex', 'part3'));
        this.items.add(new Item(this, 700, 2050, 'item_tex', 'part4'));

        // 5. 적 및 미사일 그룹 생성
        this.enemies = this.physics.add.group();
        this.missiles = this.physics.add.group();
        
        // 스테이지에 적 배치
        this.enemies.add(new Enemy(this, 300, 550, 'enemy_tex'));
        this.enemies.add(new Enemy(this, 700, 1150, 'enemy_tex'));
        this.enemies.add(new Enemy(this, 300, 1750, 'enemy_tex'));
        this.enemies.add(new Enemy(this, 700, 2350, 'enemy_tex'));

        // 6. 플레이어 생성 (최상단)
        const playerTexture = this.textures.exists('idle1') ? 'idle1' : 'player_tex';
        this.player = new Player(this, 480, 100, playerTexture);
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
                    this.showSpeechBubble(interactable.x, interactable.y - interactable.displayHeight, "부품 B를 획득했다! 다음 지역으로 이동하자.", 2000, () => {
                        let parts = this.registry.get('guitarParts') || [];
                        parts.push('Part B');
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
            
            // 추락 시 게임 오버 (처음부터 재시작)
            if (this.player.y > 3000) {
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
            if (startY - pointer.y > 40) {
                this.player.mobileKeys.up = true;
                isSwiping = true;
                startY = pointer.y;
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
