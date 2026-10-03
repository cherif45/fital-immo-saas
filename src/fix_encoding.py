# fix_encoding.py
import os
import re

# Mapping des séquences mojibake
FIXES = {
    # UTF-8 lu comme Latin-1 (double encodage)
    b'\xc3\xa9': b'\xc3\xa9',  # é déjà OK en UTF-8
    # Mojibake simple (UTF-8 → Latin-1)
    'Ã©': 'é',
    'Ã¨': 'è',
    'Ã ': 'à',
    'Ã¢': 'â',
    'Ãª': 'ê',
    'Ã®': 'î',
    'Ã¯': 'ï',
    'Ã´': 'ô',
    'Ã¹': 'ù',
    'Ã»': 'û',
    'Ã§': 'ç',
    'Ã‰': 'É',
    'Ã€': 'À',
    'Â°': '°',
    'Â«': '«',
    'Â»': '»',
    'â€"': '—',
    'â€™': "'",
    'â€œ': '"',
    'â€': '"',
    'â‚¬': '€',
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for old, new in FIXES.items():
            content = content.replace(old, new)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'✅ {filepath}')
            return 1
    except Exception as e:
        print(f'❌ {filepath}: {e}')
    return 0

# Parcourir src/
count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
            count += fix_file(os.path.join(root, file))

print(f'\n✅ {count} fichiers corrigés')