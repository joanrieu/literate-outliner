#!/bin/bash -e

function build {
    ./build.awk README.md >bundle.ts
}

function watch {
    while true
    do
        build
        sleep 5s
    done
}

function usage {
    echo "USAGE: $0 OPTIONS"
    echo
    echo "OPTIONS:"
    egrep -- '--\w+\)' "$0" | tr -d ')'
}

case "$*" in
    --watch)
        watch;;
    --build)
        build;;
    --help)
        usage;;
    *)
        usage
        exit 1;;
esac
