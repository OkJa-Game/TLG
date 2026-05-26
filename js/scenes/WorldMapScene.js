class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
    }

    create() {
        this.currentWorld = this.registry.get('currentWorld') || 1;
        this.unlockedStages = this.registry.get('unlockedStages') || Array.from({length: 24}, (_, i) => i);

        // 배경색
        this.cameras.main.setBackgroundColor('#2a1b3d');
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // 월드맵 제목
        const titleText = this.currentWorld === 1 ? 'World 1: Stratocaster' : 'World 2: Telecaster';
        this.add.text(480, 50, titleText, {
            fontFamily: 'Inter', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(10);

        if (this.currentWorld === 1) {
            const bg = this.add.image(480, 270, 'map_world_01').setOrigin(0.5);
            bg.setDisplaySize(960, 540);
        } else {
            this.add.rectangle(480, 270, 700, 250, 0x4a3b5d).setAngle(-15);
            this.add.text(480, 270, '(기타 모양 월드맵 이미지 자리)', {
                fontFamily: 'Noto Sans KR', fontSize: '20px', color: '#999999'
            }).setOrigin(0.5).setAngle(-15);
        }

        // 스테이지 노드 위치 및 연결 구조 (빨간색 그리드 기반)
        this.nodes = [];
        this.graph = {};
        this.paths = {};
        
        const X_COORDS = [55, 225, 395, 565, 735, 905];
        const Y_COORDS = [175, 280, 385, 490];
        const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
        const ROWS = ['1', '2', '3', '4'];
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                const id = COLS[c] + ROWS[r];
                this.nodes.push({ id, x: X_COORDS[c], y: Y_COORDS[r] });
                this.graph[id] = [];
            }
        }
        
        // 가로, 세로 엣지 추가
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                const id = COLS[c] + ROWS[r];
                // 우측 연결 (가로)
                if (c < 5) {
                    const rightId = COLS[c+1] + ROWS[r];
                    this.graph[id].push(rightId);
                    this.graph[rightId].push(id);
                    this.paths[`${id}-${rightId}`] = [{x: X_COORDS[c], y: Y_COORDS[r]}, {x: X_COORDS[c+1], y: Y_COORDS[r]}];
                }
                // 하단 연결 (세로)
                if (r < 3) {
                    const downId = COLS[c] + ROWS[r+1];
                    this.graph[id].push(downId);
                    this.graph[downId].push(id);
                    this.paths[`${id}-${downId}`] = [{x: X_COORDS[c], y: Y_COORDS[r]}, {x: X_COORDS[c], y: Y_COORDS[r+1]}];
                }
            }
        }

        // 노드 그리기 (개발용 표시였으므로 실제 게임 화면에서는 숨김 처리)
        /*
        this.nodes.forEach((node) => {
            this.add.circle(node.x, node.y, 20, 0x3b82f6);
            
            let label = String(node.id);
            if (node.id === 'A3') label = '🏠 A3';
            else if (['B2', 'C1', 'C4', 'D2', 'F2'].includes(node.id)) label = '⭐ ' + node.id;
            
            this.add.text(node.x, node.y, label, {
                fontFamily: 'Inter', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
        });
        */

        // B2 노드에 Mop 애니메이션 추가
        const b2Node = this.nodes.find(n => n.id === 'B2');
        if (b2Node && this.textures.exists('mop_a_1')) {
            // Mop 이미지를 B2 노드보다 살짝 위쪽에 배치 (주인공 캐릭터와 동일한 사이즈를 위해 스케일 0.5 적용)
            const mopSprite = this.add.sprite(b2Node.x, b2Node.y - 30, 'mop_a_1').setDepth(15);
            mopSprite.setScale(0.5);
            mopSprite.play('mop_idle');
        }

        // 플레이어 초기 위치 설정 (A3가 주인공 집)
        this.currentNodeId = this.registry.get('playerCurrentNode') || 'A3';
        let startPos = this.nodes.find(n => n.id === this.currentNodeId) || this.nodes[0];

        // 플레이어 스프라이트 생성
        const playerTexture = this.textures.exists('idle1') ? 'idle1' : 'player_tex';
        this.player = this.add.sprite(startPos.x, startPos.y, playerTexture);
        this.player.setDepth(20);
        this.player.setOrigin(0.5, 0.85); // 캐릭터 이미지 하단의 투명 여백을 고려하여 살짝 더 아래로 내려오도록 0.85로 설정
        
        if (this.textures.exists('idle1')) {
            this.player.setScale(0.5);
            this.player.setTexture('idle1');
        }

        this.isMoving = false;

        // 키보드 입력 설정
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        // 모바일 입력 설정
        this.lastTapTime = 0;
        this.mobileMoveIntent = { dx: 0, dy: 0 };

        this.input.on('pointerdown', (pointer) => {
            const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
            if (isMobile && !this.scale.isFullscreen && window.innerWidth > window.innerHeight) {
                this.scale.startFullscreen();
            }

            // 더블탭 감지 로직 (300ms 이내 터치 시)
            const currentTime = this.time.now;
            if (currentTime - this.lastTapTime < 300) {
                this.enterCurrentStage();
                return;
            }
            this.lastTapTime = currentTime;
            
            // 모바일 터치 이동 및 정지 처리
            if (this.mobileMoveIntent && (this.mobileMoveIntent.dx !== 0 || this.mobileMoveIntent.dy !== 0)) {
                // 이미 이동 중이거나 이동 의도가 있으면 멈춤
                this.mobileMoveIntent = { dx: 0, dy: 0 };
            } else {
                // 멈춰있거나 이동 의도가 없으면 터치한 방향으로 이동 의도 설정
                const dx = pointer.x - this.player.x;
                const dy = pointer.y - this.player.y;
                
                if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
                    this.mobileMoveIntent = { dx, dy };
                    
                    if (!this.isMoving) {
                        this.handleMovementInput(this.mobileMoveIntent.dx, this.mobileMoveIntent.dy);
                    }
                }
            }
        });

        this.input.on('pointerup', () => {});
        this.input.on('pointermove', (pointer) => {});

        // 현재 획득한 아이템/부품 상태 표시 UI
        const parts = this.registry.get('guitarParts') || [];
        this.add.text(20, 500, `획득한 부품: ${parts.join(', ') || '없음'}`, {
            fontFamily: 'Noto Sans KR', fontSize: '18px', color: '#ffffff'
        });
    }

    getWaypoints(start, end) {
        let key = `${start}-${end}`;
        if (this.paths[key]) return this.paths[key];
        key = `${end}-${start}`;
        if (this.paths[key]) return [...this.paths[key]].reverse();
        return [];
    }

    getBestNode(dx, dy) {
        if (dx === 0 && dy === 0) return null;
        
        const neighbors = this.graph[this.currentNodeId];
        if (!neighbors || neighbors.length === 0) return null;

        let bestNode = null;
        let maxDot = -1;

        const inputLen = Math.sqrt(dx * dx + dy * dy);
        if (inputLen === 0) return null;
        
        const nx = dx / inputLen;
        const ny = dy / inputLen;

        const currentNode = this.nodes.find(n => n.id === this.currentNodeId);

        for (let nextId of neighbors) {
            const neighborNode = this.nodes.find(n => n.id === nextId);
            const dirX = neighborNode.x - currentNode.x;
            const dirY = neighborNode.y - currentNode.y;
            const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (dirLen === 0) continue;
            
            const dNx = dirX / dirLen;
            const dNy = dirY / dirLen;
            
            const dot = (nx * dNx) + (ny * dNy);
            
            if (dot > 0.5 && dot > maxDot) {
                maxDot = dot;
                bestNode = nextId;
            }
        }
        return bestNode;
    }

    handleMovementInput(dx, dy) {
        if (this.isMoving) return;
        
        const bestNode = this.getBestNode(dx, dy);
        if (bestNode !== null) {
            this.moveToNode(bestNode);
        } else {
            if (this.mobileMoveIntent) {
                this.mobileMoveIntent = { dx: 0, dy: 0 };
            }
        }
    }

    moveToNode(targetId) {
        this.isMoving = true;
        const allWaypoints = this.getWaypoints(this.currentNodeId, targetId);
        
        if (allWaypoints.length === 0) {
            this.isMoving = false;
            return;
        }

        let tweensConfig = [];
        let lastPos = { x: this.player.x, y: this.player.y };

        let waypointsToMove = allWaypoints;
        // 웨이포인트 배열의 첫 요소가 현재 위치와 동일하다면 중복 제거
        if (waypointsToMove.length > 0 && waypointsToMove[0].x === lastPos.x && waypointsToMove[0].y === lastPos.y) {
            waypointsToMove = waypointsToMove.slice(1);
        }

        waypointsToMove.forEach((wp) => {
            const distance = Phaser.Math.Distance.Between(lastPos.x, lastPos.y, wp.x, wp.y);
            if (distance > 0) {
                tweensConfig.push({
                    targets: this.player,
                    x: wp.x,
                    y: wp.y,
                    duration: distance * 5, // 속도 조정
                    ease: 'Linear',
                    onStart: () => {
                        const dx = wp.x - this.player.x;
                        const dy = wp.y - this.player.y;
                        
                        if (Math.abs(dy) > Math.abs(dx)) {
                            if (dy < 0) {
                                if (this.textures.exists('walkUp1')) {
                                    this.player.play('walkUp', true);
                                }
                                this.player.setFlipX(false);
                                this.lastDirection = 'up';
                            } else {
                                if (this.textures.exists('walkDown1')) {
                                    this.player.play('walkDown', true);
                                }
                                this.player.setFlipX(false);
                                this.lastDirection = 'down_vert';
                            }
                        } else {
                            if (this.textures.exists('walk1')) {
                                this.player.play('walk', true);
                            }
                            if (dx < 0) {
                                this.player.setFlipX(true);
                            } else if (dx > 0) {
                                this.player.setFlipX(false);
                            }
                            this.lastDirection = 'side';
                        }
                    }
                });
                lastPos = wp;
            }
        });

        let currentTweenIdx = 0;

        if (tweensConfig.length === 0) {
            this.currentNodeId = targetId;
            this.registry.set('playerCurrentNode', targetId);
            this.isMoving = false;
            this.lastDirection = 'none';
            if (this.mobileMoveIntent) this.mobileMoveIntent = { dx: 0, dy: 0 };
            return;
        }
        
        const playNextTween = () => {
            if (currentTweenIdx >= tweensConfig.length) {
                // 도착 완료
                this.currentNodeId = targetId;
                this.registry.set('playerCurrentNode', targetId);

                // 계속 이동해야 하는지 의도 확인
                let pcDx = 0, pcDy = 0;
                if (this.cursors.left.isDown) pcDx = -1;
                else if (this.cursors.right.isDown) pcDx = 1;
                else if (this.cursors.up.isDown) pcDy = -1;
                else if (this.cursors.down.isDown) pcDy = 1;

                let intentDx = pcDx !== 0 ? pcDx : (this.mobileMoveIntent ? this.mobileMoveIntent.dx : 0);
                let intentDy = pcDy !== 0 ? pcDy : (this.mobileMoveIntent ? this.mobileMoveIntent.dy : 0);

                let nextNode = this.getBestNode(intentDx, intentDy);

                if (nextNode) {
                    this.moveToNode(nextNode);
                    return;
                }

                if (this.mobileMoveIntent) {
                    this.mobileMoveIntent = { dx: 0, dy: 0 };
                }

                if (this.lastDirection === 'up' && this.textures.exists('walkUp1')) {
                    this.player.stop();
                    this.player.setTexture('walkUp1');
                } else if (this.lastDirection === 'down_vert' && this.textures.exists('walkDown1')) {
                    this.player.stop();
                    this.player.setTexture('walkDown1');
                } else if (this.textures.exists('idle1')) {
                    this.player.stop();
                    this.player.setTexture('idle1');
                }
                this.isMoving = false;
                this.lastDirection = 'none';
                return;
            }

            let config = tweensConfig[currentTweenIdx];
            config.onComplete = () => {
                currentTweenIdx++;
                playNextTween();
            };
            this.tweens.add(config);
        };

        playNextTween();
    }

    enterCurrentStage() {
        if (this.isMoving) return;
        
        const stageMapping = {
            'B2': 'GameScene',   // Stage 1
            'C1': 'Stage2Scene', // Stage 2
            'C4': 'Stage3Scene', // Stage 3
            'D2': 'Stage4Scene', // Stage 4
            'F2': 'Stage5Scene'  // Stage 5
        };
        
        const targetScene = stageMapping[this.currentNodeId];
        if (!targetScene) return; // 스테이지가 아닌 노드에서는 무시

        this.isMoving = true;
        
        if (this.textures.exists('jump1')) {
            this.player.play('jump_air');
        }
        
        this.tweens.add({
            targets: this.player,
            y: this.player.y - 30, // 30픽셀 점프
            duration: 166,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (this.textures.exists('idle1')) {
                    this.player.stop();
                    this.player.setTexture('idle1');
                }
                
                // 점프 후 0.5초 대기 후 전환
                this.time.delayedCall(500, () => {
                    this.cameras.main.fadeOut(500, 0, 0, 0);
                    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                        this.isMoving = false;
                        this.scene.start(targetScene, { stage: this.currentNodeId });
                    });
                });
            }
        });
    }

    update() {
        if (this.isMoving) return;

        // 키보드 방향키 이동 로직 (isDown 사용)
        let dx = 0;
        let dy = 0;
        
        if (this.cursors.left.isDown) dx = -1;
        else if (this.cursors.right.isDown) dx = 1;
        else if (this.cursors.up.isDown) dy = -1;
        else if (this.cursors.down.isDown) dy = 1;

        if (dx !== 0 || dy !== 0) {
            this.handleMovementInput(dx, dy);
        }

        // 엔터키 스테이지 입장 로직
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.enterCurrentStage();
        }
    }
}
