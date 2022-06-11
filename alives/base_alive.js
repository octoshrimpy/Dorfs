import BaseObject from "../base_object.js"
import {
  rand,
  scaleX,
  scaleY,
  scaleVal,
  constrain,
  normalDist
} from "../helpers.js"

export default class BaseAlive extends BaseObject  {
  // #baseHealth
  // #baseMoveSpeed

  constructor(opts, sprite_path) {
    super(opts, sprite_path)
    opts = opts || {}
    this.constructor.objs.push(this)
  }

  wander() {
    if (!this.sprite) { return }
    let self = this
    let constrainWorldX = function(val) {
      return constrain(val, scaleX(1), ctx.game.config.width - scaleX(1))
    }
    let constrainWorldY = function(val) {
      return constrain(val, scaleY(1), ctx.game.config.height - scaleY(1))
    }

    this.speed = normalDist(0, this.walk_speed, 2, this.walk_speed*0.8)
    this.destination = {
      x: rand(constrainWorldX(this.sprite.x - 100), constrainWorldX(this.sprite.x + 100)),
      y: rand(constrainWorldY(this.sprite.y - 100), constrainWorldY(this.sprite.y + 100)),
    }
  }

  arrivedAt(obj) {
    let x_near = Math.abs(this.sprite.x - obj.access_origin.x) < 5
    let y_near = Math.abs(this.sprite.y - obj.access_origin.y) < 5

    return x_near && y_near
  }

  arrivedAtDest() {
    let x_near = Math.abs(this.sprite.x - this.destination.x) < 5
    let y_near = Math.abs(this.sprite.y - this.destination.y) < 5

    return x_near && y_near
  }

  clearDest() {
    this.destination = undefined
    if (this.spriteHasAnim("stand")) {
      this.loopAnim("stand")
    } else {
      this.stopAnim()
    }
  }

  moveTowardsDest(speed) { // speed is 0-100
    speed = (speed || this.speed || this.walk_speed) * ctx.game.speed
    // https://phaser.io/news/2018/03/pathfinding-and-phaser-3
    if (!this.destination || !this.sprite) { return }

    let dx = this.destination.x - this.sprite.x
    let dy = this.destination.y - this.sprite.y
    if (Math.abs(dx) < 5) { dx = 0 }
    if (Math.abs(dy) < 5) { dy = 0 }

    if (dx == 0 && dy == 0) {
      this.clearDest()
      return
    }

    if (this.spriteHasAnim("walk")) {
      this.loopAnim("walk")
      let sprite_fps = scaleVal(speed, 0, 100, 0, 20)
      this.sprite.anims.msPerFrame = (1000 / sprite_fps) * ctx.game.speed
    }
    this.sprite.flipX = dx < 0
    let max_speed = 2, max_speed_scale = 100
    let scaled_speed = (speed / max_speed_scale) * max_speed
    let speed_scale = scaled_speed / (Math.abs(dx) + Math.abs(dy))
    if (speed_scale > 1) { speed_scale = 1 }

    this.sprite.x += dx * speed_scale
    this.sprite.y += dy * speed_scale
    this.sprite.depth = this.sprite.y
    this.setCardinal()
  }
}
