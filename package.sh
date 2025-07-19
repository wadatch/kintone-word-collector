#!/bin/bash

# Kintone plugin packaging script

PLUGIN_NAME="word-corrector"
PLUGIN_DIR="${PLUGIN_NAME}"
SOURCE_DIR="src"

# Create plugin directory with proper structure
echo "Creating plugin directory structure..."
rm -rf $PLUGIN_DIR
mkdir -p $PLUGIN_DIR/contents

# Copy source files to contents directory
cp -r $SOURCE_DIR/* $PLUGIN_DIR/contents/
cp manifest.json $PLUGIN_DIR/

# Sign the plugin
echo "Signing plugin..."
CONTENTS_ZIP="${PLUGIN_DIR}/contents.zip"
cd $PLUGIN_DIR/contents
zip -r ../contents.zip ./* > /dev/null
cd ../..

# Create signature
openssl dgst -sha1 -sign private.ppk -binary $CONTENTS_ZIP > ${PLUGIN_DIR}/sig

# Copy public key
cp public.pem ${PLUGIN_DIR}/

# Create final plugin package
echo "Creating plugin package..."
cd $PLUGIN_DIR
zip -r ../${PLUGIN_NAME}.zip ./* > /dev/null
cd ..

# Clean up
rm -rf $PLUGIN_DIR

echo "Plugin packaged successfully as ${PLUGIN_NAME}.zip"
echo ""
echo "Next steps:"
echo "1. Upload ${PLUGIN_NAME}.zip to your Kintone environment"
echo "2. Install the plugin in your Kintone app"
echo "3. Configure the plugin to select fields to check"