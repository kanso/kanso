#!/bin/sh

DIR=`dirname $0`
PACKAGES=`ls -d $DIR/../packages/*`

for p in $PACKAGES
do
    echo "Publishing $p"
    $DIR/../bin/kanso publish $p
done
