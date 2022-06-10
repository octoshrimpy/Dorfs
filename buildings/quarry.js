import BaseWorkshop from "./base_workshop.js"
import Rock from "../resources/rock.js"
import IronDeposit from "../resources/iron_deposit.js"
import { rand } from "../helpers.js"

export default class Quarry extends BaseWorkshop {
  static objs = []

  constructor(ctx, opts, sprite_path) {
    super(ctx, opts, sprite_path || "buildings.quarry")
    this.ctx = ctx
    this.opts = opts || {}

    this.min_collect_factor = 0.01 // per sec
    this.max_collect_factor = 0.05

    this.collected_total = 0
  }

  inspect() {
    return [
      this.constructor.name,
      "Mined total: " + this.collected_total,
      this.collector?.name
    ]
  }

  available(collector) {
    return Rock.objs.length < 5 && (!this.collector || collector == this.collector)
  }

  randCoord() {
    let world = this.ctx.world
    return {
      x: (rand(world.width - 8) + 4) * world.tileWidth,
      y: (rand(world.height - 8) + 4) * world.tileHeight
    }
  }

  spawnRock() {
    if (rand(10) == 0) {
      new IronDeposit(this.ctx, this.randCoord())
    } else {
      new Rock(this.ctx, this.randCoord())
    }
  }

  collect() {
    this.spawnRock()
    this.collected_total += 1
    if (this.collector.energy < 50 || this.collector.fullness < 50) {
      this.collector.finishTask()
    }
  }
}
