import BaseObject    from "./base_object.js"
import Villager     from "./alives/villager/villager.js"

import Baker        from "./jobs/baker.js"
import Builder      from "./jobs/builder.js"
import Farmer       from "./jobs/farmer.js"
import Lumberjack   from "./jobs/lumberjack.js"
import Miner        from "./jobs/digger.js"
import Smith        from "./jobs/smith.js"

import Tree         from "./resources/tree.js"
import Rock         from "./resources/rock.js"
import Field        from "./resources/field.js"

import Cow          from "./alives/mobs/cow.js"
import Chicken      from "./alives/mobs/chicken.js"

import Storage      from "./resources/storage.js"

import Bakery       from "./buildings/bakery.js"

import House        from "./buildings/house.js"

import FloatingText from "./support/floating_text.js"

import {
  rand,
  normalDist,
  randPerNSec,
  scaleVal,
  scaleX,
  scaleY,
  weightedList,
  times,
  idxFromPos,
  sample
} from "./helpers.js"

var map_w = 45, map_h = 23
var config = {
  type: Phaser.AUTO,
  width: scaleX(map_w),
  height: scaleY(map_h),
  scale: {
    zoom: 1.5,
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
}

let ctx, world, game = new Phaser.Game(config)

function preload() {
  this.load.json("names", "data/names.json")
  this.load.json("sprites", "data/sprites.json")
  this.load.spritesheet("slime", "assets/sprites/slimes/Slime_Medium_Blue.png", { frameWidth: 32, frameHeight: 32 })
  this.load.spritesheet("master", "assets/master.png", { frameWidth: 16, frameHeight: 16 })
  this.load.spritesheet("big_master", "assets/big_master.png", { frameWidth: 32, frameHeight: 32 })
  this.load.spritesheet("big_master2x3", "assets/bigmaster2x3.png", { frameWidth: 32, frameHeight: 48 })

  this.load.bitmapFont('dorfscratch', 'assets/fonts/dorfscratch-Regular.png', 'assets/fonts/dorfscratch-Regular.fnt');
  // Add some custom function to take the hard width of sprites, which are always 1x1 ratio and then centers the origin

  this.input.mouse.disableContextMenu()
}

function randCoord() {
  return { x: rand(32, config.width - 32), y: rand(32, config.height - 32) }
}

function create() {
  setupContext(this)
  world = generate_map(this, ctx.sprites)

  ctx.world = world

  // new Villager(ctx, {...randCoord(), walk_speed: 70 })
  times(10, function() {
    new Villager(ctx, randCoord())
  })

  times(3, function() {
    new Tree(ctx, randCoord())
  })

  times(3, function() {
    new Rock(ctx, randCoord())
  })

  times(5, function() {
    new Cow(ctx, randCoord())
  })

  times(10, function() {
    new Chicken(ctx, randCoord())
  })

  times(normalDist(2, 5), function() {
    var horz = normalDist(1, 10, 4, 4) // min, max, mult, bias
    var vert = normalDist(1, 10, 4, 4)
    var start = randCoord()

    times(horz, function(x_idx) {
      times(vert, function(y_idx) {
        new Field(ctx, { x: start.x + (x_idx * scaleX(1)), y: start.y + (y_idx * scaleY(0.5))})
      })
    })
  })

  let midpoint = { x: config.width/2, y: config.height/2 }
  let storage = new Storage(ctx, { x: midpoint.x, y: midpoint.y })
  // storage.inventory.wheat = Field.newItem()
  // storage.inventory.wheat.count = 100
  storage.clicked()
  new Bakery(ctx, { x: midpoint.x - (5 * 16), y: 32 })
  new House(ctx, {x: midpoint.x - (15 * 16), y: 32})
}

function update() { // ~60fps
  BaseObject.tick()

  if (randPerNSec(80) && Rock.objs.length < 10) { new Rock(ctx, randCoord()) }
  if (randPerNSec(80) && Tree.objs.length < 10) { new Tree(ctx, randCoord()) }

  if (ctx.selected?.removed) { ctx.selected = undefined }
  ctx.overlay.setText([
    ...(ctx.selected?.inspect() || []),
    ...[null],
    ...Villager.objs.map(function(villager) {
      let length = 23
      return villager.name + ":" + " ".repeat(length - villager.name.length - villager.fullness.toString().length) + villager.fullness
    })
  ])
}

function setupContext(env) {
  ctx = {
    env: env,
    game: game,
    sprites: env.cache.json.get("sprites"),
    overlay: new FloatingText(env)
  }

  ctx.addSpriteWithAnim = function(sprite_path, opts) {
    let obj
    try {
      // Catch any error here and just render `placeholder` if it fails
      obj = sprite_path.split(".").reduce(function(full, key) { return full[key] }, ctx.sprites)
    } catch(e) {}
    if (!obj) { return ctx.addSpriteWithAnim("placeholder", opts) }
    var first_anim = obj[Object.keys(obj)[0]]
    let sheet_name = first_anim.sheet || "master"
    let cell_size = ctx.env.game.textures.list[sheet_name].frames[0].width
    let sheet_width = ctx.env.game.textures.list[sheet_name].source[0].width
    let sheet_cells_horz = sheet_width / cell_size

    for (let [key, anims] of Object.entries(obj)) {
      if (Array.isArray(anims)) { anims = { start: anims, length: 1 } }

      var frames = times(anims.length, function(t) {
        return idxFromPos(anims.start[0] + t, anims.start[1], sheet_cells_horz)
      })

      if (anims.length > 1) {
        anims.start.forEach(function(anim) {
          ctx.env.anims.create({
            key: sprite_path + "." + key,
            frames: ctx.env.anims.generateFrameNumbers(sheet_name, { frames: frames }),
            frameRate: anims.speed || 10,
            repeat: -1
          })
        })
      }
    }

    if (!Array.isArray(first_anim)) { first_anim = first_anim.start }
    var frame = idxFromPos(...first_anim, sheet_cells_horz)

    return ctx.env.add.sprite(opts.x, opts.y, sheet_name, frame)
  }
}

function generate_map(ctx, sprites) {
  let flat_grass = idxFromPos(...sprites.ground.grass.flat), short_grass = idxFromPos(...sprites.ground.grass.short), long_grass = idxFromPos(...sprites.ground.grass.long), flowers = idxFromPos(...sprites.ground.grass.flowers)
  let weights = weightedList([flat_grass, 500], [short_grass, 100], [long_grass, 50], [flowers, 1])

  let level = times(map_h, function(y) {
    return times(map_w, function(x) {
      return sample(weights)
    })
  })

  var map = ctx.make.tilemap({ data: level, tileWidth: 16, tileHeight: 16 })
  var tiles = map.addTilesetImage("master")
  var layer = map.createLayer(0, tiles, 0, 0)
  return map
}
