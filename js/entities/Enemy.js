class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.body.setGravityY(800);
        this.setBounce(0.2);
        
        // 미사일 발사 타이머 (예: 2초마다 발사)
        this.shootEvent = scene.time.addEvent({
            delay: 2000,
            callback: this.shootMissile,
            callbackScope: this,
            loop: true
        });
        
        this.scene = scene;
    }

    shootMissile() {
        // 플레이어가 너무 멀리 있으면 쏘지 않음
        if (!this.scene.player || !this.active) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
        if (dist > 800) return;

        // 미사일 생성 (임시 텍스처 'missile_tex')
        const missile = this.scene.physics.add.sprite(this.x, this.y, 'missile_tex');
        missile.body.setAllowGravity(false); // 미사일은 일직선으로 날아감
        
        // 플레이어 방향으로 발사
        const direction = (this.scene.player.x < this.x) ? -1 : 1;
        missile.setVelocityX(direction * 200);
        
        // 미사일 방향키 반전 처리
        if (direction < 0) missile.setFlipX(true);

        // 일정 시간 뒤 미사일 소멸 (메모리 관리)
        this.scene.time.delayedCall(4000, () => {
            if (missile && missile.active) missile.destroy();
        });

        // 씬의 적 미사일 그룹에 추가하여 충돌 판정할 수 있도록 처리
        if (this.scene.missiles) {
            this.scene.missiles.add(missile);
        }
    }

    destroy(fromScene) {
        if (this.shootEvent) {
            this.shootEvent.remove();
        }
        super.destroy(fromScene);
    }
}
