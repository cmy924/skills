#!/usr/bin/env python3
"""
remove-bg.py — 图片去背景透明化工具

支持两种模式：
  1. AI 模式（默认）：使用 rembg 进行 AI 抠图，效果最好
  2. 颜色模式：基于背景颜色替换，适合纯色背景

用法：
  # AI 模式（推荐，首次使用会自动安装 rembg）
  python remove-bg.py input.png
  python remove-bg.py input.png -o output.png

  # 颜色模式（不依赖 AI 模型）
  python remove-bg.py input.png --mode color
  python remove-bg.py input.png --mode color --tolerance 30
  python remove-bg.py input.png --mode color --bg-color "#FFFFFF"

  # 批量处理
  python remove-bg.py *.png --mode ai
  python remove-bg.py img1.png img2.jpg img3.png -o outdir/

  # 边缘羽化（柔化边缘，减少硬边）
  python remove-bg.py input.png --feather 2

参数：
  input           输入图片路径（支持多个）
  -o, --output    输出路径（单文件时为文件名，多文件时为目录）
  --mode          去背景模式：ai（默认） 或 color
  --tolerance     颜色模式容差 0-255（默认 30）
  --bg-color      颜色模式指定背景色（默认自动检测，格式 #RRGGBB）
  --feather       边缘羽化半径像素（默认 0，推荐 1-3）
  --preview       处理后打开图片预览
"""

import argparse
import glob
import os
import subprocess
import sys
from pathlib import Path


def ensure_pillow():
    """确保 Pillow 已安装"""
    try:
        from PIL import Image
        return True
    except ImportError:
        print("📦 正在安装 Pillow...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
        return True


def ensure_rembg():
    """确保 rembg 已安装"""
    try:
        import rembg
        return True
    except ImportError:
        print("📦 正在安装 rembg（首次使用需下载 AI 模型，可能需要几分钟）...")
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "rembg[cpu]", "-q"]
            )
            return True
        except subprocess.CalledProcessError:
            print("⚠️  rembg 安装失败，将回退到颜色模式")
            return False


def detect_bg_color(img, sample_size=10):
    """
    从图片四角采样，检测背景色。
    返回最常见的颜色作为背景色。
    """
    from collections import Counter

    import numpy as np

    pixels = []
    w, h = img.size
    img_array = np.array(img)

    # 从四个角各采样 sample_size x sample_size 个像素
    regions = [
        (0, sample_size, 0, sample_size),                    # 左上
        (0, sample_size, w - sample_size, w),                # 右上
        (h - sample_size, h, 0, sample_size),                # 左下
        (h - sample_size, h, w - sample_size, w),            # 右下
    ]

    for (y1, y2, x1, x2) in regions:
        patch = img_array[y1:y2, x1:x2]
        for row in patch:
            for pixel in row:
                pixels.append(tuple(pixel[:3]))

    # 将颜色量化到 8 的倍数，减少噪声
    quantized = []
    for r, g, b in pixels:
        quantized.append((r // 8 * 8, g // 8 * 8, b // 8 * 8))

    counter = Counter(quantized)
    bg_color = counter.most_common(1)[0][0]
    return bg_color


def color_distance(c1, c2):
    """计算两个 RGB 颜色之间的欧氏距离"""
    return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) ** 0.5


def remove_bg_color(img, tolerance=30, bg_color=None):
    """
    颜色模式去背景：
    1. 检测/使用指定的背景色
    2. 将与背景色相近的像素设为透明
    3. 使用 flood-fill 从边缘开始，只移除连通的背景区域
    """
    from PIL import Image
    import numpy as np

    img = img.convert("RGBA")
    data = np.array(img)

    if bg_color is None:
        bg_color = detect_bg_color(img)
        print(f"  🎨 检测到背景色: RGB({bg_color[0]}, {bg_color[1]}, {bg_color[2]})")

    # 计算每个像素与背景色的距离
    rgb = data[:, :, :3].astype(float)
    bg = np.array(bg_color, dtype=float)
    dist = np.sqrt(np.sum((rgb - bg) ** 2, axis=2))

    # 距离在容差范围内的标记为背景候选
    bg_mask = dist <= tolerance

    # Flood fill 从四条边开始，只移除与边缘连通的背景
    # 使用 scipy.ndimage.label 加速连通区域检测，回退到纯 numpy 实现
    h, w = bg_mask.shape

    try:
        from scipy.ndimage import label as ndimage_label
        # 标记所有连通的背景区域
        labeled, num_features = ndimage_label(bg_mask)
        # 收集与边缘接触的区域标签
        edge_labels = set()
        edge_labels.update(labeled[0, :].flatten())      # 上边
        edge_labels.update(labeled[h - 1, :].flatten())  # 下边
        edge_labels.update(labeled[:, 0].flatten())      # 左边
        edge_labels.update(labeled[:, w - 1].flatten())  # 右边
        edge_labels.discard(0)  # 0 表示非背景
        # 只保留与边缘连通的背景
        visited = np.isin(labeled, list(edge_labels))
    except ImportError:
        # 纯 numpy BFS 回退
        from collections import deque
        visited = np.zeros_like(bg_mask, dtype=bool)
        queue = deque()

        # 将四条边上的背景候选像素加入队列
        for x in range(w):
            if bg_mask[0, x] and not visited[0, x]:
                queue.append((0, x))
                visited[0, x] = True
            if bg_mask[h - 1, x] and not visited[h - 1, x]:
                queue.append((h - 1, x))
                visited[h - 1, x] = True
        for y in range(h):
            if bg_mask[y, 0] and not visited[y, 0]:
                queue.append((y, 0))
                visited[y, 0] = True
            if bg_mask[y, w - 1] and not visited[y, w - 1]:
                queue.append((y, w - 1))
                visited[y, w - 1] = True

        # BFS flood fill with deque for performance
        while queue:
            cy, cx = queue.popleft()
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_mask[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    # 将连通背景区域设为透明
    data[visited, 3] = 0

    # 对边缘进行半透明过渡（anti-alias）
    try:
        from scipy.ndimage import binary_dilation
        edge = binary_dilation(visited, iterations=1) & ~visited
        edge_ys, edge_xs = np.where(edge)
        for y, x in zip(edge_ys, edge_xs):
            d = dist[y, x]
            if d < tolerance:
                alpha_ratio = d / tolerance
                data[y, x, 3] = int(255 * alpha_ratio)
    except ImportError:
        pass  # scipy 不可用时跳过边缘优化

    return Image.fromarray(data)


def remove_bg_ai(img):
    """AI 模式去背景：使用 rembg"""
    from rembg import remove
    return remove(img)


def apply_feather(img, radius):
    """对 alpha 通道进行羽化处理"""
    if radius <= 0:
        return img
    from PIL import ImageFilter
    import numpy as np

    img = img.convert("RGBA")
    data = np.array(img)
    alpha = data[:, :, 3]

    # 找到边缘区域并模糊 alpha
    from PIL import Image as PILImage

    alpha_img = PILImage.fromarray(alpha)
    # 对 alpha 通道做高斯模糊
    blurred = alpha_img.filter(ImageFilter.GaussianBlur(radius=radius))
    blurred_data = np.array(blurred)

    # 只对边缘区域应用模糊（既不是完全透明也不是完全不透明的区域扩展）
    # 简化：直接用模糊后的 alpha，但保持完全不透明的内部区域
    mask_opaque = alpha == 255
    mask_transparent = alpha == 0

    # 在不透明区域保留原始 alpha，在透明区域保留 0，边缘使用模糊值
    result_alpha = np.where(mask_opaque, 255, np.where(mask_transparent, blurred_data, blurred_data))
    # 进一步：完全透明区域如果模糊后仍然很低就保持 0
    result_alpha = np.where(mask_transparent & (blurred_data < 10), 0, result_alpha)

    data[:, :, 3] = result_alpha.astype(np.uint8)
    from PIL import Image as PILImage2
    return PILImage2.fromarray(data)


def process_single(input_path, output_path, mode, tolerance, bg_color, feather, preview):
    """处理单张图片"""
    from PIL import Image

    input_path = Path(input_path)
    if not input_path.exists():
        print(f"❌ 文件不存在: {input_path}")
        return False

    print(f"🖼️  处理: {input_path.name}")

    img = Image.open(input_path).convert("RGBA")
    print(f"  📐 尺寸: {img.size[0]}x{img.size[1]}")

    if mode == "ai":
        result = remove_bg_ai(img)
        print("  ✨ AI 去背景完成")
    else:
        result = remove_bg_color(img, tolerance=tolerance, bg_color=bg_color)
        print(f"  ✨ 颜色去背景完成 (容差={tolerance})")

    if feather > 0:
        result = apply_feather(result, feather)
        print(f"  🌫️  边缘羽化: {feather}px")

    # 确保输出目录存在
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 保存为 PNG（支持透明度）
    if output_path.suffix.lower() not in [".png", ".webp"]:
        output_path = output_path.with_suffix(".png")

    result.save(str(output_path), "PNG")
    file_size = output_path.stat().st_size
    print(f"  💾 保存: {output_path} ({file_size / 1024:.1f} KB)")

    if preview:
        try:
            if sys.platform == "win32":
                os.startfile(str(output_path))
            elif sys.platform == "darwin":
                subprocess.run(["open", str(output_path)])
            else:
                subprocess.run(["xdg-open", str(output_path)])
        except Exception:
            pass

    return True


def generate_output_path(input_path, output_arg, is_batch):
    """生成输出路径"""
    input_path = Path(input_path)

    if output_arg:
        output = Path(output_arg)
        if is_batch or output.is_dir() or str(output_arg).endswith(("/", "\\")):
            # 输出到目录
            output.mkdir(parents=True, exist_ok=True)
            stem = input_path.stem
            if not stem.endswith("_transparent"):
                stem += "_transparent"
            return output / f"{stem}.png"
        else:
            return output
    else:
        # 默认：同目录，文件名加 _transparent 后缀
        stem = input_path.stem
        if stem.endswith("_transparent"):
            return input_path.parent / f"{stem}.png"
        return input_path.parent / f"{stem}_transparent.png"


def parse_color(color_str):
    """解析颜色字符串 #RRGGBB"""
    if not color_str:
        return None
    color_str = color_str.strip("#")
    if len(color_str) != 6:
        raise ValueError(f"Invalid color format: #{color_str}, expected #RRGGBB")
    r = int(color_str[0:2], 16)
    g = int(color_str[2:4], 16)
    b = int(color_str[4:6], 16)
    return (r, g, b)


def main():
    parser = argparse.ArgumentParser(
        description="图片去背景透明化工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s photo.png                         # AI 模式去背景
  %(prog)s photo.png --mode color            # 颜色模式去背景
  %(prog)s *.png -o transparent/             # 批量处理到指定目录
  %(prog)s icon.png --feather 2 --preview    # 羽化边缘 + 预览
        """,
    )

    parser.add_argument("input", nargs="+", help="输入图片路径（支持通配符）")
    parser.add_argument("-o", "--output", help="输出路径（文件或目录）")
    parser.add_argument(
        "--mode",
        choices=["ai", "color"],
        default="ai",
        help="去背景模式：ai（默认，AI 抠图）或 color（颜色替换）",
    )
    parser.add_argument(
        "--tolerance",
        type=int,
        default=30,
        help="颜色模式容差 0-255（默认 30，越大去除越多）",
    )
    parser.add_argument(
        "--bg-color",
        help="颜色模式指定背景色（格式 #RRGGBB，默认自动检测）",
    )
    parser.add_argument(
        "--feather",
        type=int,
        default=0,
        help="边缘羽化半径（默认 0，推荐 1-3）",
    )
    parser.add_argument(
        "--preview", action="store_true", help="处理后打开图片预览"
    )

    args = parser.parse_args()

    # 展开通配符
    input_files = []
    for pattern in args.input:
        expanded = glob.glob(pattern)
        if expanded:
            input_files.extend(expanded)
        else:
            input_files.append(pattern)

    if not input_files:
        print("❌ 未找到任何输入文件")
        sys.exit(1)

    is_batch = len(input_files) > 1
    print(f"🔧 模式: {'AI 抠图' if args.mode == 'ai' else '颜色替换'}")
    print(f"📁 共 {len(input_files)} 个文件待处理\n")

    # 确保依赖
    ensure_pillow()
    if args.mode == "ai":
        if not ensure_rembg():
            print("⚠️  回退到颜色模式")
            args.mode = "color"

    bg_color = parse_color(args.bg_color) if args.bg_color else None

    success = 0
    failed = 0

    for input_file in input_files:
        output_path = generate_output_path(input_file, args.output, is_batch)
        ok = process_single(
            input_file,
            output_path,
            mode=args.mode,
            tolerance=args.tolerance,
            bg_color=bg_color,
            feather=args.feather,
            preview=args.preview,
        )
        if ok:
            success += 1
        else:
            failed += 1
        print()

    print(f"{'=' * 40}")
    print(f"✅ 成功: {success}  ❌ 失败: {failed}  📊 总计: {len(input_files)}")


if __name__ == "__main__":
    main()
