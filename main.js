const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

function preload() {
  // No external assets required for this prototype — we'll generate textures at runtime.
}

function create() {
  // Draw a simple field using graphics
  const w = this.scale.width;
  const h = this.scale.height;
  const field = this.add.graphics();
  // base
  field.fillStyle(0x2b8f2b, 1);
  field.fillRect(0, 0, w, h);
  // alternating stripes
  const stripeWidth = 40;
  for (let x = 40; x < w - 40; x += stripeWidth * 2) {
    field.fillStyle(0x249024, 0.18);
    field.fillRect(x, 40, stripeWidth, h - 80);
  }
  // lines
  field.lineStyle(6, 0xffffff, 1);
  field.strokeRect(40, 40, w - 80, h - 80);
  field.lineStyle(4, 0xffffff, 1);
  field.strokeCircle(w / 2, h / 2, 90);
  field.lineStyle(3, 0xffffff, 1);
  field.strokeLineShape(new Phaser.Geom.Line(w / 2, 40, w / 2, h - 40));

  // Generate a simple white ball texture
  const g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 16);
  g.generateTexture('ball', 32, 32);
  g.clear();

  // Generate two button textures (team A and B)
  // team A
  g.fillStyle(0x1e90ff, 1);
  g.fillCircle(20, 20, 20);
  g.lineStyle(2, 0x000000, 0.25);
  g.strokeCircle(20, 20, 20);
  g.generateTexture('buttonA', 40, 40);
  g.clear();
  // team B
  g.fillStyle(0xff3333, 1);
  g.fillCircle(20, 20, 20);
  g.lineStyle(2, 0x000000, 0.25);
  g.strokeCircle(20, 20, 20);
  g.generateTexture('buttonB', 40, 40);
  g.destroy();

  // Create ball (physics body)
  this.ball = this.physics.add.image(w / 2, h / 2, 'ball');
  this.ball.setCircle(16);
  this.ball.setBounce(0.9);
  this.ball.setCollideWorldBounds(true);
  this.ball.setDamping(true);
  this.ball.setDrag(0.95);
  this.ball.setMaxVelocity(1000);

  // Create two example buttons (player pieces)
  this.buttons = this.add.group();

  const btnLeft = this.physics.add.image(180, h - 140, 'buttonA');
  btnLeft.setInteractive();
  btnLeft.setImmovable(true);
  // allow body to be moved programmatically (we'll control it via WASD)
  if (btnLeft.body) {
    btnLeft.body.moves = true;
  }
  btnLeft.setCircle(20);
  this.buttons.add(btnLeft);

  const btnRight = this.physics.add.image(w - 180, h - 140, 'buttonB');
  btnRight.setInteractive();
  btnRight.setImmovable(true);
  if (btnRight.body) {
    btnRight.body.moves = true;
  }
  btnRight.setCircle(20);
  this.buttons.add(btnRight);

  // Collisions between ball and buttons
  this.physics.add.collider(this.ball, btnLeft);
  this.physics.add.collider(this.ball, btnRight);

  // HUD text for speed (no instruction text as requested)
  this.speedText = this.add.text(12, 12, '', { font: '14px Arial', fill: '#ffff00' });

  // Select a button when clicked (it becomes the "active" piece for WASD control)
  this.selectedButton = null;
  this.input.on('gameobjectdown', (pointer, gameObject) => {
    if (!gameObject.texture) return;
    const key = gameObject.texture.key;
    if (key === 'buttonA' || key === 'buttonB') {
      // clear previous selection
      if (this.selectedButton && this.selectedButton.clearTint) {
        this.selectedButton.clearTint();
        this.selectedButton.setScale(1);
      }
      this.selectedButton = gameObject;
      // visual feedback
      this.selectedButton.setTint(0xffff66);
      this.selectedButton.setScale(1.08);
    }
  });

  // Click on the ball to kick it away from the pointer
  this.input.on('pointerdown', (pointer) => {
    const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.ball.x, this.ball.y);
    if (d <= 24) {
      const angle = Phaser.Math.Angle.Between(pointer.x, pointer.y, this.ball.x, this.ball.y);
      const power = 800;
      this.ball.setVelocity(Math.cos(angle) * power, Math.sin(angle) * power);
    }
  });

  // WASD keys for moving the selected button
  this.wasd = this.input.keyboard.addKeys('W,A,S,D');

  // Reset ball with R
  this.input.keyboard.on('keydown-R', () => {
    this.ball.setPosition(w / 2, h / 2);
    this.ball.setVelocity(0, 0);
  });
}

function update() {
  if (this.ball && this.ball.body) {
    const speed = Math.round(this.ball.body.speed);
    this.speedText.setText('Velocidade: ' + speed);
  }

  // move selected button with WASD
  if (this.selectedButton && this.selectedButton.body) {
    const speed = 240;
    const keys = this.wasd;
    let vx = 0;
    let vy = 0;
    if (keys.A.isDown) vx = -speed;
    else if (keys.D.isDown) vx = speed;
    if (keys.W.isDown) vy = -speed;
    else if (keys.S.isDown) vy = speed;

    // apply velocity; when no key pressed, stop the button
    this.selectedButton.body.setVelocity(vx, vy);
    // keep the button inside the play area bounds
    const pad = 60;
    const bx = Phaser.Math.Clamp(this.selectedButton.x, pad, this.scale.width - pad);
    const by = Phaser.Math.Clamp(this.selectedButton.y, pad, this.scale.height - pad);
    if (bx !== this.selectedButton.x || by !== this.selectedButton.y) {
      this.selectedButton.setPosition(bx, by);
      this.selectedButton.body.updateFromGameObject();
    }
  }
}



