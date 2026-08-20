import subprocess
import sys

def install_and_run():
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        from PIL import Image, ImageDraw, ImageFont

    def create_icon(size):
        img = Image.new('RGB', (size, size), color='#E9E4D8')
        draw = ImageDraw.Draw(img)
        # We don't have a specific font, let's just use default or draw the letter 'a'
        try:
            # try to use a sans-serif font
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(size * 0.5))
        except:
            font = ImageFont.load_default()

        text = "a"
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        
        draw.text(((size-w)/2, (size-h)/2 - int(size*0.05)), text, font=font, fill='#F36A2D')
        
        # apply rounded corners
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        radius = int(size * 0.2)
        mask_draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
        
        final_img = Image.new('RGBA', (size, size), (0,0,0,0))
        final_img.paste(img, (0,0), mask)
        
        final_img.save(f"public/icon-{size}x{size}.png")

    create_icon(192)
    create_icon(512)

install_and_run()
