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
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                const id = c * 4 + r + 1;
                this.nodes.push({ id, x: X_COORDS[c], y: Y_COORDS[r] });
                this.graph[id] = [];
            }
        }
        
        // 가로, 세로 엣지 추가
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                const id = c * 4 + r + 1;
                // 우측 연결 (가로)
                if (c < 5) {
                    const rightId = (c + 1) * 4 + r + 1;
                    this.graph[id].push(rightId);
                    this.graph[rightId].push(id);
                    this.paths[`${id}-${rightId}`] = [{x: X_COORDS[c], y: Y_COORDS[r]}, {x: X_COORDS[c+1], y: Y_COORDS[r]}];
                }
                // 하단 연결 (세로)
                if (r < 3) {
                    const downId = c * 4 + (r + 1) + 1;
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
            if (node.id === 3) label = '🏠 3';
            else if ([6, 9, 12, 14, 22].includes(node.id)) label = '⭐ ' + node.id;
            
            this.add.text(node.x, node.y, label, {
                fontFamily: 'Inter', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
        });
        */

        // 플레이어 초기 위치 설정 (3번이 주인공 집)
        this.currentNodeId = this.registry.get('playerCurrentNode') || 3;
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

        // 드래그 입력 설정
        this.dragStart = null;

        this.input.on('pointerdown', (pointer) => {
            const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
            if (isMobile && !this.scale.isFullscreen && window.innerWidth > window.innerHeight) {
                this.scale.startFullscreen();
            }
            
            // 모바일 드래그 조작을 위해 시작 위치 기록
            if (!this.isMoving) {
                this.dragStart = { x: pointer.x, y: pointer.y };
            }
        });

        this.input.on('pointerup', () => {
            this.dragStart = null;
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.dragStart || this.isMoving) return;
            
            const dx = pointer.x - this.dragStart.x;
            const dy = pointer.y - this.dragStart.y;
            
            // 일정 이상 드래그 시 방향 판별
            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                this.handleMovementInput(dx, dy);
                this.dragStart = null; // 처리 후 연속 입력 방지
            }
        });

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

    handleMovementInput(dx, dy) {
        if (this.isMoving) return;
        
        const neighbors = this.graph[this.currentNodeId];
        if (!neighbors || neighbors.length === 0) return;

        let bestNode = null;
        let maxDot = -1;

        const inputLen = Math.sqrt(dx * dx + dy * dy);
        if (inputLen === 0) return;
        
        const nx = dx / inputLen;
        const ny = dy / inputLen;

        const currentNode = this.nodes.find(n => n.id === this.currentNodeId);

        // 이웃한 노드 중에서 입력 방향과 가장 유사한 방향에 있는 노드를 찾습니다.
        for (let nextId of neighbors) {
            const neighborNode = this.nodes.find(n => n.id === nextId);
            const dirX = neighborNode.x - currentNode.x;
            const dirY = neighborNode.y - currentNode.y;
            const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (dirLen === 0) continue;
            
            const dNx = dirX / dirLen;
            const dNy = dirY / dirLen;
            
            // 방향 내적 (dot product) 계산: 1에 가까울수록 같은 방향
            const dot = (nx * dNx) + (ny * dNy);
            
            // 허용 오차: 약 60도 이내일 때만 반응
            if (dot > 0.5 && dot > maxDot) {
                maxDot = dot;
                bestNode = nextId;
            }
        }

        if (bestNode !== null) {
            this.moveToNode(bestNode);
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
        
        const playNextTween = () => {
            if (currentTweenIdx >= tweensConfig.length) {
                // 도착 완료
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
                this.currentNodeId = targetId;
                this.registry.set('playerCurrentNode', targetId);
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
            6: 'GameScene',   // Stage 1
            9: 'Stage2Scene', // Stage 2
            12: 'Stage3Scene',// Stage 3
            14: 'Stage4Scene',// Stage 4
            22: 'Stage5Scene' // Stage 5
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

        // 키보드 방향키 이동 로직
        let dx = 0;
        let dy = 0;
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) dx = -1;
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) dx = 1;
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) dy = -1;
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) dy = 1;

        if (dx !== 0 || dy !== 0) {
            this.handleMovementInput(dx, dy);
        }

        // 엔터키 스테이지 입장 로직
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.enterCurrentStage();
        }
    }
}
