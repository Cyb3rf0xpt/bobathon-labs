"""Generate class_diagram.png and data_model_diagram.png into ./ddoc/"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

OUT = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────
def box(ax, x, y, w, h, title, rows,
        hdr_color="#3b82d4", txt_color="white",
        border="#3b82d4", stereo=None):
    """Draw a UML-style box. Returns (x, y, w, h)."""
    row_h = 0.32
    body_h = max(len(rows) * row_h + 0.18, h)
    total_h = 0.55 + body_h

    # outer border
    rect = FancyBboxPatch((x, y - total_h), w, total_h,
                          boxstyle="round,pad=0.02",
                          linewidth=1.2, edgecolor=border,
                          facecolor="white", zorder=2)
    ax.add_patch(rect)

    # header fill
    hdr = FancyBboxPatch((x, y - 0.55), w, 0.55,
                         boxstyle="round,pad=0.02",
                         linewidth=0, edgecolor=hdr_color,
                         facecolor=hdr_color, zorder=3)
    ax.add_patch(hdr)

    # stereotype
    ty = y - 0.13
    if stereo:
        ax.text(x + w/2, ty, stereo,
                ha="center", va="center", fontsize=6.5,
                color="white", fontstyle="italic", zorder=4)
        ty = y - 0.30

    # title
    ax.text(x + w/2, ty, title,
            ha="center", va="center", fontsize=8.5,
            fontweight="bold", color=txt_color, zorder=4)

    # divider
    ax.plot([x, x+w], [y - 0.55, y - 0.55],
            color=border, linewidth=0.8, zorder=4)

    # rows
    for i, row in enumerate(rows):
        ry = y - 0.55 - 0.14 - i * row_h
        ax.text(x + 0.06, ry, row,
                ha="left", va="center", fontsize=7,
                color="#1f2328", zorder=4)

    cx = x + w/2
    cy_top = y
    cy_bot = y - total_h
    return cx, cy_top, cx, cy_bot


def arrow(ax, x1, y1, x2, y2, style="dep", label=""):
    ls = "--" if style == "dep" else "-"
    color = "#57606a" if style == "dep" else "#3b82d4"
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                 arrowprops=dict(arrowstyle="-|>", color=color,
                                 lw=1.2, linestyle=ls),
                 zorder=5)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.05, my, label, fontsize=6.5,
                color="#57606a", zorder=6)


# ═════════════════════════════════════════════
# 1. CLASS DIAGRAM
# ═════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(18, 13))
ax.set_xlim(0, 18)
ax.set_ylim(0, 13)
ax.axis("off")
ax.set_facecolor("#f7f8fa")
fig.patch.set_facecolor("#f7f8fa")

ax.text(9, 12.75, "Class Diagram — Corebank Demo API",
        ha="center", va="center", fontsize=14, fontweight="bold", color="#1f2328")
ax.text(9, 12.50, "demo_api.py  ·  teller_client.py  ·  backoffice_client.py",
        ha="center", va="center", fontsize=9, color="#57606a")

# ── FastAPI app ──────────────────────────────
cx_app, cy_app_top, _, cy_app_bot = box(
    ax, 7.5, 12.2, 3.0, 0.6, "app",
    ["title = 'Corebank Demo API v5'"],
    stereo="«FastAPI instance»")

# ── Pydantic models ──────────────────────────
cx_t, _, _, cy_t_bot = box(
    ax, 0.3, 10.8, 3.2, 0.9, "Transfer",
    ["+ source_account_id: str",
     "+ destination_account_id: str",
     "+ amount_eur: Decimal(gt=0)"],
    hdr_color="#7c5cd8", border="#7c5cd8",
    stereo="«Pydantic BaseModel»")

cx_m, _, _, cy_m_bot = box(
    ax, 4.0, 10.8, 2.8, 0.9, "ManualTx",
    ["+ amount_eur: float",
     "+ type: str",
     "+ booking_ts: str"],
    hdr_color="#7c5cd8", border="#7c5cd8",
    stereo="«Pydantic BaseModel»")

cx_o, _, _, cy_o_bot = box(
    ax, 7.2, 10.8, 3.5, 0.7, "OAuth2PasswordRequestForm",
    ["+ username: str",
     "+ password: str"],
    hdr_color="#7c5cd8", border="#7c5cd8",
    stereo="«FastAPI form»")

# ── Route handlers ───────────────────────────
cx_login, cy_login_top, _, cy_login_bot = box(
    ax, 0.3, 9.0, 2.6, 0.75, "login()",
    ["form: OAuth2PasswordRequestForm",
     "→ access_token: str"],
    stereo="«POST /token»")

cx_la, cy_la_top, _, cy_la_bot = box(
    ax, 3.2, 9.0, 2.6, 0.75, "list_accounts()",
    ["token: str (OAuth2)",
     "→ List[dict]"],
    stereo="«GET /accounts»")

cx_cu, cy_cu_top, _, cy_cu_bot = box(
    ax, 6.1, 9.0, 2.6, 0.75, "customers()",
    ["token: str (OAuth2)",
     "→ List[dict] [BACKOFFICE]"],
    stereo="«GET /customers»")

cx_tx, cy_tx_top, _, cy_tx_bot = box(
    ax, 9.0, 9.0, 2.8, 0.75, "tx_list()",
    ["account_id: str, token: str",
     "→ List[dict]"],
    stereo="«GET /transactions/{id}»")

cx_mt, cy_mt_top, _, cy_mt_bot = box(
    ax, 0.3, 7.2, 2.6, 0.75, "make_transfer()",
    ["body: Transfer, token: str",
     "→ dict (POSTED)"],
    stereo="«POST /transfer»")

cx_so, cy_so_top, _, cy_so_bot = box(
    ax, 3.2, 7.2, 2.9, 0.75, "set_overdraft()",
    ["account_id: str, limit_eur: float",
     "→ dict [BACKOFFICE]"],
    stereo="«PATCH /accounts/{id}/overdraft»")

cx_mp, cy_mp_top, _, cy_mp_bot = box(
    ax, 6.4, 7.2, 2.8, 0.75, "manual_post()",
    ["account_id: str, tx: ManualTx",
     "→ dict [BACKOFFICE]"],
    stereo="«POST /transactions/{id}»")

# ── Helpers ──────────────────────────────────
cx_h, cy_h_top, _, cy_h_bot = box(
    ax, 0.3, 5.4, 4.8, 1.0, "Helpers (demo_api.py)",
    ["+ get_db() → Generator[sqlite3.Connection]",
     "+ verify(tok, db) → Row",
     "+ require_role(row, allowed) → Row"],
    hdr_color="#57606a", border="#57606a",
    stereo="«utility functions»")

# ── CLI clients ──────────────────────────────
cx_tel, cy_tel_top, _, _ = box(
    ax, 6.4, 5.4, 3.2, 1.0, "TellerClient",
    ["+ login() → str",
     "+ get_accounts(token) → list",
     "+ post_transfer(token, …) → dict"],
    hdr_color="#57606a", border="#57606a",
    stereo="«CLI module»")

cx_bo, cy_bo_top, _, _ = box(
    ax, 10.0, 5.4, 3.4, 1.0, "BackofficeClient",
    ["+ login() → str",
     "+ get(endpoint, tok) → json",
     "+ post(endpoint, tok, payload) → json"],
    hdr_color="#57606a", border="#57606a",
    stereo="«CLI module»")

# ── Arrows ────────────────────────────────────
# app → handlers
for cx in [cx_login, cx_la, cx_cu, cx_tx, cx_mt, cx_so, cx_mp]:
    arrow(ax, cx_app, cy_app_bot, cx, cy_login_top, style="assoc")

# make_transfer → Transfer
arrow(ax, cx_mt, cy_mt_top + 0.15, cx_t + 1.6, cy_t_bot, style="dep", label="«uses»")
# manual_post → ManualTx
arrow(ax, cx_mp, cy_mp_top + 0.15, cx_m + 1.4, cy_m_bot, style="dep", label="«uses»")
# login → OAuth2PasswordRequestForm
arrow(ax, cx_login, cy_login_top + 0.1, cx_o + 1.7, cy_o_bot, style="dep", label="«uses»")
# handlers → helpers
arrow(ax, cx_la, cy_la_bot, cx_h + 1.5, cy_h_top, style="dep", label="«calls»")
# clients → app (HTTP)
arrow(ax, cx_tel, cy_tel_top + 0.1, cx_app - 0.5, cy_app_bot, style="dep", label="HTTP")
arrow(ax, cx_bo, cy_bo_top + 0.1, cx_app + 0.5, cy_app_bot, style="dep", label="HTTP")

# ── Legend ────────────────────────────────────
lx, ly = 12.5, 10.8
leg = FancyBboxPatch((lx, ly - 2.2), 3.2, 2.2,
                     boxstyle="round,pad=0.04",
                     linewidth=1, edgecolor="#e5e7eb",
                     facecolor="#ffffff", zorder=2)
ax.add_patch(leg)
ax.text(lx + 1.6, ly - 0.2, "Legend", ha="center", fontsize=8,
        fontweight="bold", color="#1f2328", zorder=3)
for i, (col, lbl) in enumerate([
    ("#3b82d4", "FastAPI route handler"),
    ("#7c5cd8", "Pydantic model"),
    ("#57606a", "Utility / CLI module"),
]):
    iy = ly - 0.65 - i * 0.48
    ax.add_patch(FancyBboxPatch((lx + 0.15, iy - 0.14), 0.35, 0.28,
                                boxstyle="round,pad=0.01",
                                facecolor=col, edgecolor=col, zorder=3))
    ax.text(lx + 0.65, iy, lbl, va="center", fontsize=7,
            color="#1f2328", zorder=3)

ax.text(9, 0.18, "Made with IBM Bob",
        ha="center", fontsize=7.5, color="#57606a")
ax.plot([1, 17], [0.30, 0.30], color="#e5e7eb", linewidth=0.7)

plt.tight_layout(pad=0.4)
plt.savefig(os.path.join(OUT, "class_diagram.png"), dpi=160, bbox_inches="tight")
plt.close()
print("class_diagram.png written")


# ═════════════════════════════════════════════
# 2. DATA MODEL DIAGRAM (ERD)
# ═════════════════════════════════════════════
fig2, ax2 = plt.subplots(figsize=(16, 13))
ax2.set_xlim(0, 16)
ax2.set_ylim(0, 13)
ax2.axis("off")
ax2.set_facecolor("#f7f8fa")
fig2.patch.set_facecolor("#f7f8fa")

ax2.text(8, 12.75, "Data Model Diagram — Corebank SQLite Database",
         ha="center", va="center", fontsize=14, fontweight="bold", color="#1f2328")
ax2.text(8, 12.50, "corebank.db  ·  5 tables",
         ha="center", va="center", fontsize=9, color="#57606a")

def erd_box(ax, x, y, w, title, cols, pk_rows=(), fk_rows=()):
    """cols: list of (name, type) tuples."""
    row_h = 0.34
    body_h = len(cols) * row_h + 0.22
    total_h = 0.52 + body_h

    outer = FancyBboxPatch((x, y - total_h), w, total_h,
                           boxstyle="round,pad=0.02",
                           linewidth=1.4, edgecolor="#3b82d4",
                           facecolor="white", zorder=2)
    ax.add_patch(outer)
    hdr = FancyBboxPatch((x, y - 0.52), w, 0.52,
                         boxstyle="round,pad=0.02",
                         linewidth=0, facecolor="#3b82d4", zorder=3)
    ax.add_patch(hdr)
    ax.text(x + w/2, y - 0.26, title,
            ha="center", va="center", fontsize=9,
            fontweight="bold", color="white", zorder=4)
    ax.plot([x, x+w], [y - 0.52, y - 0.52],
            color="#3b82d4", linewidth=0.8, zorder=4)

    for i, (col, typ) in enumerate(cols):
        ry = y - 0.52 - 0.17 - i * row_h
        prefix = ""
        style = "normal"
        col_color = "#1f2328"
        if col in pk_rows:
            prefix = "PK  "
            col_color = "#c05c00"
            style = "bold"
        elif col in fk_rows:
            prefix = "FK  "
            col_color = "#1a6b3c"
        ax.text(x + 0.12, ry, f"{prefix}{col}",
                ha="left", va="center", fontsize=7.5,
                color=col_color, fontstyle="normal",
                fontweight=style, zorder=4)
        ax.text(x + w - 0.12, ry, typ,
                ha="right", va="center", fontsize=7,
                color="#57606a", zorder=4)

    return x + w/2, y, x + w/2, y - total_h


# ── Row 1: customers / accounts / transactions ──
cx_cust, _, _, cy_cust_bot = erd_box(
    ax2, 0.4, 11.8, 3.8, "customers",
    [("customer_id", "TEXT PK"),
     ("type", "TEXT"),
     ("name", "TEXT"),
     ("tax_id", "TEXT"),
     ("date_of_birth", "DATE")],
    pk_rows=("customer_id",))

cx_acc, cy_acc_top, _, cy_acc_bot = erd_box(
    ax2, 5.2, 11.8, 4.0, "accounts",
    [("account_id", "TEXT PK"),
     ("customer_id", "TEXT FK"),
     ("iban", "TEXT UNIQUE"),
     ("opening_date", "DATE"),
     ("status", "TEXT"),
     ("has_credit_line", "INTEGER"),
     ("overdraft_limit_eur", "REAL")],
    pk_rows=("account_id",),
    fk_rows=("customer_id",))

cx_tx, cy_tx_top, _, cy_tx_bot = erd_box(
    ax2, 10.6, 11.8, 4.6, "transactions",
    [("tx_id", "TEXT PK"),
     ("account_id", "TEXT FK"),
     ("booking_ts", "DATETIME"),
     ("amount_eur", "REAL"),
     ("type", "TEXT")],
    pk_rows=("tx_id",),
    fk_rows=("account_id",))

# ── Row 2: credit_lines / users ──────────────────
cx_cl, cy_cl_top, _, cy_cl_bot = erd_box(
    ax2, 3.6, 6.8, 4.2, "credit_lines",
    [("credit_id", "TEXT PK"),
     ("account_id", "TEXT FK"),
     ("limit_eur", "REAL"),
     ("drawn_eur", "REAL"),
     ("interest_rate", "REAL"),
     ("start_date", "DATE"),
     ("end_date", "DATE")],
    pk_rows=("credit_id",),
    fk_rows=("account_id",))

cx_usr, _, _, cy_usr_bot = erd_box(
    ax2, 10.0, 6.8, 4.0, "users",
    [("username", "TEXT PK"),
     ("hashed_password", "TEXT"),
     ("role", "TEXT")],
    pk_rows=("username",))

# ── FK arrows ────────────────────────────────────
def fk_line(ax, x1, y1, x2, y2, label=""):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color="#3b82d4",
                                lw=1.3, linestyle="-"),
                zorder=5)
    if label:
        ax.text((x1+x2)/2 + 0.1, (y1+y2)/2, label,
                fontsize=6.5, color="#57606a", zorder=6)

# customers 1──< accounts
fk_line(ax2, cx_cust, cy_cust_bot, cx_acc, cy_acc_top, "1 : N")
# accounts 1──< transactions
fk_line(ax2, cx_acc + 0.6, cy_acc_bot, cx_tx - 0.4, cy_tx_top, "1 : N")
# accounts 1──< credit_lines
fk_line(ax2, cx_acc, cy_acc_bot, cx_cl + 0.2, cy_cl_top, "1 : N")

# ── Separator ─────────────────────────────────────
ax2.plot([1, 15], [3.2, 3.2], color="#e5e7eb", linewidth=0.8)

# ── FK constraint notes ───────────────────────────
ax2.text(8, 3.05, "Foreign Key Constraints", ha="center",
         fontsize=8.5, fontweight="bold", color="#1f2328")
notes = [
    "accounts.customer_id  →  customers.customer_id",
    "transactions.account_id  →  accounts.account_id",
    "credit_lines.account_id  →  accounts.account_id",
    "accounts.iban  UNIQUE",
]
for i, note in enumerate(notes):
    ax2.text(8, 2.65 - i * 0.38, f"• {note}",
             ha="center", fontsize=8, color="#57606a")

# ── Legend ────────────────────────────────────────
lx2, ly2 = 0.4, 3.1
ax2.add_patch(FancyBboxPatch((lx2, ly2 - 1.3), 3.8, 1.3,
                             boxstyle="round,pad=0.04",
                             linewidth=1, edgecolor="#e5e7eb",
                             facecolor="#ffffff", zorder=2))
ax2.text(lx2 + 1.9, ly2 - 0.2, "Legend", ha="center", fontsize=8,
         fontweight="bold", color="#1f2328", zorder=3)
for i, (col, lbl) in enumerate([
    ("#c05c00", "PK – Primary Key"),
    ("#1a6b3c", "FK – Foreign Key"),
    ("#57606a", "regular column"),
]):
    iy = ly2 - 0.62 - i * 0.32
    ax2.add_patch(FancyBboxPatch((lx2 + 0.15, iy - 0.11), 0.28, 0.22,
                                 boxstyle="round,pad=0.01",
                                 facecolor=col, edgecolor=col, zorder=3))
    ax2.text(lx2 + 0.60, iy, lbl, va="center", fontsize=7.5,
             color="#1f2328", zorder=3)

ax2.text(8, 0.20, "Made with IBM Bob",
         ha="center", fontsize=7.5, color="#57606a")
ax2.plot([1, 15], [0.33, 0.33], color="#e5e7eb", linewidth=0.7)

plt.tight_layout(pad=0.4)
plt.savefig(os.path.join(OUT, "data_model_diagram.png"), dpi=160, bbox_inches="tight")
plt.close()
print("data_model_diagram.png written")
