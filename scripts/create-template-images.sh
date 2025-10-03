#!/bin/bash

# Create placeholder template images for license plate configurator

cd "$(dirname "$0")/../public/templates"

echo "Creating placeholder template images..."

# UK Standard plate - 520x110 pixels (actual UK size scaled)
convert -size 520x110 \
  -background "#FFCC00" \
  -fill "#000000" \
  -gravity center \
  -pointsize 48 \
  -font "Arial-Bold" \
  label:"UK STANDARD" \
  uk-standard.png

echo "✓ Created uk-standard.png (520x110)"

# US Standard plate - 600x300 pixels
convert -size 600x300 \
  -background "#FFFFFF" \
  -fill "#0055A4" \
  -gravity center \
  -pointsize 36 \
  -font "Arial-Bold" \
  label:"USA STANDARD" \
  us-standard.png

echo "✓ Created us-standard.png (600x300)"

# US Motorcycle plate - 400x200 pixels (smaller)
convert -size 400x200 \
  -background "#FFFFFF" \
  -fill "#0055A4" \
  -gravity center \
  -pointsize 32 \
  -font "Arial-Bold" \
  label:"USA MOTORCYCLE" \
  us-motorcycle.png

echo "✓ Created us-motorcycle.png (400x200)"

echo ""
echo "All template placeholder images created successfully!"
echo ""
echo "Note: These are basic placeholder images."
echo "Replace them with actual license plate template images for production."
