#!/bin/bash

cat <<BLDCODE

Building
--------

BLDCODE
 make all || {    
    echo "Build failed"
    exit 1
}

cat <<PKG

Packaging
---------

PKG
# Build packages
docker run --rm -v "$PWD":/usr/src/${NAME} -w /usr/src/${NAME} euforia/fpm make .packages || {
    echo "Package build failed"
    exit 2
}