import BaseHumanoid from "./base_humanoid.js"
import Tree from "../../resources/tree.js" //TODO fix these imports, ask game instead
import Rock from "../../resources/rock.js"
import Storage from "../../resources/storage.js"
import { sum, sample, normalDist, scaleVal, randOnePerNSec, randNPerSec } from "/helpers.js"

export default class Villager extends BaseHumanoid {
  static objs = []

  constructor(ctx, opts, sprite_path) {
    super(ctx, opts, sprite_path || "alives.dorfs.adult")
    this.ctx = ctx
    this.opts = opts || {}

    this.name = function() {
      var name_json = ctx.env.cache.json.get("names")
      return [sample(name_json.first), sample(name_json.last)].join(" ")
    }()

    this.destination = undefined
    this.inventory = {}
    this.unloading = false
    this.collecting = false
    this.walk_speed = normalDist(10, 70) // 0-100
    this.collect_speed = normalDist(10, 70) // 0-100
    this.carry_capacity = normalDist(60, 120)

    this.home = undefined
    this.job_building = undefined
    this.selected_resource = undefined
    this.selected_storage = undefined
    this.profession = sample(["Lumberjack", "Miner"])
    this.tool_sprite = undefined

    Villager.objs.push(this)
  }

  getToolName() {
    if (this.profession == "Lumberjack") {
      return "tools.axe"
    } else if (this.profession == "Miner") {
      return "tools.pick"
    }
  }

  showTool() {
    if (this.tool_sprite) { return } // Don't add another sprite if one exists already

    let tool_path = this.getToolName()
    this.tool_sprite = this.ctx.addSpriteWithAnim(tool_path, { x: this.sprite.x, y: this.sprite.y })
    this.tool_sprite.depth = this.sprite.depth + 1
    this.tool_sprite.flipX = this.sprite.flipX
    this.tool_sprite.anims.play([tool_path, "base"].join("."), true)
    var sprite_fps = scaleVal(this.collect_speed, 0, 100, 0, 20)
    this.tool_sprite.anims.msPerFrame = 1000 / sprite_fps
  }

  hideTool() {
    this.tool_sprite?.destroy(true)
    this.tool_sprite = undefined
  }

  getProfession() {
    if (this.profession == "Lumberjack") {
      return Tree
    } else if (this.profession == "Miner") {
      return Rock
    }
  }

  fullInventory() {
    return sum(Object.values(this.inventory).map(function(item) { return item.totalWeight() })) >= this.carry_capacity
  }

  findDestination() {
    let dest_obj = null

    if (this.fullInventory() || this.unloading) {
      if (this.timing) { this.timing = false; console.timeEnd([this.profession, this.name].join(": ")) }
      if (this.collecting) {
        this.collecting = false
        this.hideTool()
      }
      this.unloading = true
      dest_obj = this.selected_storage || Storage.nearest(this.sprite.x, this.sprite.y)
      this.selected_storage = dest_obj
    } else {
      if (this.selected_resource && this.selected_resource.resources <= 0) {
        this.selected_resource = undefined
      }
      dest_obj = this.selected_resource || this.getProfession().nearest(this.sprite.x, this.sprite.y)
      this.selected_resource = dest_obj
    }

    return dest_obj
  }

  arrivedAtDest() {
    let x_near = Math.abs(this.sprite.x - this.destination.x) < 5
    let y_near = Math.abs(this.sprite.y - this.destination.y) < 5

    return x_near && y_near
  }

  unload(obj) {
    obj.inventory[this.profession] ||= new (this.getProfession().item)
    if (randNPerSec(10) == 0) {
      if (this.inventory[this.profession].count > 0) {
        obj.inventory[this.profession].count += 1
        this.inventory[this.profession].count -= 1
      } else {
        console.log(obj.inventory);
        this.unloading = false
      }
    }
  }

  collect(obj) {
    if (!this.collecting) {
      this.collecting = true
      this.showTool()
    }
    if (!this.timing) { this.timing = true; console.time([this.profession, this.name].join(": ")) }
    this.inventory[this.profession] ||= new (this.getProfession().item)

    var collectRatePerSec = scaleVal(this.collect_speed, 0, 100, obj.min_collect_factor, obj.max_collect_factor)
    if (randNPerSec(collectRatePerSec) == 0) {
      this.inventory[this.profession].count += 1
    }
  }

  tick() {
    let fps = 60
    if (!this.profession) {
      if (randOnePerNSec(3) == 0) {
        this.setRandomDest()
      }
    } else if (!this.destination) {
      var obj = this.findDestination()

      if (obj) {
        this.destination = { x: obj.sprite.x, y: obj.sprite.y }

        if (this.arrivedAtDest()) {
          if (obj.constructor.name == "Storage") {
            this.unload(obj)
          } else {
            this.collect(obj)
          }
        }
      }
    }

    this.moveTowardsDest()
  }
}
