import BaseResource from "./base_resource.js"
import { sample, normalDist } from "../helpers.js"

export default class Rock extends BaseResource {
  static objs = []
  static item = {
    name: "stone",
    weight: 10
  }

  constructor(ctx, opts, sprite_path) {
    super(ctx, opts, sprite_path || sample(["things.rocks.pointyup", "things.rocks.pointyside"]))

    this.ctx = ctx
    this.opts = opts || {}

    this.min_collect_factor = 0.5 // per sec
    this.max_collect_factor = 3 // per sec

    this.resources = normalDist(25, 200)
  }

  decay() {}
}
