class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        // 원본 이미지가 너무 커서 화면에 꽉 차고 월드 경계 충돌로 인해 끼임/깜박임 현상 발생
        // 캐릭터 사이즈를 실제 크기로 적용합니다.
        this.setScale(1);
        this.setOrigin(0.5, 1); // 중심점을 바닥 중앙으로 설정하여 이미지가 변해도 바닥 기준이 고정되도록 함
        
        // 씬에 플레이어 추가
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // ---------------------------------------------------------
        // 캐릭터 공중 부양(투명 여백) 해결을 위한 히트박스 세부 조절
        // ---------------------------------------------------------
        this.baseWidth = this.width;
        this.baseHeight = this.height;

        const hitboxWidth = this.baseWidth * 0.5;   // 충돌 너비를 50%로 줄임 (벽에 자연스럽게 붙게)
        const hitboxHeight = this.baseHeight * 0.8; // 충돌 높이를 80%로 줄임
        
        const offsetX = (this.baseWidth - hitboxWidth) / 2; // 좌우 가운데 정렬
        const offsetY = this.baseHeight * 0.1; // 위에서 10% 정도 내려서, 발 밑의 투명한 10%가 땅에 파묻히도록(닿도록) 설정
        
        this.body.setSize(hitboxWidth, hitboxHeight);
        this.body.setOffset(offsetX, offsetY);
        // 만약 여전히 떠있다면 hitboxHeight를 더 줄이거나 offsetY를 늘려주세요.
        // 반대로 발이 땅에 너무 파묻힌다면 hitboxHeight를 늘리거나 offsetY를 줄이시면 됩니다.
        // ---------------------------------------------------------
        
        // 물리 속성 설정
        this.setBounce(0); // 미세한 바운스로 인한 애니메이션 깜박임을 막기 위해 탄성을 0으로 설정
        this.setCollideWorldBounds(true); // 월드 경계 충돌
        this.body.setGravityY(800); // 중력 설정
        
        // 드래그(마찰) 설정 (슈퍼마리오처럼 미끄러지듯 멈춤)
        this.setDragX(800);
        this.setMaxVelocity(300, 800); // 최대 속도 제한
        
        // 이동 속도 관련 변수
        this.accel = 1200;
        this.jumpForce = -600;
        
        // 키보드 입력 설정 (스페이스바 추가)
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.spaceBar = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // 상태 변수
        this.isInteracting = false;
        
        // 모바일 터치 입력 상태 변수
        this.mobileKeys = {
            left: false,
            right: false,
            up: false,
            down: false,
            attackJustDown: false
        };
        
        // 대기 시작 애니메이션이 끝나면 대기 반복 애니메이션으로 자연스럽게 넘어가도록 설정
        this.on('animationcomplete-idle_start', () => {
            this.anims.play('idle_loop');
        });
    }
    
    update(time, delta) {
        // 인터랙션 중(예: 퀴즈 푸는 중)이면 움직임 정지
        if (this.isInteracting) {
            this.setAccelerationX(0);
            this.setVelocityX(0);
            if(this.anims.isPlaying && this.anims.currentAnim.key === 'walk') {
                this.anims.stop();
            }
            return;
        }

        const body = this.body;
        const cursors = this.cursors;

        // 공격 로직 (스페이스바) - 무기가 있을 때만 작동
        if (Phaser.Input.Keyboard.JustDown(this.spaceBar) || this.mobileKeys.attackJustDown) {
            this.mobileKeys.attackJustDown = false; // JustDown 효과를 위해 1프레임 소모 후 해제
            const weapon = this.scene.registry.get('currentWeapon');
            if (weapon) {
                this.attack();
            } else {
                console.log("무기가 없습니다!");
            }
        }

        // 좌우 이동 및 기어가기 로직
        if ((cursors.down.isDown || this.mobileKeys.down) && body.blocked.down) {
            this.idleTime = 0; // 추가: 이동 시 타이머 초기화
            const isFirstCrouchFrame = !this.wasCrawling;
            this.wasCrawling = true; // 기어가기 상태 추적
            // 기어가기 이동 로직
            const crawlAccel = this.accel * 0.4; // 기어갈 때는 걷기보다 느리게 가속
            const crawlMaxVel = 150; // 기어갈 때 최대 속도 제한
            
            if (cursors.left.isDown || this.mobileKeys.left) {
                this.setAccelerationX(-crawlAccel);
                this.setFlipX(true);
                if (this.body.velocity.x < -crawlMaxVel) {
                    this.setVelocityX(-crawlMaxVel);
                }
            } else if (cursors.right.isDown || this.mobileKeys.right) {
                this.setAccelerationX(crawlAccel);
                this.setFlipX(false);
                if (this.body.velocity.x > crawlMaxVel) {
                    this.setVelocityX(crawlMaxVel);
                }
            } else {
                this.setAccelerationX(0);
                this.setVelocityX(this.body.velocity.x * 0.9); // 마찰로 느려짐
            }
            
            // 기어가기 히트박스 축소
            const crawlHeight = this.baseHeight * 0.4; // 절반으로 줄임
            this.body.setSize(this.baseWidth * 0.5, crawlHeight);
            
            const offsetX = Math.round((this.width - this.baseWidth * 0.5) / 2);
            const bottomPadding = this.baseHeight * 0.1;
            const offsetY = Math.round(this.height - crawlHeight - bottomPadding);
            this.body.setOffset(offsetX, offsetY); // 바닥에 붙임
            
            if (this.texture.key !== 'player_tex') {
                const isMoving = (cursors.left.isDown || this.mobileKeys.left || cursors.right.isDown || this.mobileKeys.right);
                const currentKey = (this.anims.isPlaying && this.anims.currentAnim) ? this.anims.currentAnim.key : '';
                
                if (isFirstCrouchFrame) {
                    this.anims.play('crawl_start', true);
                } else if (isMoving) {
                    if (currentKey !== 'crawl_start' && currentKey !== 'crawl_loop') {
                        this.anims.play('crawl_loop', true);
                    }
                } else {
                    if (currentKey !== 'crawl_start') {
                        this.anims.stop();
                        if (this.texture.key !== 'crawl2') {
                            this.setTexture('crawl2');
                        }
                    }
                }
            }
        } else {
            // 기어가기 아닐 때 히트박스 복구
            const normalHeight = this.baseHeight * 0.8;
            this.body.setSize(this.baseWidth * 0.5, normalHeight);
            
            const offsetX = Math.round((this.width - this.baseWidth * 0.5) / 2);
            const bottomPadding = this.baseHeight * 0.1;
            const offsetY = Math.round(this.height - normalHeight - bottomPadding);
            this.body.setOffset(offsetX, offsetY);

            if (cursors.left.isDown || this.mobileKeys.left) {
                this.idleTime = 0; // 추가
                this.wasCrawling = false;
                this.setAccelerationX(-this.accel);
                this.setFlipX(true);
                
                if (this.texture.key !== 'player_tex' && body.blocked.down) {
                    this.anims.play('walk', true);
                }
            } else if (cursors.right.isDown || this.mobileKeys.right) {
                this.idleTime = 0; // 추가
                this.wasCrawling = false;
                this.setAccelerationX(this.accel);
                this.setFlipX(false);
                
                if (this.texture.key !== 'player_tex' && body.blocked.down) {
                    this.anims.play('walk', true);
                }
            } else {
                this.setAccelerationX(0);
                if (body.blocked.down && Math.abs(this.body.velocity.x) < 10) {
                    this.idleTime = (this.idleTime || 0) + delta;
                    
                    if (this.texture.key !== 'player_tex') {
                        const currentKey = this.anims.currentAnim ? this.anims.currentAnim.key : '';
                        
                        if (currentKey !== 'attack') {
                            const targetIdleTime = this.wasCrawling ? 100 : 1000;
                            if (this.idleTime >= targetIdleTime) {
                                // 설정된 시간 경과: 대기 애니메이션 시작
                                if (currentKey !== 'idle_start' && currentKey !== 'idle_loop') {
                                    this.anims.play('idle_start');
                                    this.wasCrawling = false; // 대기 애니메이션 재생 시 기어가기 상태 리셋
                                }
                            } else {
                                // 설정된 시간 미만: 기본 정지 상태 유지
                                if (currentKey !== 'idle_start' && currentKey !== 'idle_loop') {
                                    if (this.anims.isPlaying) {
                                        this.anims.stop();
                                    }
                                    if (this.wasCrawling) {
                                        if (this.texture.key !== 'crawl1') {
                                            this.setTexture('crawl1');
                                        }
                                    } else {
                                        if (this.texture.key !== 'idle1') {
                                            this.setTexture('idle1');
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    this.idleTime = 0; // 공중이거나 밀려나는 중
                    this.wasCrawling = false;
                }
            }
        }

        // 점프 로직
        // 바닥에 닿아있을 때만 점프 가능
        if ((cursors.up.isDown || this.mobileKeys.up) && body.blocked.down) {
            this.idleTime = 0; // 추가
            this.wasCrawling = false;
            this.setVelocityY(this.jumpForce);
        }
        
        // 공중에서 점프 키를 떼면 약간의 가변 점프(짧게 누르면 낮게 뛰기) 지원
        if ((cursors.up.isUp && !this.mobileKeys.up) && this.body.velocity.y < 0) {
            this.setVelocityY(this.body.velocity.y * 0.5);
        }
        
        // 공중에 떠 있을 때(점프 중) 걷기/대기 애니메이션 정지 처리 및 점프 모션
        // 미세한 움직임에서 점프 애니메이션이 재생되지 않도록 y축 속도 임계값(15)을 설정합니다.
        if (!body.blocked.down && Math.abs(this.body.velocity.y) > 15) {
            if (this.texture.key !== 'player_tex') {
                const currentKey = this.anims.currentAnim ? this.anims.currentAnim.key : '';
                
                if (this.body.velocity.y < 0) {
                    // 상승: 1,2,3
                    if (currentKey !== 'jump_air') this.anims.play('jump_air', true);
                } else if (this.body.velocity.y > 0 && this.body.velocity.y < 300) {
                    // 하강 초기 (최고점에서 내려올 때): 4
                    if (currentKey !== 'jump_down1') this.anims.play('jump_down1', true);
                } else if (this.body.velocity.y >= 300) {
                    // 착지 직전 (가속이 붙어서 빠르게 내려올 때): 5
                    if (currentKey !== 'jump_down2') this.anims.play('jump_down2', true);
                }
            }
        }
    }

    attack() {
        if (this.isInteracting || this.isAttacking) return;
        this.isAttacking = true;
        
        // TODO: attack 애니메이션 추가 예정
        // this.anims.play('attack');
        
        console.log("스트라토캐스터 공격!");
        
        // 간단한 검기(Hitbox) 이펙트 추가 (플레이어 앞쪽)
        const hitX = this.flipX ? this.x - 40 : this.x + 40;
        const hitY = this.y - this.baseHeight / 2; // 중심점이 바닥이므로 반만큼 올려서 생성
        const slash = this.scene.add.rectangle(hitX, hitY, 40, 80, 0xffaa00);
        this.scene.physics.add.existing(slash);
        slash.body.setAllowGravity(false);
        
        // 적과의 충돌 판정 (씬의 enemies 그룹이 있다고 가정)
        if (this.scene.enemies) {
            this.scene.physics.overlap(slash, this.scene.enemies, (s, enemy) => {
                enemy.destroy(); // 적 처치
            });
        }
        
        // 0.2초 후 검기 이펙트 소멸 및 공격 상태 해제
        this.scene.time.delayedCall(200, () => {
            slash.destroy();
            this.isAttacking = false;
        });
    }

    // 다른 행동 중일 때 조작을 막기 위한 메서드
    setInteracting(value) {
        this.isInteracting = value;
        if (value) {
            // 움직임 멈춤
            this.setAccelerationX(0);
            this.setVelocityX(0);
        }
    }
}
