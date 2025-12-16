.const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#111",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: {
    preload,
    create,
    update
  }
};

let player;
let obstacles;
let speed = 300;
let gameOver = false;

new Phaser.Game(config);

function preload() {}

function create() {
  const { width, height } = this.scale;

  // Игрок (временно квадрат)
  player = this.physics.add.rectangle(width / 2, height - 150, 80, 80, 0xffffff);
  this.physics.add.existing(player);
  player.body.setImmovable(true);

  // Группа препятствий
  obstacles = this.physics.add.group();

  // Спавн препятствий
  this.time.addEvent({
    delay: 800,
    loop: true,
    callback: () => spawnObstacle(this)
  });

  // Коллизия
  this.physics.add.overlap(player, obstacles, hit, null, this);

  // Свайпы
  this.input.on("pointermove", pointer => {
    if (gameOver) return;
    player.x = Phaser.Math.Clamp(pointer.x, 40, width - 40);
  });
}

function update() {
  if (gameOver) return;

  obstacles.children.iterate(obs => {
    if (obs && obs.y > window.innerHeight + 100) {
      obs.destroy();
    }
  });

  speed += 0.05; // ускорение со временем
}

function spawnObstacle(scene) {
  const x = Phaser.Math.Between(40, window.innerWidth - 40);
  const obstacle = scene.add.rectangle(x, -100, 60, 60, 0xff4444);
  scene.physics.add.existing(obstacle);

  obstacle.body.setVelocityY(speed);
  obstacles.add(obstacle);
}

function hit() {
  gameOver = true;
  player.fillColor = 0xff0000;

  const text = this.add.text(
    window.innerWidth / 2,
    window.innerHeight / 2,
    "ЛИЦО НЕ ВЫВЕЗЛО",
    {
      fontSize: "32px",
      color: "#fff"
    }
  ).setOrigin(0.5);
}
