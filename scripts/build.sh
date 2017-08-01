#!/bin/bash

temp_path=.temp/

# Copy sources to temporary folder
mkdir -p ${temp_path}
cp -R src ${temp_path}
cp * ${temp_path}

# Install dependencies
cd ${temp_path}
npm install --production

# Package artifact
zip -r ../build/release.zip ./*

# Restore path
cd -

# Cleanup
rm -r ${temp_path}
