"""
画像グリッド色抽出ツール

このスクリプトは画像を指定されたグリッドに分割し、各セルの中心の色を抽出してCSVファイルに保存します。
白色（#ffffff）のセルは出力から除外されます。

使用方法:
    基本的な使用方法（デフォルト: 1000x1000グリッド）:
        python script.py map.png
    
    グリッド数を指定:
        python script.py map.png -x 500 -y 500
    
    出力ファイル名を指定:
        python script.py map.png -o my_colors.csv
    
    プロット表示をスキップ:
        python script.py map.png --no-plot
    
    全オプション指定例:
        python script.py map.png -x 2000 -y 1500 -o output.csv --no-plot

コマンドライン引数:
    image_path          入力画像ファイルのパス（必須）
    -x, --grid_x        X方向のグリッド数（デフォルト: 1000）
    -y, --grid_y        Y方向のグリッド数（デフォルト: 1000）
    -o, --output        出力CSVファイル名（デフォルト: grid_colors.csv）
    --no-plot          プロット表示をスキップ
    -h, --help         ヘルプメッセージを表示

出力CSV形式:
    X,Y,Colcode
    0,0,#ff0000
    0,1,#00ff00
    1,0,#0000ff
    ...

必要なライブラリ:
    pip install opencv-python pillow pandas matplotlib
"""

import cv2
import numpy as np
import pandas as pd
from PIL import Image
import matplotlib.pyplot as plt
import argparse
import sys
import os

def generate_unique_filename(base_filename, grid_x, grid_y):
    """
    ユニークなファイル名を生成
    
    Parameters:
    base_filename (str): ベースとなるファイル名
    grid_x (int): X方向のグリッド数
    grid_y (int): Y方向のグリッド数
    
    Returns:
    str: ユニークなファイル名
    """
    # ファイル名と拡張子を分離
    name, ext = os.path.splitext(base_filename)
    
    # グリッド情報を含むファイル名を生成
    grid_info = f"_x{grid_x}_y{grid_y}"
    filename = f"{name}{grid_info}{ext}"
    
    # ファイルが存在しない場合はそのまま返す
    if not os.path.exists(filename):
        return filename
    
    # ファイルが存在する場合は連番を追加
    counter = 1
    while True:
        filename = f"{name}{grid_info}-{counter}{ext}"
        if not os.path.exists(filename):
            return filename
        counter += 1

def generate_unique_plot_filename(base_name, grid_x, grid_y):
    """
    プロット用のユニークなPNGファイル名を生成
    
    Parameters:
    base_name (str): ベースとなるファイル名（拡張子なし）
    grid_x (int): X方向のグリッド数
    grid_y (int): Y方向のグリッド数
    
    Returns:
    str: ユニークなPNGファイル名
    """
    # グリッド情報を含むファイル名を生成
    grid_info = f"_x{grid_x}_y{grid_y}"
    filename = f"{base_name}_plot{grid_info}.png"
    
    # ファイルが存在しない場合はそのまま返す
    if not os.path.exists(filename):
        return filename
    
    # ファイルが存在する場合は連番を追加
    counter = 1
    while True:
        filename = f"{base_name}_plot{grid_info}-{counter}.png"
        if not os.path.exists(filename):
            return filename
        counter += 1

def extract_grid_colors(image_path, grid_x=1000, grid_y=1000, output_csv='grid_colors.csv'):
    """
    画像を指定されたグリッドサイズに分割し、各セルの中心の色を抽出してCSVに保存
    
    Parameters:
    image_path (str): 入力画像のパス
    grid_x (int): X方向のグリッド数
    grid_y (int): Y方向のグリッド数
    output_csv (str): 出力CSVファイル名
    """
    
    # ユニークなファイル名を生成
    unique_filename = generate_unique_filename(output_csv, grid_x, grid_y)
    
    # 画像を読み込み
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"画像ファイル '{image_path}' を読み込めませんでした")
    
    # BGRからRGBに変換
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 画像のサイズを取得
    height, width = image_rgb.shape[:2]
    print(f"元画像のサイズ: {width}x{height}")
    
    # グリッドのセルサイズを計算
    cell_width = width / grid_x
    cell_height = height / grid_y
    
    # 結果を保存するリスト
    results = []
    
    print(f"グリッド分割中... ({grid_x}x{grid_y})")
    
    for y in range(grid_y):
        if y % max(1, grid_y // 10) == 0:  # 進捗表示（10回に分けて表示）
            print(f"処理中: {y}/{grid_y} 行完了")
            
        for x in range(grid_x):
            # セルの中心座標を計算
            center_x = int((x + 0.5) * cell_width)
            center_y = int((y + 0.5) * cell_height)
            
            # 境界チェック
            center_x = min(center_x, width - 1)
            center_y = min(center_y, height - 1)
            
            # 中心ピクセルの色を取得
            pixel_color = image_rgb[center_y, center_x]
            r, g, b = pixel_color
            
            # 16進数カラーコードに変換
            color_code = f"#{r:02x}{g:02x}{b:02x}"
            
            # 白色（#ffffff）の場合はスキップ
            if color_code != "#ffffff":
                # 結果に追加
                results.append({
                    'X': x,
                    'Y': y,
                    'Colcode': color_code
                })
    
    # DataFrameに変換
    df = pd.DataFrame(results)
    
    # CSVに保存
    df.to_csv(unique_filename, index=False, encoding='utf-8')
    print(f"\n完了! {len(results)}個のセルの色情報を '{unique_filename}' に保存しました")
    print(f"（白色 #ffffff のセルは除外されました）")
    
    return df, unique_filename

def visualize_color_grid(df, image_path, grid_x, grid_y):
    """
    抽出した色データの可視化（全データ表示）とPNG保存
    
    Parameters:
    df (pd.DataFrame): 色データのDataFrame
    image_path (str): 元画像のパス（PNG保存時のファイル名生成に使用）
    grid_x (int): X方向のグリッド数
    grid_y (int): Y方向のグリッド数
    
    Returns:
    str: 保存されたPNGファイル名
    """
    
    # 色の分布を可視化
    fig, ax = plt.subplots(1, 1, figsize=(12, 12))
    
    # 全データをプロット
    colors = df['Colcode'].values
    x_coords = df['X'].values
    y_coords = df['Y'].values
    
    scatter = ax.scatter(x_coords, y_coords, c=colors, s=1, alpha=0.8)
    ax.set_title(f'色分布 (全{len(df):,}点)')
    ax.set_xlabel('X座標')
    ax.set_ylabel('Y座標')
    ax.invert_yaxis()  # Y軸を反転（画像座標系に合わせる）
    ax.set_aspect('equal')  # アスペクト比を1:1に
    
    plt.tight_layout()
    
    # PNG保存用のファイル名を生成
    base_name = os.path.splitext(os.path.basename(image_path))[0]
    png_filename = generate_unique_plot_filename(base_name, grid_x, grid_y)
    
    # PNG画像として保存
    plt.savefig(png_filename, dpi=300, bbox_inches='tight', format='png')
    print(f"プロット画像を '{png_filename}' に保存しました")
    
    # プロットを表示
    plt.show()
    
    # 統計情報を表示
    color_counts = df['Colcode'].value_counts()
    print(f"\n=== 統計情報 ===")
    print(f"総セル数: {len(df):,}")
    print(f"ユニークな色数: {df['Colcode'].nunique():,}")
    print(f"最も多い色: {color_counts.index[0]} ({color_counts.iloc[0]:,}回)")
    print(f"白色セルは除外されています")
    
    return png_filename

def main():
    # コマンドライン引数の設定
    parser = argparse.ArgumentParser(
        description='画像をグリッドに分割して色情報を抽出',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
使用例:
  %(prog)s map.png                           # デフォルト 1000x1000グリッド
  %(prog)s map.png -x 500 -y 500            # 500x500グリッド
  %(prog)s map.png -o my_colors.csv         # 出力ファイル名指定
  %(prog)s map.png --no-plot                # プロット表示なし
  %(prog)s map.png -x 2000 -y 1500 -o result.csv --no-plot  # 全オプション

出力:
  CSVファイル（X,Y,Colcode形式）
  白色（#ffffff）のセルは除外されます
  プロット表示時はPNG画像も保存されます
        ''')
    
    parser.add_argument('image_path', help='入力画像ファイルのパス (例: map.png)')
    parser.add_argument('-x', '--grid_x', type=int, default=1000, 
                       help='X方向のグリッド数 (デフォルト: 1000)')
    parser.add_argument('-y', '--grid_y', type=int, default=1000, 
                       help='Y方向のグリッド数 (デフォルト: 1000)')
    parser.add_argument('-o', '--output', default='grid_colors.csv',
                       help='出力CSVファイル名 (デフォルト: grid_colors.csv)')
    parser.add_argument('--no-plot', action='store_true',
                       help='プロット表示をスキップ')
    
    args = parser.parse_args()
    
    try:
        print("=" * 60)
        print("画像グリッド色抽出ツール")
        print("=" * 60)
        print(f"入力ファイル: {args.image_path}")
        print(f"グリッド設定: {args.grid_x} x {args.grid_y}")
        print(f"出力ファイル: {args.output}")
        print(f"プロット表示: {'なし' if args.no_plot else 'あり（PNG保存含む）'}")
        print("=" * 60)
        
        # 色抽出を実行
        df, actual_filename = extract_grid_colors(args.image_path, args.grid_x, args.grid_y, args.output)
        
        # プロット表示（--no-plotが指定されていない場合）
        png_filename = None
        if not args.no_plot:
            png_filename = visualize_color_grid(df, args.image_path, args.grid_x, args.grid_y)
        
        # 結果の一部を表示
        print("\n=== データサンプル ===")
        print(df.head(10))
        
        print(f"\n実際の出力ファイル: {actual_filename}")
        if png_filename:
            print(f"プロット画像ファイル: {png_filename}")
        print("処理完了!")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        print("\n必要なライブラリがインストールされているか確認してください:")
        print("pip install opencv-python pillow pandas matplotlib")
        print("\n使用方法については -h オプションでヘルプを確認してください")
        sys.exit(1)

# 使用例
if __name__ == "__main__":
    main()