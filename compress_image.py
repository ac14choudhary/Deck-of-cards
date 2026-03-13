import base64
from PIL import Image
import os

input_path = 'assets/card_back.jpg'
output_path = 'assets/card_back_small.jpg'

img = Image.open(input_path)
# We need the embed.html to be under 40000 chars. The script + html is ~15k chars.
# That leaves ~25k chars for base64. 25k chars base64 = ~18KB image.
img.thumbnail((256, 384))
img.save(output_path, 'JPEG', quality=45)

with open(output_path, 'rb') as f:
    b64_str = base64.b64encode(f.read()).decode('utf-8')

print(f"Compressed Image size: {os.path.getsize(output_path)} bytes")
print(f"Base64 length: {len(b64_str)} characters")

with open('embed.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
new_uri = f"'data:image/jpeg;base64,{b64_str}'"
new_content = re.sub(r"'data:image/jpeg;base64,[^']+'", new_uri, content, count=1)

with open('embed.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"New embed.html size: {len(new_content)} characters")
