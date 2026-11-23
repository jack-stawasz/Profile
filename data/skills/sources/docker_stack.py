# The CSCI 420 Robotics compose stack (a ROS2 container drawing through a noVNC container), for the Docker slide
import os

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
# -------------------------------------------------------------

# ==================================================
# Settings
# ==================================================
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docker.png")

FIG_SIZE  = 6          # inches, square to sit in the carousel slide without cropping
DPI       = 200
FONT      = "DejaVu Sans Mono"
FONT_SIZE = 15
DOCKER    = "#2496ed"
ACCENT    = "#7dd3fc"
MUTED     = "#94a3b8"

# ==================================================
# Drawing Helpers
# ==================================================
def __box(ax, x0, y0, x1, y1, color, title, body="", dashed=False):
    ax.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0, boxstyle="round,pad=0,rounding_size=0.25",
        fill=not dashed, facecolor=color + "26", edgecolor=color, lw=2.5, ls="--" if dashed else "-"))
    if dashed: return
    xc = (x0 + x1) / 2
    ax.text(xc, y1 - 0.55, title, color=color, ha="center", va="center", fontsize=FONT_SIZE + 3, weight="bold")
    ax.text(xc, (y0 + y1) / 2 - 0.35, body, color="white", ha="center", va="center", fontsize=FONT_SIZE - 3,
        linespacing=1.5)

def __arrow(ax, start, end, color, label="", label_at=None, style="-|>", ls="-"):
    ax.annotate("", xy=end, xytext=start, arrowprops=dict(arrowstyle=style, color=color, lw=2.5, ls=ls,
        shrinkA=0, shrinkB=0, mutation_scale=22))
    if label: ax.text(*label_at, label, color=color, ha="center", va="center", fontsize=FONT_SIZE - 3)

# ==================================================
# Plotting
# ==================================================
plt.rcParams["font.family"] = FONT
fig = plt.figure(figsize=(FIG_SIZE, FIG_SIZE), facecolor="black")
ax = fig.add_axes((0, 0, 1, 1), facecolor="black")
ax.set_xlim(0, 10)
ax.set_ylim(0, 10)

# The bottom fifth stays empty for the slide's name
__box(ax, 0.4, 2.4, 9.6, 6.9, MUTED, "", dashed=True)
ax.text(0.75, 2.75, "x11 network", color=MUTED, va="center", fontsize=FONT_SIZE - 3)
__box(ax, 0.8, 3.3, 4.4, 6.3, DOCKER, "ros", "ubuntu 24.04\nROS2 kilted")
__box(ax, 5.6, 3.3, 9.2, 6.3, DOCKER, "novnc", "theasp/novnc")
__box(ax, 0.4, 7.7, 4.6, 9.4, ACCENT, "volume", "labs/")
__box(ax, 5.4, 7.7, 9.6, 9.4, ACCENT, "browser", "localhost:8080")

__arrow(ax, (4.4, 4.5), (5.6, 4.5), "white", "X11", (5.0, 4.95))
__arrow(ax, (2.5, 7.7), (2.5, 6.3), ACCENT, style="-", ls=":")
__arrow(ax, (3.6, 7.7), (6.4, 6.3), ACCENT, style="-", ls=":")
__arrow(ax, (7.5, 6.3), (7.5, 7.7), "white", "8080", (8.25, 7.3))

ax.set_axis_off()
fig.savefig(OUT_PATH, dpi=DPI, facecolor="black")
