import sys

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line indices (convert to 0-based)
style1_start = None  # <style>
style1_end = None    # first </style>
style2_start = None  # <style id="production-critical-css">
style2_end = None    # second </style>
script_start = None  # first <script src="src/state.js"
script_end = None    # last line with </script> inside it (self-closing)

for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == '<style>' and style1_start is None:
        style1_start = i
    elif stripped == '</style>' and style1_end is None:
        style1_end = i
    elif stripped == '<style id="production-critical-css">':
        style2_start = i
    elif stripped == '</style>' and style1_end is not None and style2_start is not None and style2_end is None:
        style2_end = i
    elif 'src/state.js' in stripped and script_start is None:
        script_start = i
    elif 'src/init.js' in stripped:
        script_end = i

print(f"style1: {style1_start}-{style1_end}")
print(f"style2: {style2_start}-{style2_end}")
print(f"script: {script_start}-{script_end}")

# Build output
out = []

# Before first style (include title line)
out.extend(lines[0:style1_start])

# Add CSS links
out.append('  <link rel="stylesheet" href="protocol-ui.css">\n')
out.append('  <link rel="stylesheet" href="src/style.css">\n')

# Between style2_end+1 and script_start-1
out.extend(lines[style2_end+1:script_start])

# Add scripts
out.append('  <script src="bundle.js"></script>\n')
out.append('  <script type="module" src="/src/main.js"></script>\n')

# After script end to EOF
out.extend(lines[script_end+1:])

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.writelines(out)

print(f"Done. Lines: {len(out)}")
