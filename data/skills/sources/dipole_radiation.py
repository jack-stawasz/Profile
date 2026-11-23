# Radiation pattern of an oscillating electric dipole p = p₀cos(ωt) ẑ, drawn for the Electricity & Magnetism slide
import os

import numpy as np
import matplotlib.pyplot as plt
# -------------------------------------------------------------

# ==================================================
# Settings
# ==================================================
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "electricity_&_magnetism.png")

FIG_SIZE   = 6         # inches, square to sit in the carousel slide without cropping
DPI        = 200
N_GRID     = 1200
HALF_WIDTH = 4         # wavelengths from the dipole to the frame edge
CORE       = 0.6     # wavelengths masked at the center, where the far-field form fails
LOBE_SCALE = 3.4       # wavelengths, radius of the sin²θ outline at θ = π/2
COLOR_MAP  = "inferno"
FONT_SIZE  = 20

# ==================================================
# Far-Field Power
# ==================================================
# Lengths in wavelengths, so k = 2π
x = np.linspace(-HALF_WIDTH, HALF_WIDTH, N_GRID)
X, Z = np.meshgrid(x, x)
r = np.hypot(X, Z)
θ = np.arctan2(np.abs(X), Z)

# r²⟨S⟩ at t = 0 (Griffiths 11.21): dP/dΩ ∝ sin²θ cos²(kr - ωt)
power = np.sin(θ)**2 * np.cos(2 * np.pi * r)**2
power[r < CORE] = np.nan

θ_lobe = np.linspace(0, 2 * np.pi, 721)
r_lobe = LOBE_SCALE * np.sin(θ_lobe)**2
r_lobe[r_lobe < CORE] = np.nan

# ==================================================
# Plotting
# ==================================================
plt.rcParams["mathtext.fontset"] = "cm"
fig, ax = plt.subplots(figsize=(FIG_SIZE, FIG_SIZE), facecolor="black")
ax.imshow(power, cmap=COLOR_MAP, origin="lower", extent=(-HALF_WIDTH, HALF_WIDTH, -HALF_WIDTH, HALF_WIDTH),
    vmin=0, vmax=1, interpolation="bilinear")
ax.plot(r_lobe * np.sin(θ_lobe), r_lobe * np.cos(θ_lobe), color="white", lw=1.5, ls="--", alpha=0.7)

ax.annotate("", xy=(0, 0.42), xytext=(0, -0.42), arrowprops=dict(arrowstyle="-|>", color="white", lw=2.5))
ax.text(0.16, 0.02, r"$\vec{p}$", color="white", fontsize=FONT_SIZE, va="center")
ax.text(0.04, 0.04, r"$\frac{dP}{d\Omega} \propto \sin^2\theta$", transform=ax.transAxes, color="white",
    fontsize=FONT_SIZE - 2)

ax.set_axis_off()
fig.savefig(OUT_PATH, dpi=DPI, bbox_inches="tight", pad_inches=0, facecolor="black")
