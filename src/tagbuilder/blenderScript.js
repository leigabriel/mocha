import { BACKGROUNDS } from './constants.js';

function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/**
 * A self-contained Blender (Python) script: it unpacks the exported GLB, imports it and
 * builds a studio shot (gradient world, key / rim / fill lights, camera, Cycles).
 * Run it from Blender's Scripting tab, or headless:
 *   blender -b -P mocha_tag_keychain.py -- out.png
 */
export function blenderScript(design, glbArrayBuffer, bounds) {
  const bg = BACKGROUNDS[design.bg] ?? BACKGROUNDS.studio;
  const top = bg.top ?? '#f4f4f2';
  const bottom = bg.bottom ?? '#cfd2d6';
  const mm = (v) => (v / 1000).toFixed(5);
  const cx = mm((bounds.min.x + bounds.max.x) / 2);
  const cy = mm((bounds.min.y + bounds.max.y) / 2);
  const cz = mm((bounds.min.z + bounds.max.z) / 2);
  const size = mm(Math.max(bounds.max.y - bounds.min.y, (bounds.max.x - bounds.min.x) * 1.4));
  const b64 = toBase64(glbArrayBuffer).replace(/(.{100})/g, '$1\n');

  return `# Mocha Tag Builder: Blender scene
# Generated file. Run in Blender (Scripting tab > Run Script) or headless:
#   blender -b -P this_file.py -- render.png
import base64
import math
import os
import sys
import tempfile

import bpy
from mathutils import Vector

GLB_BASE64 = """
${b64}
"""

bpy.ops.wm.read_factory_settings(use_empty=True)

glb_path = os.path.join(tempfile.gettempdir(), "mocha_tag_keychain.glb")
with open(glb_path, "wb") as f:
    f.write(base64.b64decode("".join(GLB_BASE64.split())))
bpy.ops.import_scene.gltf(filepath=glb_path)

# ---- animation: the GLB may carry loops; match the timeline to the longest one
scene = bpy.context.scene
scene.render.fps = 30
if bpy.data.actions:
    scene.frame_start = 1
    scene.frame_end = max(int(round(a.frame_range[1])) for a in bpy.data.actions)

# ---- world: vertical gradient like the preview backdrop
def hex_to_rgba(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)

world = bpy.data.worlds.new("MochaWorld")
bpy.context.scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
coord = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
bg = nt.nodes.new("ShaderNodeBackground")
out = nt.nodes.new("ShaderNodeOutputWorld")
ramp.color_ramp.elements[0].color = hex_to_rgba("${bottom}")
ramp.color_ramp.elements[1].color = hex_to_rgba("${top}")
ramp.color_ramp.elements[0].position = 0.35
ramp.color_ramp.elements[1].position = 0.65
nt.links.new(coord.outputs["Generated"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.1
nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

# ---- scene centre in Blender axes (glTF x,y,z -> Blender x,-z,y)
center = Vector((${cx}, -(${cz}), ${cy}))
size = ${size}

def add_area(name, offset, energy, scale):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.size = scale
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = center + Vector(offset)
    obj.rotation_euler = (center - obj.location).to_track_quat("-Z", "Y").to_euler()
    return obj

# the camera looks along +Y from the front (-Y side)
add_area("Key", (size * 1.2, -size * 1.6, size * 1.4), 60, size * 1.2)
add_area("Rim", (-size * 1.4, size * 1.0, size * 0.8), 40, size)
add_area("Fill", (-size * 0.6, -size * 1.8, -size * 0.3), 18, size * 1.5)

# ---- camera
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 85
cam = bpy.data.objects.new("Camera", cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam
dist = size * 1.15 * cam_data.lens / cam_data.sensor_width
cam.location = center + Vector((dist * 0.12, -dist, dist * 0.06))
cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()

# ---- render settings
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.render.resolution_x = 2048
scene.render.resolution_y = 2048
try:
    scene.view_settings.view_transform = "AgX"
except TypeError:
    scene.view_settings.view_transform = "Filmic"

argv = sys.argv
if "--" in argv and len(argv) > argv.index("--") + 1:
    scene.render.filepath = os.path.abspath(argv[argv.index("--") + 1])
    bpy.ops.render.render(write_still=True)
`;
}
