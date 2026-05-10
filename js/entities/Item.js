class Item extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, itemId) {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.itemId = itemId; // 'partA', 'partB' 등 식별자
        
        // 아이템은 공중에 떠있거나 바닥에 있을 수 있으므로 중력 무시 옵션 (선택적)
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        
        // 간단한 둥둥 떠있는 애니메이션 효과 (Tween)
        scene.tweens.add({
            targets: this,
            y: y - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    collect() {
        // 수집 효과 (예: 파티클, 소리)
        
        // 화면에서 제거
        this.destroy();
    }
}
