class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // 미리 디코딩된 Image 객체가 있다면 Phaser의 Texture Manager에 직접 추가합니다. (CORS 및 로컬 Data URI 우회)
        if (typeof window.loadedImages !== 'undefined') {
            if (window.loadedImages['Map-Wotld-00-1.png']) {
                this.textures.addImage('map_world_01', window.loadedImages['Map-Wotld-00-1.png']);
            } else {
                this.load.image('map_world_01', 'assets/Map-Wotld-00-1.png');
            }

            if (window.loadedImages['CH-KH-Idle-1.png']) this.textures.addImage('npc_blacksmith_1', window.loadedImages['CH-KH-Idle-1.png']);
            if (window.loadedImages['CH-KH-Idle-2.png']) this.textures.addImage('npc_blacksmith_2', window.loadedImages['CH-KH-Idle-2.png']);
            if (window.loadedImages['CH-KH-Idle-3.png']) this.textures.addImage('npc_blacksmith_3', window.loadedImages['CH-KH-Idle-3.png']);
            
            // 대기 애니메이션 (4프레임)
            if (window.loadedImages['CH-OK-Idle-1.png']) this.textures.addImage('idle1', window.loadedImages['CH-OK-Idle-1.png']);
            if (window.loadedImages['CH-OK-Idle-2.png']) this.textures.addImage('idle2', window.loadedImages['CH-OK-Idle-2.png']);
            if (window.loadedImages['CH-OK-Idle-3.png']) this.textures.addImage('idle3', window.loadedImages['CH-OK-Idle-3.png']);
            if (window.loadedImages['CH-OK-Idle-4.png']) this.textures.addImage('idle4', window.loadedImages['CH-OK-Idle-4.png']);
            
            // 걷기 애니메이션
            if (window.loadedImages['CH-OK-Walk-1.png']) this.textures.addImage('walk1', window.loadedImages['CH-OK-Walk-1.png']);
            if (window.loadedImages['CH-OK-Walk-2.png']) this.textures.addImage('walk2', window.loadedImages['CH-OK-Walk-2.png']);
            if (window.loadedImages['CH-OK-Walk-3.png']) this.textures.addImage('walk3', window.loadedImages['CH-OK-Walk-3.png']);
            if (window.loadedImages['CH-OK-Walk-4.png']) this.textures.addImage('walk4', window.loadedImages['CH-OK-Walk-4.png']);
            if (window.loadedImages['CH-OK-Walk-5.png']) this.textures.addImage('walk5', window.loadedImages['CH-OK-Walk-5.png']);
            
            // 점프 애니메이션
            if (window.loadedImages['CH-OK-Jump-1.png']) this.textures.addImage('jump1', window.loadedImages['CH-OK-Jump-1.png']);
            if (window.loadedImages['CH-OK-Jump-2.png']) this.textures.addImage('jump2', window.loadedImages['CH-OK-Jump-2.png']);
            if (window.loadedImages['CH-OK-Jump-3.png']) this.textures.addImage('jump3', window.loadedImages['CH-OK-Jump-3.png']);
            if (window.loadedImages['CH-OK-Jump-4.png']) this.textures.addImage('jump4', window.loadedImages['CH-OK-Jump-4.png']);
            if (window.loadedImages['CH-OK-Jump-5.png']) this.textures.addImage('jump5', window.loadedImages['CH-OK-Jump-5.png']);
        }
        
        // 현재는 에셋이 없으므로 Phaser의 Graphics를 이용해 임시 텍스처를 생성합니다.
        this.createTempAssets();
    }

    createTempAssets() {
        const g = this.make.graphics({x: 0, y: 0, add: false});

        // 1. 플레이어 텍스처 생성 (파란색 네모에 눈 달린 모양)
        g.fillStyle(0x38bdf8, 1);
        g.fillRoundedRect(0, 0, 32, 48, 8); // 몸통
        g.fillStyle(0xffffff, 1);
        g.fillCircle(22, 12, 4); // 눈
        g.generateTexture('player_tex', 32, 48);
        g.clear();

        // 2. 바닥 타일 텍스처 (초록/갈색 블록)
        g.fillStyle(0x22c55e, 1);
        g.fillRect(0, 0, 40, 10);
        g.fillStyle(0x8b5a2b, 1);
        g.fillRect(0, 10, 40, 30);
        g.lineStyle(2, 0x000000, 0.2);
        g.strokeRect(0, 0, 40, 40);
        g.generateTexture('ground_tex', 40, 40);
        g.clear();

        // 3. NPC 텍스처 (노란색 둥근 캐릭터)
        g.fillStyle(0xfacc15, 1);
        g.fillCircle(20, 20, 20);
        g.fillStyle(0x000000, 1);
        g.fillRect(12, 12, 4, 10); // 눈
        g.fillRect(24, 12, 4, 10); // 눈
        g.generateTexture('npc_tex', 40, 40);
        g.clear();

        // 4. 퀴즈 상자 텍스처 (물음표 상자)
        g.fillStyle(0xca8a04, 1);
        g.fillRect(0, 0, 40, 40);
        g.lineStyle(4, 0x854d0e, 1);
        g.strokeRect(0, 0, 40, 40);
        g.fillStyle(0xffffff, 1);
        // 매우 간단한 '?' 픽셀 아트 느낌
        g.fillRect(16, 6, 8, 4);
        g.fillRect(24, 10, 4, 8);
        g.fillRect(16, 18, 8, 4);
        g.fillRect(18, 28, 4, 4);
        g.generateTexture('box_tex', 40, 40);
        g.clear();
        
        // 5. 목적지 텍스처 (문)
        g.fillStyle(0x7c2d12, 1);
        g.fillRoundedRect(0, 0, 60, 80, {tl: 30, tr: 30, bl: 0, br: 0});
        g.fillStyle(0xfcd34d, 1);
        g.fillCircle(50, 40, 5); // 손잡이
        g.generateTexture('door_tex', 60, 80);
        g.clear();
        // 6. 적(Enemy) 텍스처 (빨간색 뿔 달린 사각형)
        g.fillStyle(0xff0000, 1);
        g.fillRect(0, 10, 40, 30);
        g.fillTriangle(0, 10, 20, 0, 40, 10);
        g.generateTexture('enemy_tex', 40, 40);
        g.clear();

        // 7. 미사일 텍스처 (주황색 타원)
        g.fillStyle(0xf97316, 1);
        g.fillEllipse(10, 5, 20, 10);
        g.generateTexture('missile_tex', 20, 10);
        g.clear();

        // 8. 수집 아이템 (부품) 텍스처 (빛나는 다이아몬드)
        g.fillStyle(0x06b6d4, 1);
        g.fillTriangle(15, 0, 30, 15, 15, 30);
        g.fillTriangle(15, 30, 0, 15, 15, 0);
        g.generateTexture('item_tex', 30, 30);
        g.clear();
    }

    create() {
        // 애니메이션 생성
        // 로드된 텍스처가 있을 때만 애니메이션을 생성하여 블랙 스크린 에러를 방지합니다.
        if (this.textures.exists('idle1')) {
            // 1-1. 대기 시작 애니메이션: 1,2,3,4 프레임 한 번 재생
            this.anims.create({
                key: 'idle_start',
                frames: [
                    { key: 'idle1' },
                    { key: 'idle2' },
                    { key: 'idle3' },
                    { key: 'idle4' }
                ],
                frameRate: 6, // 자연스러운 속도로 진행
                repeat: 0 
            });

            // 1-2. 대기 반복 애니메이션: 3, 4 프레임이 반복되는데 반복 속도는 1초 (frameRate 2 = 1사이클 1초)
            this.anims.create({
                key: 'idle_loop',
                frames: [
                    { key: 'idle3' },
                    { key: 'idle4' }
                ],
                frameRate: 2, // 1초에 2프레임 = 0.5초 간격 (전체 2프레임이 1초 주기로 반복)
                repeat: -1 
            });

            // 2. 걷기 애니메이션: 계속 반복 (repeat: -1)
            this.anims.create({
                key: 'walk',
                frames: [
                    { key: 'walk1' },
                    { key: 'walk2' },
                    { key: 'walk3' },
                    { key: 'walk4' },
                    { key: 'walk5' }
                ],
                frameRate: 10,
                repeat: -1 
            });

            // 3-1. 점프 공중 체공 애니메이션 (1, 2, 3프레임 재생 후 3에서 정지, 상승/하강 모두 유지)
            this.anims.create({
                key: 'jump_air',
                frames: [
                    { key: 'jump1' },
                    { key: 'jump2' },
                    { key: 'jump3' }
                ],
                frameRate: 10,
                repeat: 0 
            });

            // 3-2. 점프 하강 초기 애니메이션 (최고점에서 내려올 때 4번 프레임)
            this.anims.create({
                key: 'jump_down1',
                frames: [
                    { key: 'jump4' }
                ],
                frameRate: 10,
                repeat: 0 
            });

            // 3-3. 점프 착지 직전 애니메이션 (바닥에 닿기 전 5번 프레임)
            this.anims.create({
                key: 'jump_down2',
                frames: [
                    { key: 'jump5' }
                ],
                frameRate: 10,
                repeat: 0 
            });
        }
        
        if (this.textures.exists('npc_blacksmith_1')) {
            this.anims.create({
                key: 'kh_talk',
                frames: [
                    { key: 'npc_blacksmith_1', duration: 1500 },
                    { key: 'npc_blacksmith_2', duration: 100 },
                    { key: 'npc_blacksmith_3', duration: 1000 },
                    { key: 'npc_blacksmith_2', duration: 100 }
                ],
                repeat: -1
            });
        }

        // 초기 시작 씬 설정 (window.START_SCENE이 있으면 해당 씬으로, 없으면 오프닝 씬으로)
        const startScene = window.START_SCENE || 'OpeningScene';
        this.scene.start(startScene);
    }
}
