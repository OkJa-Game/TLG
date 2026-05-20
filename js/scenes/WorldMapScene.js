class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
    }

    create() {
        const currentWorld = this.registry.get('currentWorld') || 1;
        const unlockedStages = this.registry.get('unlockedStages') || [1];

        // 배경색
        this.cameras.main.setBackgroundColor('#2a1b3d');
        this.cameras.main.fadeIn(500, 0, 0, 0);

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

        // 스테이지 노드 위치 및 연결 구조
        const nodes = [
            { id: 1, x: 335, y: 350 },
            { id: 2, x: 500, y: 350 },
            { id: 3, x: 285, y: 250 },
            { id: 4, x: 50, y: 240 },
            { id: 5, x: 150, y: 150 },
            { id: 6, x: 825, y: 225 }
        ];
        
        const S_NODE = { id: 0, x: 200, y: 450 }; // 시작 지점(집)

        // 그래프 연결 (노드 간 연결망)
        const graph = {
            0: [1],
            1: [0, 2, 3],
            2: [1, 6],
            3: [1, 4, 5],
            4: [3],
            5: [3],
            6: [2]
        };

        // 노드 사이의 경로(웨이포인트) 배열
        const paths = {
            '0-1': [{x: 200, y: 450}, {x: 320, y: 450}, {x: 335, y: 350}],
            '1-2': [{x: 335, y: 350}, {x: 380, y: 420}, {x: 480, y: 430}, {x: 500, y: 350}],
            '1-3': [{x: 335, y: 350}, {x: 285, y: 250}],
            '3-4': [{x: 285, y: 250}, {x: 180, y: 270}, {x: 50, y: 240}],
            '3-5': [{x: 285, y: 250}, {x: 230, y: 170}, {x: 150, y: 150}],
            '2-6': [{x: 500, y: 350}, {x: 620, y: 440}, {x: 750, y: 350}, {x: 825, y: 225}]
        };

        function getWaypoints(start, end) {
            let key = `${start}-${end}`;
            if (paths[key]) return paths[key];
            key = `${end}-${start}`;
            if (paths[key]) return [...paths[key]].reverse();
            return [{x: 0, y: 0}]; // 에러 방지
        }

        function getShortestNodePath(startId, endId) {
            let queue = [[startId]];
            let visited = new Set([startId]);
            while (queue.length > 0) {
                let path = queue.shift();
                let current = path[path.length - 1];
                if (current === endId) return path;
                for (let neighbor of graph[current] || []) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push([...path, neighbor]);
                    }
                }
            }
            return [startId, endId];
        }

        // 플레이어 초기 위치 설정
        this.currentNodeId = this.registry.get('playerCurrentNode') || 0;
        let startPos = S_NODE;
        if (this.currentNodeId !== 0) {
            const lastNode = nodes.find(n => n.id === this.currentNodeId);
            if (lastNode) startPos = { x: lastNode.x, y: lastNode.y };
        }

        // 플레이어 스프라이트 생성
        const playerTexture = this.textures.exists('idle1') ? 'idle1' : 'player_tex';
        this.player = this.add.sprite(startPos.x, startPos.y, playerTexture);
        this.player.setDepth(20);
        
        if (this.textures.exists('idle1')) {
            this.player.setScale(0.5); // 월드맵에 맞게 크기 조절
            this.player.setTexture('idle1');
        }

        this.isMoving = false;

        // 시작점 S (텍스트 추가)
        this.add.text(S_NODE.x, S_NODE.y + 25, "S", {
            fontFamily: 'Inter', fontSize: '20px', color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5);

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
                            duration: 166,
                            yoyo: true,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                if (this.textures.exists('idle1')) {
                                    this.player.stop();
                                    this.player.setTexture('idle1');
                                }
                                
                                // 점프 후 0.5초 대기
                                this.time.delayedCall(500, () => {
                                    this.cameras.main.fadeOut(500, 0, 0, 0);
                                    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                                        this.isMoving = false;
                                        this.registry.set('playerCurrentNode', node.id);
                                        let targetScene = 'GameScene';
                                        if (node.id === 2) targetScene = 'Stage2Scene';
                                        if (node.id === 4) targetScene = 'Stage4Scene';
                                        this.scene.start(targetScene, { stage: node.id });
                                    });
                                });
                            }
                        });
                    };

                    if (this.currentNodeId === node.id) {
                        enterStage();
                        return;
                    }

                    this.isMoving = true;
                    
                    // 길찾기 및 웨이포인트 수집
                    let nodeSequence = getShortestNodePath(this.currentNodeId, node.id);
                    let allWaypoints = [];
                    for (let i = 0; i < nodeSequence.length - 1; i++) {
                        let wp = getWaypoints(nodeSequence[i], nodeSequence[i+1]);
                        if (allWaypoints.length > 0 && wp.length > 0) {
                            wp = wp.slice(1);
                        }
                        allWaypoints = allWaypoints.concat(wp);
                    }

                    if (allWaypoints.length === 0) {
                        this.isMoving = false;
                        return;
                    }

                    if (this.textures.exists('walk1')) {
                        this.player.play('walk');
                    }

                    // 웨이포인트 순차 이동을 위한 타임라인 애니메이션 구축
                    let tweensConfig = [];
                    let lastPos = { x: this.player.x, y: this.player.y };

                    allWaypoints.forEach((wp) => {
                        const distance = Phaser.Math.Distance.Between(lastPos.x, lastPos.y, wp.x, wp.y);
                        if (distance > 0) {
                            tweensConfig.push({
                                targets: this.player,
                                x: wp.x,
                                y: wp.y,
                                duration: distance * 5, // 속도 조정
                                ease: 'Linear',
                                onStart: () => {
                                    // 이동 방향에 맞게 좌우 반전
                                    if (wp.x < this.player.x) {
                                        this.player.setFlipX(true);
                                    } else if (wp.x > this.player.x) {
                                        this.player.setFlipX(false);
                                    }
                                }
                            });
                            lastPos = wp;
                        }
                    });

                    // Phaser 3의 tween 체이닝을 활용하여 순차적으로 실행
                    let currentTweenIdx = 0;
                    
                    const playNextTween = () => {
                        if (currentTweenIdx >= tweensConfig.length) {
                            // 이동 완료
                            if (this.textures.exists('idle1')) {
                                this.player.stop();
                                this.player.setTexture('idle1');
                            }
                            this.currentNodeId = node.id;
                            this.registry.set('playerCurrentNode', node.id);
                            
                            this.time.delayedCall(500, () => {
                                enterStage();
                            });
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
