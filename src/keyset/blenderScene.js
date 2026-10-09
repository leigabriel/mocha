import { BACKDROPS, METALS } from './constants.js';

function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export const BLENDER_QUALITY = {
  draft: { samples: 48, res: [810, 1012], bounces: 8 },
  high: { samples: 384, res: [1620, 2025], bounces: 16 },
  ultra: { samples: 1024, res: [2400, 3000], bounces: 24 },
};

/**
 * A self-contained Blender (Python) script that rebuilds the set as a studio product shot.
 * It unpacks the exported GLB, swaps every `KS_<role>_<hex>` material for a Cycles node
 * material (tinted glass with real refraction, mirror chrome, soft-touch, frosted acrylic),
 * lights it with softboxes that show up as long streak highlights, and sets up a camera
 * with depth of field and a denoised Cycles render. The GLB's spin / swing loop becomes the
 * turntable. Run it in Blender's Scripting tab, or headless:
 *   blender -b -P mocha_key_set.py -- render.png [--anim] [--samples 256] [--res 1620x2025] [--save set.blend]
 */
export function blenderScene(design, glbArrayBuffer, bounds, { quality = 'high' } = {}) {
  const q = BLENDER_QUALITY[quality] ?? BLENDER_QUALITY.high;
  const bg = BACKDROPS[design.backdrop] ?? BACKDROPS.black;
  const mm = (v) => (v / 1000).toFixed(5);
  const cx = mm((bounds.min.x + bounds.max.x) / 2);
  const cy = mm((bounds.min.y + bounds.max.y) / 2);
  const cz = mm((bounds.min.z + bounds.max.z) / 2);
  const size = mm(Math.max(bounds.max.y - bounds.min.y, (bounds.max.x - bounds.min.x) * 1.35));
  const rough = JSON.stringify(Object.fromEntries(Object.values(METALS).map((m) => [m.color.slice(1), m.roughness])));
  const b64 = toBase64(glbArrayBuffer).replace(/(.{100})/g, '$1\n');
  const bgHex = bg.top ?? '#000000';
  const transparent = bg.top === null;

  return `# Mocha Keychain Set: Blender scene (Cycles, studio product shot)
# Generated file. Run in Blender (Scripting tab > Run Script) or headless:
#   blender -b -P this_file.py -- render.png [--anim] [--samples 256] [--res 1620x2025] [--save set.blend]
# Tweak the QUALITY block below to trade speed for noise.
import base64
import math
import os
import sys
import tempfile

import bpy
from mathutils import Vector

# ------------------------------------------------------------------ QUALITY
SAMPLES = ${q.samples}          # path-tracing samples per pixel (denoised)
RESOLUTION = (${q.res[0]}, ${q.res[1]})
MAX_BOUNCES = ${q.bounces}      # glass needs many bounces to look clear
BACKDROP = "${bgHex}"
TRANSPARENT = ${transparent ? 'True' : 'False'}   # transparent film for compositing
METAL_ROUGHNESS = ${rough}

GLB_BASE64 = """
${b64}
"""

# ------------------------------------------------------------ command line
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out_path = None
save_path = None
animate = False
i = 0
while i < len(argv):
    a = argv[i]
    if a == "--anim":
        animate = True
    elif a == "--samples" and i + 1 < len(argv):
        SAMPLES = int(argv[i + 1]); i += 1
    elif a == "--res" and i + 1 < len(argv):
        w, h = argv[i + 1].lower().split("x"); RESOLUTION = (int(w), int(h)); i += 1
    elif a == "--save" and i + 1 < len(argv):
        save_path = os.path.abspath(argv[i + 1]); i += 1
    elif not a.startswith("--") and out_path is None:
        out_path = os.path.abspath(a)
    i += 1

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- import
glb_path = os.path.join(tempfile.gettempdir(), "mocha_key_set.glb")
with open(glb_path, "wb") as f:
    f.write(base64.b64decode("".join(GLB_BASE64.split())))
bpy.ops.import_scene.gltf(filepath=glb_path)

# the exporter adds a camera and lights for glTF viewers; this script builds its own rig
for obj in list(bpy.data.objects):
    if obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)

scene.render.fps = 30
if bpy.data.actions:
    scene.frame_start = 1
    scene.frame_end = max(int(round(a.frame_range[1])) for a in bpy.data.actions)

# --------------------------------------------------------------- materials
def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    lin = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        lin.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (lin[0], lin[1], lin[2], a)

def set_input(node, names, value):
    for name in names:
        if name in node.inputs:
            node.inputs[name].default_value = value
            return

def make_material(mat, role, hexv):
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    base = hex_rgba(hexv)
    set_input(bsdf, ["Base Color"], base)
    if role == "glass":
        set_input(bsdf, ["Roughness"], 0.02)
        set_input(bsdf, ["IOR"], 1.5)
        set_input(bsdf, ["Transmission Weight", "Transmission"], 1.0)
        set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.6)
        set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.02)
    elif role == "frost":
        set_input(bsdf, ["Roughness"], 0.32)
        set_input(bsdf, ["IOR"], 1.45)
        set_input(bsdf, ["Transmission Weight", "Transmission"], 0.85)
    elif role == "chrome" or role == "metal":
        set_input(bsdf, ["Metallic"], 1.0)
        set_input(bsdf, ["Roughness"], METAL_ROUGHNESS.get(hexv.lstrip("#"), 0.06) if role == "metal" else 0.05)
    elif role == "soft":
        set_input(bsdf, ["Roughness"], 0.7)
        set_input(bsdf, ["Sheen Weight", "Sheen"], 0.6)
        set_input(bsdf, ["Sheen Roughness"], 0.5)
        set_input(bsdf, ["Subsurface Weight", "Subsurface"], 0.08)
        set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.1)
    elif role == "matte":
        set_input(bsdf, ["Roughness"], 0.6)
    else:  # gloss
        set_input(bsdf, ["Roughness"], 0.18)
        set_input(bsdf, ["Coat Weight", "Clearcoat"], 1.0)
        set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.03)

for mat in bpy.data.materials:
    parts = mat.name.split("_")
    if len(parts) >= 3 and parts[0] == "KS":
        make_material(mat, parts[1], "#" + parts[2][:6])

# every mesh gets smooth shading (the glTF import already carries the normals)
for obj in bpy.data.objects:
    if obj.type == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = True

# ------------------------------------------------------------------ world
world = bpy.data.worlds.new("MochaWorld")
scene.world = world
world.use_nodes = True
wt = world.node_tree
wt.nodes.clear()
bgn = wt.nodes.new("ShaderNodeBackground")      # what the camera sees
dome = wt.nodes.new("ShaderNodeBackground")     # what glass and chrome reflect
lp = wt.nodes.new("ShaderNodeLightPath")
mix = wt.nodes.new("ShaderNodeMixShader")
wo = wt.nodes.new("ShaderNodeOutputWorld")
bgn.inputs["Color"].default_value = hex_rgba(BACKDROP)
bgn.inputs["Strength"].default_value = 1.0
dome.inputs["Color"].default_value = (0.5, 0.56, 0.66, 1.0)
dome.inputs["Strength"].default_value = 0.18
wt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
wt.links.new(dome.outputs["Background"], mix.inputs[1])
wt.links.new(bgn.outputs["Background"], mix.inputs[2])
wt.links.new(mix.outputs["Shader"], wo.inputs["Surface"])
scene.render.film_transparent = TRANSPARENT

# -------------------------------------------------------- scene dimensions
center = Vector((${cx}, -(${cz}), ${cy}))
size = ${size}

def softbox(name, offset, size_xy, energy, color=(1.0, 1.0, 1.0)):
    data = bpy.data.lights.new(name, "AREA")
    data.shape = "RECTANGLE"
    data.size = size_xy[0]
    data.size_y = size_xy[1]
    data.energy = energy
    data.color = color
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = center + Vector(offset)
    obj.rotation_euler = (center - obj.location).to_track_quat("-Z", "Y").to_euler()
    return obj

# long strip lights make the glass and chrome show clean streak highlights
E = (size / 0.2) ** 2   # light energy scales with the square of the scene size
softbox("Strip_L", (-size * 1.15, -size * 0.9, size * 0.1), (size * 0.10, size * 1.5), 3.4 * E, (0.86, 0.92, 1.0))
softbox("Strip_R", (size * 1.15, -size * 0.8, size * 0.2), (size * 0.09, size * 1.4), 2.8 * E, (0.8, 0.9, 1.0))
softbox("Top", (0, -size * 0.7, size * 1.4), (size * 1.2, size * 0.5), 2 * E)
softbox("Rim", (size * 0.2, size * 1.1, size * 0.6), (size * 1.0, size * 0.5), 3.4 * E)
softbox("Floor_Bounce", (0, -size * 1.2, -size * 0.9), (size * 1.3, size * 0.4), 0.7 * E, (1.0, 0.94, 0.86))

# ------------------------------------------------------------------ camera
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 85
cam_data.dof.use_dof = True
cam_data.dof.aperture_fstop = 9.0
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
dist = size * 1.18 * cam_data.lens / cam_data.sensor_width
cam.location = center + Vector((dist * 0.1, -dist, dist * 0.05))
cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_data.dof.focus_distance = (center - cam.location).length

# ------------------------------------------------------------------ render
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.samples = SAMPLES
cy.use_adaptive_sampling = True
cy.use_denoising = True
try:
    cy.denoiser = "OPENIMAGEDENOISE"
except TypeError:
    pass
cy.max_bounces = MAX_BOUNCES
cy.transmission_bounces = MAX_BOUNCES
cy.glossy_bounces = 8
cy.diffuse_bounces = 4
cy.transparent_max_bounces = MAX_BOUNCES
cy.caustics_reflective = False
cy.caustics_refractive = False
cy.sample_clamp_indirect = 10.0
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.get_devices()
    for kind in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                cy.device = "GPU"
                break
        except Exception:
            continue
except Exception:
    pass

scene.render.resolution_x, scene.render.resolution_y = RESOLUTION
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_depth = "16"
if TRANSPARENT:
    scene.render.image_settings.color_mode = "RGBA"
for transform in ("AgX", "Filmic"):
    try:
        scene.view_settings.view_transform = transform
        break
    except TypeError:
        continue
for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try:
        scene.view_settings.look = look
        break
    except TypeError:
        continue

if save_path:
    bpy.ops.wm.save_as_mainfile(filepath=save_path)

if out_path:
    if animate:
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "HIGH"
        scene.render.filepath = out_path
        bpy.ops.render.render(animation=True)
    else:
        scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
`;
}
